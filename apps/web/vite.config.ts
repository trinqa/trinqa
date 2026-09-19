import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@trinqa/tokens': path.resolve(__dirname, '../../packages/tokens/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
