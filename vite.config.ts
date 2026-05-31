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
        // فقط CSS + HTML في precache — JS يُحمَّل بذكاء
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/assets/*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/pages-.*\.js$/,
            handler: 'CacheFirst',  // صفحات المجموعات — كاش طويل
            options: {
              cacheName: 'pages-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          {
            urlPattern: /\/assets\/(?!pages-).*\.js$/,
            handler: 'CacheFirst',  // مكتبات — كاش دائم
            options: {
              cacheName: 'vendor-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },

  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ══ مكتبات خارجية ثقيلة — lazy load عند الحاجة ══
          if (id.includes('xlsx'))        return 'lib-xlsx'
          if (id.includes('jspdf'))       return 'lib-jspdf'
          if (id.includes('html2canvas')) return 'lib-html2canvas'
          if (id.includes('recharts'))    return 'lib-recharts'

          // ══ مكتبات core — تُحمَّل مع الباندل الأول ══
          if (id.includes('framer-motion'))                      return 'vendor-motion'
          if (id.includes('react-dom'))                          return 'vendor-react'
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor-router'
          if (id.includes('@supabase'))                          return 'vendor-supabase'
          if (id.includes('@tanstack/react-query'))              return 'vendor-query'
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms'
          if (id.includes('lucide-react'))                       return 'vendor-icons'
          if (id.includes('date-fns'))                           return 'vendor-dates'

          // ══ صفحات مُجمَّعة — تحميل كل مجموعة معاً ══
          // عند فتح أي صفحة مبيعات → تُحمَّل كل صفحات المبيعات دفعة واحدة
          if (id.includes('src/pages/sales/'))      return 'pages-sales'
          if (id.includes('src/pages/purchases/'))  return 'pages-purchases'
          if (id.includes('src/pages/inventory/'))  return 'pages-inventory'
          if (id.includes('src/pages/accounting/')) return 'pages-accounting'
          if (id.includes('src/pages/hr/'))         return 'pages-hr'
          if (id.includes('src/pages/crm/'))        return 'pages-crm'
          if (id.includes('src/pages/cashbox/'))    return 'pages-cashbox'
          if (id.includes('src/pages/suppliers/'))  return 'pages-suppliers'
          if (id.includes('src/pages/customers/'))  return 'pages-customers'
          if (id.includes('src/pages/vouchers/'))   return 'pages-vouchers'
          if (id.includes('src/pages/settings/'))   return 'pages-settings'
          if (id.includes('src/pages/restaurant/')) return 'pages-restaurant'
          if (id.includes('src/pages/reports/'))    return 'pages-reports'
          if (id.includes('src/pages/pos/'))        return 'pages-pos'
        }
      }
    }
  },

  server: {
    port: 3000,
    host: true
  }
})
