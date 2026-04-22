import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'Palier — Gestion immobilière',
        short_name: 'Palier',
        description: 'Gestion immobilière pour régies suisses',
        theme_color: '#45553A',
        background_color: '#F4F4F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'fr-CH',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache the built assets for offline shell + faster repeat loads.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // Don't precache oversized chunks (vendor bundles).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Navigation requests always go to index.html so client-side routing works offline.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/functions\//],
        // Never cache Supabase API calls by default — live data should stay live.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
