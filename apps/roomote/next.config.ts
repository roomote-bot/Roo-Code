import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ioredis', 'bullmq'],
};

export default nextConfig;
