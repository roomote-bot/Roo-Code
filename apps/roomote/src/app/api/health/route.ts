import { NextResponse } from 'next/server';

import { db } from '@roo-code-cloud/db/server';
import { Env } from '@roo-code-cloud/env';

import { redis } from '@/lib';

export async function GET() {
  try {
    const services = { database: false, redis: false };
    const hosts = { database: 'unknown', redis: 'unknown' };

    try {
      const databaseUrl = new URL(Env.DATABASE_URL);
      hosts.database = databaseUrl.hostname;
    } catch (error) {
      console.error('Failed to parse DATABASE_URL:', error);
    }

    try {
      const redisUrl = new URL(
        process.env.REDIS_URL || 'redis://localhost:6379',
      );

      hosts.redis = redisUrl.hostname;
    } catch (error) {
      console.error('Failed to parse REDIS_URL:', error);
    }

    try {
      await db.execute('SELECT 1');
      services.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      await redis.ping();
      services.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    const isHealthy = Object.values(services).every(Boolean);

    return NextResponse.json(
      { status: isHealthy ? 'ok' : 'error', services, hosts },
      { status: isHealthy ? 200 : 500 },
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Internal server error' },
      { status: 500 },
    );
  }
}
