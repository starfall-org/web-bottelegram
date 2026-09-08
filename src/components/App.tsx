import { useEffect } from 'react'
import { useBotStore } from '@/store/botStore'
import { useBotConnection } from '@/hooks/useBotConnection'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LoginScreen } from '@/components/LoginScreen'
import { Sidebar } from '@/components/Sidebar'
import { ChatArea } from '@/components/ChatArea'
import { CallbackNotification } from '@/components/CallbackNotification'

export function App() {
  const { theme, token, gateway, mtproto } = useBotStore()
  
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

  const hasCredentials = Boolean(
    token.trim() &&
      (gateway === 'bot' || (mtproto.apiHash.trim() && (mtproto.apiId || 4) > 0)),
  )

  return (
    <ThemeProvider>
      {!hasCredentials ? (
        <LoginScreen />
      ) : (
        <div className="telegram-chat-surface relative flex h-screen overflow-hidden text-foreground">
          <Sidebar />
          <ChatArea />
          <CallbackNotification />
        </div>
      )}
    </ThemeProvider>
  )
}
