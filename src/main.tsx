import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import './styles/print.css'

registerSW({
  onOfflineReady() {},
  onRegistered() {},
  onRegisterError() {}
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,  // 5 دقائق — لا نعيد الجلب إلا بعدها
      gcTime:               1000 * 60 * 15, // 15 دقيقة في الذاكرة
      retry:                1,              // محاولة واحدة فقط عند الفشل
      refetchOnWindowFocus: false,          // لا نعيد الجلب عند التبديل بين النوافذ
      refetchOnReconnect:   true,
      networkMode:          'online'
    },
    mutations: {
      retry: 0  // لا نعيد محاولة الحفظ تلقائياً
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
