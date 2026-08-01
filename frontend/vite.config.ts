import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx')) {
            return 'export-libs';
          }
          if (id.includes('/components/pages/saqya/')) {
            return 'saqya';
          }
          if (id.includes('/components/pages/projects/')) {
            return 'projects';
          }
          if (id.includes('/components/pages/admin/')) {
            return 'admin';
          }
          if (id.includes('/components/pages/ExecutiveDashboard') || id.includes('/components/pages/ManageDashboard')) {
            return 'executive';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
