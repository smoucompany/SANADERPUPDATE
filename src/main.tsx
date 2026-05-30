import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import './styles/print.css'

registerSW({
  onOfflineReady() {
    console.log('PWA offline ready')
  },
  onRegistered(registration?: ServiceWorkerRegistration) {
    console.log('Service worker registered', registration)
  },
  onRegisterError(error: any) {
    console.warn('Service worker registration failed:', error)
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)

