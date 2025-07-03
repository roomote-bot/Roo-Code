import jwt from 'jsonwebtoken';
import { Env } from '@roo-code-cloud/env';
import {
  jobTokenPayloadSchema,
  type JobTokenPayload,
  type JobTokenContext,
} from './types';

export * from './types';

const ISSUER = 'rcc';

export async function createJobToken(
  jobId: string,
  userId: string,
  orgId: string | null,
  timeoutMs: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const gracePeriod = 5 * 60; // 5 minutes
  const clockSkewGrace = 30; // 30 seconds

  const payload: JobTokenPayload = {
    iss: ISSUER,
    sub: jobId,
    exp: now + Math.floor(timeoutMs / 1000) + gracePeriod,
    iat: now,
    nbf: now - clockSkewGrace,
    v: 1,
    r: {
      u: userId,
      o: orgId || undefined,
      t: 'cj',
    },
  };

  const privateKey = Buffer.from(Env.JOB_AUTH_PRIVATE_KEY, 'base64').toString(
    'utf-8',
  );
  return jwt.sign(payload, privateKey, { algorithm: 'ES256' });
}

export async function validateJobToken(
  token: string,
): Promise<JobTokenContext> {
  const publicKey = Buffer.from(Env.JOB_AUTH_PUBLIC_KEY, 'base64').toString(
    'utf-8',
  );
  const rawPayload = jwt.verify(token, publicKey, {
    algorithms: ['ES256'],
    clockTolerance: 60, // 60 seconds clock skew tolerance for tests
    ignoreNotBefore: Env.NODE_ENV === 'test', // Ignore nbf in tests due to fake timers
    issuer: ISSUER,
  });

  const parseResult = jobTokenPayloadSchema.safeParse(rawPayload);

  if (!parseResult.success) {
    const validationErrors = parseResult.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    throw new Error(`Invalid job token structure: ${validationErrors}`);
  }

  const payload = parseResult.data;

  return {
    jobId: payload.sub,
    userId: payload.r.u,
    orgId: payload.r.o,
    tokenType: payload.r.t,
    version: payload.v,
  };
}
