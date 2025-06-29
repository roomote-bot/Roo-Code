import { Worker } from 'bullmq';

import { redis } from './redis';
import { processJob } from './job';

// docker compose build --build-arg GH_TOKEN=$(npx dotenvx get GH_TOKEN -f .env.development) roomote-worker
// docker run \
//   --name roomote-worker \
//   --rm --interactive --tty \
//   --network roo-code-cloud_default \
//   -e APP_ENV=production \
//   -e GH_TOKEN=$(npx dotenvx get GH_TOKEN -f .env.production) \
//   -e DOTENV_PRIVATE_KEY_PRODUCTION=$(npx dotenvx get DOTENV_PRIVATE_KEY_PRODUCTION -f .env.keys) \
//   -v /var/run/docker.sock:/var/run/docker.sock \
//   -v /tmp/roomote:/var/log/roomote \
//   roomote-worker sh -c "bash"

async function processNextJob() {
  const worker = new Worker('roomote', undefined, {
    autorun: false,
    connection: redis,
    lockDuration: 30 * 60 * 1_000, // 30 minutes
  });

  const token = crypto.randomUUID();

  try {
    const job = await worker.getNextJob(token);

    if (!job) {
      console.log('No jobs available, exiting...');
      await worker.close();
      process.exit(0);
    }

    console.log(`Processing job ${job.id}...`);

    try {
      await processJob(job);
      await job.moveToCompleted(undefined, token, false);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      await job.moveToFailed(error as Error, token, false);
      console.error(`Job ${job.id} failed:`, error);
    }
  } catch (error) {
    console.error('Error processing job:', error);
  } finally {
    await worker.close();
    process.exit(0);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM -> shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT -> shutting down gracefully...');
  process.exit(0);
});

if (!process.env.GH_TOKEN) {
  throw new Error('GH_TOKEN is not set');
}

processNextJob();
