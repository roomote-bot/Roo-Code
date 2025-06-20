import { resolve } from 'path';

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    watch: false,
    reporters: ['dot'],
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: [
            'src/**/*.test.{js,jsx,ts,tsx}',
            '!src/{hooks,components}/**/*.test.{js,jsx,ts,tsx}',
          ],
          environment: 'node',
          globalSetup: './vitest.setup.server.ts',
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          include: ['src/{hooks,components}/**/*.test.{js,jsx,ts,tsx}'],
          environment: 'jsdom',
          setupFiles: './vitest.setup.client.ts',
        },
      },
    ],
  },
});
