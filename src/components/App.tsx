import { useEffect, useState, lazy, Suspense } from 'react'
import { useBotStore } from '@/store/botStore'
import { useBotConnection } from '@/hooks/useBotConnection'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LoadingPage } from '@/components/LoadingSpinner'
import { useTranslation } from '@/i18n/useTranslation'

// Lazy load components that aren't needed immediately
const Sidebar = lazy(() => import('@/components/Sidebar').then(m => ({ default: m.Sidebar })))
const ChatArea = lazy(() => import('@/components/ChatArea').then(m => ({ default: m.ChatArea })))
const CallbackNotification = lazy(() => import('@/components/CallbackNotification').then(m => ({ default: m.CallbackNotification })))

export function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const { theme } = useBotStore()
  const t = useTranslation()
  
  // Initialize bot connection and polling
  useBotConnection()

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    // Simulate initialization time and ensure all components are loaded
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  if (isInitializing) {
    return <LoadingPage message={t.t('app.initializing')} />
  }

  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingPage message={t.t('app.loading')} />}>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <ChatArea />
          <CallbackNotification />
        </div>
      </Suspense>
    </ThemeProvider>
  )
}