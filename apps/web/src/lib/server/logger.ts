import pino, { type DestinationStream } from 'pino';
import pretty from 'pino-pretty';
import logtail from '@logtail/pino';

import { Env } from './env';

const stream: DestinationStream = Env.LOGTAIL_SOURCE_TOKEN
  ? pino.multistream([
      await logtail({
        sourceToken: Env.LOGTAIL_SOURCE_TOKEN,
        options: { sendLogsToBetterStack: true },
      }),
      { stream: pretty() }, // Prints logs to the console.
    ])
  : pretty({ colorize: true });

export const logger = pino({ base: undefined }, stream);
