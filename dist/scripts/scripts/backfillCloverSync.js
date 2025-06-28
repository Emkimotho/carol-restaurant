"use strict";
/**
 * scripts/backfillCloverSync.ts
 *
 * Backfill historical orders that have no cloverOrderId:
 *  - Query delivered CASH orders (or all delivered) with cloverOrderId = null.
 *  - Optionally skip orders older than a given cutoff.
 *  - For each, call pushOrderToClover(localOrderId) to create in Clover and store returned internal ID.
 *  - If a CashCollection exists, optionally call ensureCashTender to attach cash tender now.
 *  - Log details; summary at end.
 *
 * Run with ts-node (ESM) or compile to JS first.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Adjust these imports to match your project structure. 
// If using Next.js aliases (@/lib/...), you may need to use relative paths here, 
// e.g. import { pushOrderToClover } from '../lib/clover/pushOrderToClover';
const pushOrderToClover_1 = require("../lib/clover/pushOrderToClover");
const orderService_1 = require("../lib/clover/orderService");
const prisma = new client_1.PrismaClient();
// Configuration:
const DRY_RUN = false; // if true, do not actually write to DB or call Clover; just log what would happen
const DAYS_THRESHOLD = 60; // only backfill orders delivered within last N days; set to null or 0 to disable date filtering
// You can override via env or CLI args if desired.
async function main() {
    console.log('Starting backfillCloverSync...');
    // Build date cutoff if desired:
    let deliveredAfter;
    if (DAYS_THRESHOLD && DAYS_THRESHOLD > 0) {
        deliveredAfter = new Date();
        deliveredAfter.setDate(deliveredAfter.getDate() - DAYS_THRESHOLD);
        console.log(`→ Only processing orders delivered on or after ${deliveredAfter.toISOString()}`);
    }
    else {
        console.log('→ No date cutoff; processing all delivered orders missing cloverOrderId');
    }
    // 1) Query orders needing backfill
    const whereClause = {
        cloverOrderId: null,
        status: client_1.OrderStatus.DELIVERED,
    };
    if (deliveredAfter) {
        whereClause.deliveredAt = { gte: deliveredAfter };
    }
    // Optionally constrain to paymentMethod CASH if you only care about cash reconciliation:
    // whereClause.paymentMethod = 'CASH';
    // Include cashCollection if present
    console.log('→ Querying orders...');
    const orders = await prisma.order.findMany({
        where: whereClause,
        select: {
            id: true,
            orderId: true,
            createdAt: true,
            deliveredAt: true,
            paymentMethod: true,
            // any other fields you need
            // Also check if cashCollection exists:
            cashCollection: {
                select: {
                    id: true,
                    amount: true,
                    status: true,
                },
            },
            // lineItems might be needed by pushOrderToClover internally; pushOrderToClover should load full order details itself.
        },
        orderBy: { deliveredAt: 'asc' },
    });
    console.log(`→ Found ${orders.length} orders to backfill.`);
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const failures = [];
    for (const o of orders) {
        const { id, orderId, cashCollection } = o;
        try {
            console.log(`\nProcessing order ${orderId} (DB id=${id})...`);
            if (DRY_RUN) {
                console.log(`  [DRY RUN] Would call pushOrderToClover(${id})`);
            }
            else {
                // 2) Push to Clover
                console.log(`  Calling pushOrderToClover for local order id=${id}...`);
                const cloverInternalId = await (0, pushOrderToClover_1.pushOrderToClover)(id);
                if (!cloverInternalId) {
                    throw new Error('pushOrderToClover returned no ID');
                }
                console.log(`  Received cloverOrderId=${cloverInternalId}.`);
                // 3) Persist to DB
                console.log('  Updating order.cloverOrderId in DB...');
                await prisma.order.update({
                    where: { id },
                    data: { cloverOrderId: cloverInternalId, cloverLastSyncAt: new Date() },
                });
                console.log('  Persisted cloverOrderId.');
            }
            // 4) If there is a CashCollection pending, attach cash tender now
            if (cashCollection) {
                const { id: ccId, amount, status } = cashCollection;
                if (status === client_1.CashCollectionStatus.PENDING) {
                    if (DRY_RUN) {
                        console.log(`  [DRY RUN] Would call ensureCashTender with newly set cloverOrderId and amount=${amount}`);
                    }
                    else {
                        // load cloverOrderId from DB (just set above)
                        const fresh = await prisma.order.findUnique({
                            where: { id },
                            select: { cloverOrderId: true },
                        });
                        if (!fresh?.cloverOrderId) {
                            console.warn('  Unexpected: cloverOrderId missing after push; skipping cash tender.');
                        }
                        else {
                            console.log(`  Ensuring CASH tender of $${amount.toFixed(2)} in Clover for order ${fresh.cloverOrderId}...`);
                            await (0, orderService_1.ensureCashTender)(fresh.cloverOrderId, amount);
                            console.log('  CASH tender attached or already existed.');
                            // Mark CashCollection as settled locally
                            console.log('  Marking CashCollection SETTLED locally...');
                            await prisma.cashCollection.update({
                                where: { id: ccId },
                                data: {
                                    status: client_1.CashCollectionStatus.SETTLED,
                                    settledAt: new Date(),
                                    // Optionally: you might not know who the cashier was; skip settledById or set a fallback.
                                },
                            });
                            console.log('  CashCollection marked SETTLED.');
                        }
                    }
                }
                else {
                    console.log('  CashCollection exists but status is not PENDING; skipping tender.');
                }
            }
            else {
                console.log('  No CashCollection record for this order; skipping cash tender.');
            }
            successCount++;
        }
        catch (err) {
            failCount++;
            const reason = err?.message || String(err);
            console.error(`  ❌ Failed for order ${orderId}: ${reason}`);
            failures.push({ orderId, reason });
        }
    }
    console.log('\nBackfill summary:');
    console.log(`  Total to process: ${orders.length}`);
    console.log(`  Succeeded: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log(`  Skipped (dry-run or already settled): ${skipCount}`);
    if (failures.length) {
        console.log('  Failures detail:');
        failures.forEach(f => console.log(`    - ${f.orderId}: ${f.reason}`));
    }
    await prisma.$disconnect();
    console.log('Done.');
}
main().catch(err => {
    console.error('Fatal error in backfillCloverSync:', err);
    prisma.$disconnect().finally(() => process.exit(1));
});
