import { useRef, useState } from 'react'
import { useBotStore } from '@/store/botStore'
import { useTranslation } from '@/i18n/useTranslation'
import { MessageList } from '@/components/MessageList'
import { InputArea } from '@/components/InputArea'
import { ChatInfoDialog } from '@/components/ChatInfoDialog'
import { Button } from '@/components/ui/button'
import { Users, Wifi, WifiOff, ArrowDown } from 'lucide-react'

export function ChatArea() {
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    getCurrentBotInfo,
    isConnected
  } = useBotStore()
  
  const { t } = useTranslation()
  const activeChatId = getCurrentActiveChatId()
  const chats = getCurrentChats()
  const botInfo = getCurrentBotInfo()
  const activeChat = activeChatId ? chats?.get(activeChatId) : null

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setShowNewMessageButton(false)
    }
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20
    
    if (!isAtBottom && !showNewMessageButton) {
      setShowNewMessageButton(true)
    } else if (isAtBottom && showNewMessageButton) {
      setShowNewMessageButton(false)
    }
  }

  if (!activeChat) {
    return (
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">💬</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('chat.noChatSelected')}</h3>
              <p className="text-muted-foreground">{t('chat.noChatSelectedDesc')}</p>
            </div>
            {botInfo.name && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="flex items-center justify-center gap-2 text-sm">
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span>
                        {t('chat.connectedTo')} <strong>{botInfo.name}</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span>{t('chat.notConnectedToBot')}</span>
                    </>
                  )}
                </p>
                {botInfo.username && (
                  <p className="text-xs text-muted-foreground mt-1">
                    @{botInfo.username}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  const isGroupChat = activeChat.type === 'group' || activeChat.type === 'supergroup'

  return (
    <main className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
            {activeChat.avatarText}
          </div>
          <div>
            <h2 className="font-medium">{activeChat.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span>{t('chat.active')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span>{t('chat.notConnected')}</span>
                </>
              )}
              <span>•</span>
              <span>
                {activeChat.members.size} {t('chat.members')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ChatInfoDialog />
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {activeChatId && <MessageList chatId={activeChatId} />}
      </div>

      {/* Scroll to Bottom Button */}
      {showNewMessageButton && (
        <Button
          className="fixed bottom-24 right-6 rounded-full shadow-lg z-10"
          onClick={scrollToBottom}
          size="sm"
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          {t('chat.newMessage')}
        </Button>
      )}

      {/* Input Area */}
      <InputArea />
    </main>
  )
}