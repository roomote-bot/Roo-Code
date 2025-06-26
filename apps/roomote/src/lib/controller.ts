import { spawn } from 'child_process';
import fs from 'fs';
import { Queue } from 'bullmq';

import { redis } from './redis';

export class WorkerController {
  private readonly POLL_INTERVAL_MS = 5000;
  private readonly MAX_WORKERS = 5;

  private queue: Queue;
  public isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private activeWorkers = new Set<string>();

  constructor() {
    this.queue = new Queue('roomote', { connection: redis });
  }

  async start() {
    if (this.isRunning) {
      console.log('Controller is already running');
      return;
    }

    this.isRunning = true;
    console.log('Worker controller started');

    await this.checkAndSpawnWorker();

    this.pollingInterval = setInterval(async () => {
      await this.checkAndSpawnWorker();
    }, this.POLL_INTERVAL_MS);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping worker controller...');

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    await this.queue.close();
    console.log('Worker controller stopped');
  }

  private async checkAndSpawnWorker() {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();

      const waitingCount = waiting.length;
      const activeCount = active.length;

      console.log(
        `Queue status: ${waitingCount} waiting, ${activeCount} active, ${this.activeWorkers.size} spawned workers`,
      );

      if (waitingCount > 0 && this.activeWorkers.size < this.MAX_WORKERS) {
        await this.spawnWorker();
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  }

  private async spawnWorker() {
    const workerId = `worker-${Date.now()}`;

    try {
      console.log(`Spawning worker: ${workerId}`);
      const isRunningInDocker = fs.existsSync('/.dockerenv');

      const dockerArgs = [
        `--name roomote-${workerId}`,
        '--rm',
        '--network roo-code-cloud_default',
        `-e GH_TOKEN=${process.env.GH_TOKEN}`,
        '-v /var/run/docker.sock:/var/run/docker.sock',
        '-v /tmp/roomote:/var/log/roomote',
      ];

      const cliCommand = 'pnpm worker';

      const command = isRunningInDocker
        ? `docker run ${dockerArgs.join(' ')} roomote-worker sh -c "${cliCommand}"`
        : cliCommand;

      console.log('Spawning worker with command:', command);

      const childProcess = spawn('sh', ['-c', command], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          console.log(data.toString());
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          console.error(data.toString());
        });
      }

      this.activeWorkers.add(workerId);

      childProcess.on('exit', (code) => {
        console.log(`Worker ${workerId} exited with code ${code}`);
        this.activeWorkers.delete(workerId);
      });

      childProcess.on('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        this.activeWorkers.delete(workerId);
      });

      // Detach the process so it can run independently.
      childProcess.unref();
    } catch (error) {
      console.error(`Failed to spawn worker ${workerId}:`, error);
      this.activeWorkers.delete(workerId);
    }
  }
}

// Only run if this file is executed directly (not imported).
if (import.meta.url === `file://${process.argv[1]}`) {
  const controller = new WorkerController();

  process.on('SIGTERM', async () => {
    console.log('SIGTERM -> shutting down controller gracefully...');
    await controller.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT -> shutting down controller gracefully...');
    await controller.stop();
    process.exit(0);
  });

  controller.start().catch((error) => {
    console.error('Failed to start controller:', error);
    process.exit(1);
  });
}
