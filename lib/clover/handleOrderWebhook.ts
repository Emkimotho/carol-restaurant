// File: lib/clover/handleOrderWebhook.ts
// -----------------------------------------------------------------------------
// Clover → Webhook handler
//
// 1. Verify HMAC signature.
// 2. (Optional) refresh cached locationId when a multi-store merchant pings.
// 3. Map Clover order.state → local OrderStatus enum.
// 4. Upsert Clover employee → User, update Order, append OrderStatusHistory
//    with an *Eastern-Time* timestamp (Luxon helpers).
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { updateLocationId }          from "@/lib/clover/getLocationId";
import { ETfromMillis, toJS }        from "@/lib/time";

const prisma         = new PrismaClient();
const WEBHOOK_SECRET = process.env.CLOVER_WEBHOOK_SECRET;
const MERCHANT_ID    = process.env.CLOVER_MERCHANT_ID;

/**
 * Exported so other utilities (e.g. the /poll-orders cron) can share
 * exactly the same Clover→local status mapping.
 */
export const STATE_MAP: Record<string, OrderStatus | undefined> = {
  OPEN:        OrderStatus.ORDER_RECEIVED,
  IN_PROGRESS: OrderStatus.IN_PROGRESS,
  READY:       OrderStatus.ORDER_READY,
  COMPLETED:   OrderStatus.DELIVERED,
  VOIDED:      OrderStatus.CANCELLED,
};

export async function handleOrderWebhook(raw: Buffer, sig: string) {
  /* ── 1. verify HMAC ─────────────────────────────────────────────────── */
  if (!WEBHOOK_SECRET) throw new Error("CLOVER_WEBHOOK_SECRET not set");

  const expectedSig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(raw)
    .digest("hex");

  if (expectedSig !== sig) throw new Error("Invalid X-Clover-Signature");

  /* ── 2. parse payload, refresh location cache if needed ─────────────── */
  const payload = JSON.parse(raw.toString("utf8"));

  const locId = payload.order?.location?.id as string | undefined;
  if (locId) await updateLocationId(locId);

  /* Optional merchant-id guard (useful in multi-tenant scenarios) */
  if (MERCHANT_ID && payload.merchantId !== MERCHANT_ID) {
    throw new Error(
      `Webhook for merchant ${payload.merchantId} ≠ expected ${MERCHANT_ID}`,
    );
  }

  /* ── 3. extract essentials ──────────────────────────────────────────── */
  const externalRef = payload.order?.externalReferenceId as string | undefined;
  const cloverState = payload.order?.state                 as string | undefined;
  const actor       = payload.order?.employee as
    | { id: string; displayName: string }
    | undefined;

  if (!externalRef || !cloverState) {
    throw new Error("Webhook missing externalReferenceId or state");
  }

  const mappedStatus = STATE_MAP[cloverState];
  if (!mappedStatus) {
    console.log(`Webhook: unhandled state "${cloverState}", skipping`);
    return;
  }

  /* ── 4. locate local order ──────────────────────────────────────────── */
  const order = await prisma.order.findUnique({
    where:  { orderId: externalRef },
    select: { id: true, status: true },
  });

  if (!order) {
    console.warn(`Webhook: no local order with orderId ${externalRef}`);
    return;
  }
  if (order.status === mappedStatus) return; // nothing to change

  /* ── 5. upsert Clover employee → User (if employee info present) ─────── */
  let userId: number | undefined;
  if (actor?.id) {
    const u = await prisma.user.upsert({
      where:  { cloverEmployeeId: actor.id },
      update: { firstName: actor.displayName },
      create: {
        email:            `${actor.id}@clover.local`,
        password:         "",          // not used for login
        firstName:        actor.displayName,
        lastName:         "",
        cloverEmployeeId: actor.id,
      },
    });
    userId = u.id;
  }

  /* ── 6. Clover event time → Eastern-Time Date for Prisma ─────────────── */
  const eventET = payload.created
    ? ETfromMillis(Number(payload.created) * 1000)
    : ETfromMillis(Date.now());

  /* ── 7. transaction: update order + insert history row ───────────────── */
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data:  { status: mappedStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId:   order.id,
        status:    mappedStatus,
        changedBy: actor?.displayName ?? "Clover Webhook",
        timestamp: toJS(eventET),
        userId,   // may be undefined
      },
    }),
  ]);
}
