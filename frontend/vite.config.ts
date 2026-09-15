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
        // لا نقسم صفحات التطبيق يدوياً (projects/admin/saqya) — كانت تسبب
        // اعتماداً دائرياً وخطأ: Cannot access '…' before initialization
        // التقسيم يتم عبر React.lazy في App.tsx؛ هنا فقط مكتبات الطرف الثالث.
        manualChunks(id) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/xlsx')) {
            return 'export-libs';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
