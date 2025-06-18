import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    reporters: ['dot'],
    silent: true,
    coverage: {
      include: ['src/**/*'],
      exclude: ['src/**/*.stories.{js,jsx,ts,tsx}', '**/*.d.ts'],
    },
  },
});
