import * as path from 'path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

import pWaitFor from 'p-wait-for';
import { execa } from 'execa';

import {
  type RooCodeSettings,
  type ClineMessage,
  TaskCommandName,
  RooCodeEventName,
  IpcMessageType,
  EVALS_SETTINGS,
} from '@roo-code/types';
import { IpcClient } from '@roo-code-cloud/ipc';

import type { JobPayload, JobType } from '@roo-code-cloud/db';

import { Logger } from './logger';
import { isFlyMachine, isDockerContainer } from './utils';
import { SlackNotifier } from './slack';

const TIMEOUT = 30 * 60 * 1_000;

class SubprocessTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Subprocess timeout after ${timeout}ms`);
    this.name = 'SubprocessTimeoutError';
  }
}

export type RunTaskCallbacks = {
  onTaskStarted?: (
    slackThreadTs: string | null | undefined,
    rooTaskId: string,
  ) => Promise<void>;
  onTaskMessage?: (message: ClineMessage) => Promise<void>;
  onTaskAborted?: (slackThreadTs: string | null | undefined) => Promise<void>;
  onTaskCompleted?: (
    slackThreadTs: string | null | undefined,
    success: boolean,
    duration: number,
    rooTaskId?: string,
  ) => Promise<void>;
  onTaskTimedOut?: (slackThreadTs: string | null) => Promise<void>;
  onClientDisconnected?: (slackThreadTs: string | null) => Promise<void>;
};

type RunTaskOptions<T extends JobType> = {
  jobType: T;
  jobPayload: JobPayload<T>;
  prompt: string;
  logger?: Logger;
  callbacks?: RunTaskCallbacks;
  notify?: boolean;
  workspacePath?: string;
  settings?: RooCodeSettings;
};

export const runTask = async <T extends JobType>({
  jobType,
  jobPayload,
  prompt,
  logger,
  callbacks,
  notify = true,
  workspacePath = '/roo/repos/Roo-Code',
  settings = {},
}: RunTaskOptions<T>) => {
  const ipcSocketPath = path.resolve(
    os.tmpdir(),
    `${crypto.randomUUID().slice(0, 8)}.sock`,
  );

  const controller = new AbortController();
  const cancelSignal = controller.signal;
  const containerized = isFlyMachine() || isDockerContainer();

  const codeCommand = containerized
    ? `ROO_CODE_IPC_SOCKET_PATH=${ipcSocketPath} xvfb-run --auto-servernum --server-num=1 code --wait --log trace --disable-workspace-trust --disable-gpu --disable-lcd-text --no-sandbox --user-data-dir /roo/.vscode --password-store="basic" -n ${workspacePath}`
    : `ROO_CODE_IPC_SOCKET_PATH=${ipcSocketPath} code --disable-workspace-trust -n ${workspacePath}`;

  if (!logger) {
    logger = new Logger({
      logDir: path.resolve(os.tmpdir(), 'logs'),
      filename: 'worker.log',
      tag: 'worker',
    });
  }

  logger.info(codeCommand);

  const subprocess = execa({
    shell: '/bin/bash',
    cwd: workspacePath,
    cancelSignal,
  })`${codeCommand}`;

  // If debugging, add `--verbose` to `command` and uncomment the following line.
  // subprocess.stdout.pipe(process.stdout)

  try {
    await pWaitFor(() => fs.existsSync(ipcSocketPath), {
      interval: 250,
      timeout: 10_000,
    });
  } catch (_error) {
    logger.error(`IPC socket was not created within timeout: ${ipcSocketPath}`);
    throw new Error(
      `IPC socket was not created within timeout -> ${ipcSocketPath}`,
    );
  }

  let client: IpcClient | undefined = undefined;
  let attempts = 5;

  while (true) {
    try {
      client = new IpcClient(ipcSocketPath);
      await pWaitFor(() => client!.isReady, { interval: 250, timeout: 1_000 });
      break;
    } catch (_error) {
      client?.disconnect();
      attempts--;

      if (attempts <= 0) {
        logger.error(`unable to connect to IPC socket -> ${ipcSocketPath}`);
        throw new Error('Unable to connect.');
      }
    }
  }

  let taskStartedAt = Date.now();
  let taskFinishedAt: number | undefined;
  let taskAbortedAt: number | undefined;
  let taskTimedOut: boolean = false;
  let rooTaskId: string | undefined;
  let isClientDisconnected = false;

  const slackNotifier = notify ? new SlackNotifier(logger) : undefined;
  let slackThreadTs: string | null | undefined = null;

  // const ignoreEvents: Record<'broadcast' | 'log', RooCodeEventName[]> = {
  //   broadcast: [RooCodeEventName.Message],
  //   log: [
  //     RooCodeEventName.TaskTokenUsageUpdated,
  //     RooCodeEventName.TaskAskResponded,
  //   ],
  // };

  client.on(IpcMessageType.TaskEvent, async (taskEvent) => {
    const { eventName, payload } = taskEvent;

    // Log all events except for these.
    // For message events we only log non-partial messages.
    // if (
    //   !ignoreEvents.log.includes(eventName) &&
    //   (eventName !== RooCodeEventName.Message ||
    //     payload[0].message.partial !== true)
    // ) {
    //   logger.info(`${eventName} ->`, payload);
    // }

    logger.info(`${eventName} ->`, payload);

    if (
      eventName === RooCodeEventName.Message &&
      payload[0].message.partial !== true &&
      callbacks?.onTaskMessage
    ) {
      await callbacks.onTaskMessage(payload[0].message);
    }

    if (eventName === RooCodeEventName.TaskStarted) {
      taskStartedAt = Date.now();
      rooTaskId = payload[0];

      if (rooTaskId) {
        slackThreadTs = await slackNotifier?.postTaskStarted({
          jobType,
          jobPayload,
          rooTaskId,
        });

        if (callbacks?.onTaskStarted) {
          await callbacks.onTaskStarted(slackThreadTs, rooTaskId);
        }
      }
    }

    if (eventName === RooCodeEventName.TaskAborted) {
      taskAbortedAt = Date.now();

      if (slackThreadTs) {
        await slackNotifier?.postTaskUpdated(
          slackThreadTs,
          'Task was aborted',
          'warning',
        );
      }

      if (callbacks?.onTaskAborted) {
        await callbacks.onTaskAborted(slackThreadTs);
      }
    }

    if (eventName === RooCodeEventName.TaskCompleted) {
      taskFinishedAt = Date.now();

      if (slackThreadTs) {
        await slackNotifier?.postTaskCompleted(
          slackThreadTs,
          true,
          taskFinishedAt - taskStartedAt,
          rooTaskId,
        );
      }

      if (callbacks?.onTaskCompleted) {
        await callbacks.onTaskCompleted(
          slackThreadTs,
          true,
          taskFinishedAt - taskStartedAt,
          rooTaskId,
        );
      }
    }
  });

  client.on(IpcMessageType.Disconnect, async () => {
    logger.info(`disconnected from IPC socket -> ${ipcSocketPath}`);
    isClientDisconnected = true;
  });

  client.sendCommand({
    commandName: TaskCommandName.StartNewTask,
    data: {
      configuration: {
        ...EVALS_SETTINGS,
        alwaysAllowReadOnlyOutsideWorkspace: true,
        alwaysAllowWriteOutsideWorkspace: true,
        alwaysAllowWriteProtected: true,
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        lastShownAnnouncementId: 'jun-17-2025-3-21',
        ...settings,
      },
      text: prompt,
    },
  });

  try {
    await pWaitFor(
      () => !!taskFinishedAt || !!taskAbortedAt || isClientDisconnected,
      {
        interval: 1_000,
        timeout: TIMEOUT,
      },
    );
  } catch (_error) {
    taskTimedOut = true;
    logger.error('time limit reached');

    if (slackThreadTs) {
      await slackNotifier?.postTaskUpdated(
        slackThreadTs,
        'Task timed out after 30 minutes',
        'error',
      );
    }

    if (callbacks?.onTaskTimedOut) {
      await callbacks.onTaskTimedOut(slackThreadTs);
    }

    if (rooTaskId && !isClientDisconnected) {
      logger.info('cancelling task');

      client.sendCommand({
        commandName: TaskCommandName.CancelTask,
        data: rooTaskId,
      });

      // Allow some time for the task to cancel.
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }

    taskFinishedAt = Date.now();
  }

  if (!taskFinishedAt && !taskTimedOut) {
    logger.error('client disconnected before task finished');

    if (slackThreadTs) {
      await slackNotifier?.postTaskUpdated(
        slackThreadTs,
        'Client disconnected before task completion',
        'error',
      );
    }

    if (callbacks?.onClientDisconnected) {
      await callbacks.onClientDisconnected(slackThreadTs);
    }

    throw new Error('Client disconnected before task completion.');
  }

  if (rooTaskId && !isClientDisconnected) {
    logger.info('closing task');

    client.sendCommand({
      commandName: TaskCommandName.CloseTask,
      data: rooTaskId,
    });

    // Allow some time for the window to close.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  if (!isClientDisconnected) {
    logger.info('disconnecting client');
    client.disconnect();
  }

  logger.info('waiting for subprocess to finish');
  controller.abort();

  // Wait for subprocess to finish gracefully, with a timeout.
  const SUBPROCESS_TIMEOUT = 10_000;

  try {
    await Promise.race([
      subprocess,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new SubprocessTimeoutError(SUBPROCESS_TIMEOUT)),
          SUBPROCESS_TIMEOUT,
        ),
      ),
    ]);

    logger.info('subprocess finished gracefully');
  } catch (error) {
    if (error instanceof SubprocessTimeoutError) {
      logger.error('subprocess did not finish within timeout, force killing');

      try {
        if (subprocess.kill('SIGKILL')) {
          logger.info('SIGKILL sent to subprocess');
        } else {
          logger.error('failed to send SIGKILL to subprocess');
        }
      } catch (killError) {
        logger.error('subprocess.kill(SIGKILL) failed:', killError);
      }
    } else {
      throw error;
    }
  }

  logger.close();
};
