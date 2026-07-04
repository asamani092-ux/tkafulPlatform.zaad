import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // ربط كل الواجهات (IPv4/IPv6) ليعمل عبر localhost و127.0.0.1 والمعاينة الخارجية
    host: true,
    // السماح باستيراد ملفات نظام التصميم من جذر المستودع (../design-system/*.css)
    fs: {
      allow: ['..']
    },
    // توجيه طلبات الـ API إلى الخادم الخلفي على نفس الأصل (يعمل عبر localhost والمعاينة الخارجية)
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist'
  }
})
