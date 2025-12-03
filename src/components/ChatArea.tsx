import { useRef, useState } from 'react'
import { useBotStore } from '@/store/botStore'
import { useTranslation } from '@/i18n/useTranslation'
import { MessageList } from '@/components/MessageList'
import { InputArea } from '@/components/InputArea'
import { ChatInfoDialog } from '@/components/ChatInfoDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wifi, WifiOff, ArrowDown } from 'lucide-react'
import { botService } from '@/services/botService'

export function ChatArea() {
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [openChatInput, setOpenChatInput] = useState('')
  const [openChatTitle, setOpenChatTitle] = useState('')
  const [openChatLoading, setOpenChatLoading] = useState(false)
  const [openChatError, setOpenChatError] = useState<string | null>(null)
  
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    getCurrentBotInfo,
    isConnected,
    getOrCreateChat,
    setActiveChatId,
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

  const handleOpenChat = async () => {
    setOpenChatError(null)
    const raw = openChatInput.trim()
    if (!raw) return
    setOpenChatLoading(true)
    try {
      let chatId = ''
      let chatData: any = null

      if (raw.startsWith('@') || /[A-Za-z]/.test(raw)) {
        if (!isConnected) {
          throw new Error('Cần kết nối bot để tra cứu @username')
        }
        const uname = raw.startsWith('@') ? raw : `@${raw}`
        const res = await botService.getChat(uname)
        if (res.ok && (res as any).result) {
          const info: any = (res as any).result
          chatId = String(info.id)
          const title =
            info.title ||
            `${(info.first_name || '')} ${(info.last_name || '')}`.trim() ||
            info.username ||
            chatId
          const avatarText = (title || 'U').charAt(0).toUpperCase()
          chatData = {
            type: info.type || 'private',
            title,
            avatarText,
          }
        } else {
          throw new Error((res as any).description || 'Không tìm thấy chat')
        }
      } else {
        chatId = raw
        const title = openChatTitle.trim() || `Chat ${chatId}`
        const avatarText = (title || 'U').charAt(0).toUpperCase()
        chatData = {
          type: 'private',
          title,
          avatarText,
        }
      }

      getOrCreateChat(chatId, chatData)
      setActiveChatId(chatId)
      setOpenChatInput('')
      setOpenChatTitle('')
    } catch (e: any) {
      setOpenChatError(e?.message || 'Không thể mở chat')
    } finally {
      setOpenChatLoading(false)
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

            <div className="mt-6 space-y-2 p-4 border rounded-lg text-left">
              <p className="text-sm font-medium">Mở chat mới</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Chat ID hoặc @username"
                  value={openChatInput}
                  onChange={(e) => setOpenChatInput(e.target.value)}
                  disabled={openChatLoading}
                />
                <Input
                  placeholder="Tiêu đề (tùy chọn)"
                  value={openChatTitle}
                  onChange={(e) => setOpenChatTitle(e.target.value)}
                  disabled={openChatLoading}
                />
                <Button
                  onClick={handleOpenChat}
                  disabled={openChatLoading || !openChatInput.trim()}
                >
                  {openChatLoading ? 'Đang mở...' : 'Mở chat'}
                </Button>
              </div>
              {openChatError && (
                <p className="text-xs text-destructive">{openChatError}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Gợi ý: Nhập @channel/@group hoặc ID số. Với người dùng, bot chỉ nhắn nếu họ đã start bot.
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col relative">
      {/* Chat Header */}
      <div className="sticky top-0 z-20 border-b px-4 py-3 md:p-4 flex items-center justify-between bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
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
        className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6"
        onScroll={handleScroll}
      >
        {activeChatId && <MessageList chatId={activeChatId} />}
      </div>

      {/* New Message Overlay + Button */}
      {showNewMessageButton && (
        <>
          <div className="pointer-events-none absolute bottom-20 left-0 right-0 h-16 bg-gradient-to-t from-background/90 via-background/60 to-transparent" />
          <Button
            className="fixed bottom-24 right-4 md:right-6 rounded-full shadow-lg z-30 animate-slideIn"
            onClick={scrollToBottom}
            size="sm"
            aria-label={t('chat.newMessage')}
          >
            <ArrowDown className="h-4 w-4 mr-2" />
            {t('chat.newMessage')}
          </Button>
        </>
      )}

      {/* Input Area */}
      <InputArea />
    </main>
  )
}