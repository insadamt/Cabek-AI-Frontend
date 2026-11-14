/** Configure the frontend build and CABEK AI API proxy; depends on Vite and React. */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

  // Same-origin requests let local development work with an API that has no CORS allowlist.

  return {
    plugins: [
      react(),
      {
        name: 'local-settings-access',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            // Match the proxy prefix, including encoded separators, before proxying local hardware controls.

            if (
              (request.url ?? '').startsWith('/api/settings') &&
              !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')
            ) {
              response.statusCode = 403;
              response.end('Hardware settings are available on the tunnel PC only.');
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        ...(apiBaseUrl ? { '/api': { target: apiBaseUrl, changeOrigin: true } } : {}),
      },
    },
  };
});
