import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    // Sözleşme testi ../api-contract/openapi.yaml dosyasını okur.
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:3000',
      '/docs': 'http://localhost:3000',
    },
  },
  test: {
    // Testler Türkiye saatinde çalışır: tarih kayması hataları UTC+3'te ortaya çıkar.
    env: { TZ: 'Europe/Istanbul' },
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    css: false,
  },
});
