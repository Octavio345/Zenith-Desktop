import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
     manifest: {
  name: 'AgroVoo',
  short_name: 'AgroVoo',
  start_url: '/',
  display: 'standalone',
  theme_color: '#1B5E20',
  background_color: '#ffffff',
   icons: [
  {
    src: "/assets/icons/icon-droneP.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any"
  },
  {
   src: "/assets/icons/icon-droneG.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any"
  }
]
},
      // 🔥 Desativa cache durante desenvolvimento
      devOptions: {
        enabled: false
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true, // 🔥 Limpa a pasta antes de build
    sourcemap: false,
    // 🔥 Força rebuild completo
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // 🔥 Desativa cache do Vite
  server: {
    force: true
  }
})