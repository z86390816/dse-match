import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 前端 /api/* 轉發到後端，避免 CORS 並做到前後台分離
      '/api': 'http://localhost:4000',
    },
  },
});
