import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { createBullBoard } from '@bull-board/api';
import express from 'express';
import type { Express, Request, Response } from 'express';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set');
}

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const queue = new Queue('roomote', { connection: redis });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app: Express = express();
app.use('/admin/queues', serverAdapter.getRouter());
app.use('/', (req: Request, res: Response) => res.redirect('/admin/queues'));

const port = 3002;

app.listen(port, () =>
  console.log(`Bull Board running on: http://localhost:${port}/admin/queues`),
);
