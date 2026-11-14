/** Configure the frontend build and CABEK AI API proxy; depends on Vite and React. */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

  // Same-origin requests let local development work with an API that has no CORS allowlist.

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        ...(apiBaseUrl ? { '/api': { target: apiBaseUrl, changeOrigin: true } } : {}),
      },
    },
  };
});
