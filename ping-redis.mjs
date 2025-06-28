import Redis from 'ioredis';
const r = new Redis(process.env.ORDER_PUSH_QUEUE_URL, { maxRetriesPerRequest: null });
r.ping().then(console.log).catch(console.error).finally(() => r.disconnect());
