import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflare()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // FIX 7: Split vendor chunks so browser caches them separately
      rollupOptions: {
        output: {
          manualChunks: {
            // Firebase in its own chunk — large library
            'firebase-core': ['firebase/app', 'firebase/auth'],
            'firebase-firestore': ['firebase/firestore'],
            // React core
            'react-vendor': ['react', 'react-dom'],
            // Icons — loaded lazily
            'lucide': ['lucide-react'],
          },
        },
      },
      // FIX 8: Compress aggressively
      minify: 'esbuild',
      target: 'es2020',
      // Warn if a chunk is still large
      chunkSizeWarningLimit: 300,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
