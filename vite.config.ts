import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Workout',
        short_name: 'Workout',
        description: 'Personal fitness tracker with AI coaching',
        theme_color: '#6366f1',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/auth\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'auth-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /\/functions\/v1\/claude-proxy/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sync-cache',
              expiration: { maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
});
