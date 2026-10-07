import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // برای mock کردن window/localStorage اگر لازم شد
    globals: true,        // استفاده مستقیم describe/it/expect بدون import
    include: ['__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
});