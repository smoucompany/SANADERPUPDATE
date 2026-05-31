import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import './styles/print.css'

registerSW({ onOfflineReady() {}, onRegistered() {}, onRegisterError() {} })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,   // 5 دقائق — لا يُعاد الجلب إلا بعدها
      gcTime:               1000 * 60 * 20,  // 20 دقيقة في الذاكرة
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
      // ★ الأهم: يعرض البيانات القديمة فورًا بينما يجلب الجديدة في الخلفية
      // يمنع الـ loading spinner عند العودة لصفحة زرتها من قبل
      placeholderData:      (prev: unknown) => prev,
      networkMode:          'online',
    },
    mutations: {
      retry:       0,
      networkMode: 'online',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
