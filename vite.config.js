import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/budgettracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Activate a newly-deployed service worker immediately instead of leaving it
        // "waiting" until every open tab of the old version closes — otherwise a
        // returning user can be stuck on stale cached content for a long time.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'BudgetTracker',
        short_name: 'BudgetTracker',
        description: 'A zero-based monthly budget tracker',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/budgettracker/',
        scope: '/budgettracker/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
