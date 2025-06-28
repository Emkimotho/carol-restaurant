// File: lib/clover/queues/orderPushQueue.ts
// ------------------------------------------------------------------
// Purpose: BullMQ queue + worker that push (or void) orders on Clover.
// Queue payload now uses the DB UUID (`id`) so the worker can always
// look-up the row, even if the human-readable orderId isn’t unique.
// ------------------------------------------------------------------

import 'dotenv/config';

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { pushOrderToClover } from '@/lib/clover/pushOrderToClover';

/** Data carried by each job */
interface OrderPushJobData {
  /** ← primary key in Postgres - always unique */
  id: string;

  /** optional human-code e.g. ORD-20250620-F3D8UI (handy for logs) */
  orderId?: string;

  /** override feature-flag */
  force?: boolean;
}

/* ───────────────────  Redis connection  ────────────────────────── */

const connection = new IORedis(process.env.ORDER_PUSH_QUEUE_URL as string, {
  maxRetriesPerRequest: null,            // BullMQ requirement
  tls: { rejectUnauthorized: false },    // Upstash / rediss://
});

/* ───────────────────  Queue (used by API routes)  ──────────────── */

export const orderPushQueue = new Queue<OrderPushJobData>('order-push', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

/* ───────────────────  Worker (runs by default)  ────────────────── */

if (process.env.START_QUEUE_WORKER !== 'false') {
  new Worker<OrderPushJobData>(
    'order-push',
    async (job: Job<OrderPushJobData>) => {
      const { id, orderId, force } = job.data;

      /* Feature-flag — allow manual override with `force` */
      if (process.env.ENABLE_CLOVER_SYNC !== 'true' && !force) {
        console.log(
          `[@order-push] Skipping job ${job.id} (${orderId ?? id}) —` +
            ' ENABLE_CLOVER_SYNC=false',
        );
        return;
      }

      switch (job.name) {
        case 'push':
          await pushOrderToClover(id);
          break;

        case 'void':
          // TODO: implement void logic
          break;

        default:
          throw new Error(`Unknown job name "${job.name}"`);
      }
    },
    { connection },
  ).on('failed', (job: Job<OrderPushJobData> | undefined, err: Error) => {
    const ref = job ? `${job.id} (${job.data.orderId ?? job.data.id})` : 'unknown';
    console.error(`[@order-push] Job ${ref} failed:`, err);
  });
}
