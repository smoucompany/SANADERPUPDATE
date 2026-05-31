import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'نظام الإدارة المتكامل',
        short_name: 'ERP System',
        description: 'نظام محاسبي ومبيعات متكامل',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // فقط الملفات الأساسية — لا نحمّل 136 ملف JS عند أول زيارة
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}'],
        // لا تشمل ملفات JS في precache
        globIgnores: ['**/assets/*.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          // كاش ذكي لملفات JS — NetworkFirst حتى لا يبقى الكود القديم
          {
            urlPattern: /\/assets\/.*\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // تحذيرات chunk للمراقبة
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // تقسيم ذكي للـ chunks — كل مكتبة ثقيلة في ملفها الخاص
        manualChunks(id) {
          // مكتبات التصدير — تُحمَّل فقط عند الحاجة (dynamic import)
          if (id.includes('xlsx'))        return 'xlsx'
          if (id.includes('jspdf'))       return 'jspdf'
          if (id.includes('html2canvas')) return 'html2canvas'

          // مكتبات UI ثقيلة منفصلة
          if (id.includes('framer-motion')) return 'framer-motion'
          if (id.includes('recharts'))      return 'recharts'

          // core vendor
          if (id.includes('react-dom'))       return 'react-dom'
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'react-router'
          if (id.includes('@supabase'))       return 'supabase'
          if (id.includes('@tanstack/react-query')) return 'react-query'
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms'
          if (id.includes('lucide-react'))    return 'icons'
          if (id.includes('date-fns'))        return 'date-fns'
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
