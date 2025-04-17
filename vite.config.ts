import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr'; // Import the svgr plugin
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/DentalCare-Pro/', // Updated base path for new repo name
    plugins: [react(), svgr()], // Add svgr plugin here
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/functions/v1': {
          target: `${env.VITE_SUPABASE_URL}/functions/v1`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/functions\/v1/, '')
        },
      },
    },
  };
});
