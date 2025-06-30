// npx dotenvx run -f ../../.env.production -- tsx src/lib/checkStalledJobs.ts

import { Worker } from 'bullmq';

import { redis } from './redis';

async function checkStalledJobs() {
  const worker = new Worker('roomote', undefined, {
    autorun: false,
    connection: redis,
  });

  while (true) {
    console.log('startStalledCheckTimer()');
    await worker.startStalledCheckTimer();
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT');
  process.exit(0);
});

checkStalledJobs()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
