import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  // Server-side tests (node environment).
  {
    plugins: [react(), tsconfigPaths()],
    test: {
      name: 'server',
      globals: true,
      include: [
        'src/**/*.test.{js,jsx,ts,tsx}',
        '!src/hooks/**/*.test.{js,jsx,ts,tsx}', // Exclude hooks tests.
        '!src/components/**/*.test.{js,jsx,ts,tsx}', // Exclude component tests.
      ],
      environment: 'node',
      setupFiles: './vitest-setup.ts',
      globalSetup: './vitest-global-setup.ts',
    },
  },
  // Client-side tests (jsdom environment).
  {
    plugins: [react(), tsconfigPaths()],
    test: {
      name: 'client',
      globals: true,
      include: [
        'src/hooks/**/*.test.{js,jsx,ts,tsx}',
        'src/components/**/*.test.{js,jsx,ts,tsx}',
      ],
      environment: 'jsdom',
      setupFiles: './vitest-setup.ts',
      // No globalSetup for client tests to avoid database connection issues.
    },
  },
]);
