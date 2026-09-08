import { useRef, useState, useEffect } from 'react'
import { useBotStore } from '@/store/botStore'
import { useTranslation } from '@/i18n/useTranslation'
import { MessageList } from '@/components/MessageList'
import { InputArea } from '@/components/InputArea'
import { ChatInfoDialog } from '@/components/ChatInfoDialog'
import { Button } from '@/components/ui/button'
import { ArrowDown, Paperclip, Menu, Search } from 'lucide-react'
import { Avatar } from '@/components/Avatar'

export function ChatArea() {
  const [showNewMessageButton, setShowNewMessageButton] = useState(false)
  const [unreadBelowCount, setUnreadBelowCount] = useState(0)
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCounterRef = useRef(0)
  const prevActiveChatIdRef = useRef<string | null>(null)
  const prevMessageCountRef = useRef<number>(0)
  const prevMessageIdsRef = useRef<Set<string>>(new Set())

  
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    isConnected,
  } = useBotStore()
  
  const { t } = useTranslation()
  const activeChatId = getCurrentActiveChatId()
  const chats = getCurrentChats()
  const activeChat = activeChatId ? chats?.get(activeChatId) : null

  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
      setShowNewMessageButton(false)
      setUnreadBelowCount(0)
    }
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20
    
    if (!isAtBottom && !showNewMessageButton) {
      setShowNewMessageButton(true)
    } else if (isAtBottom) {
      if (showNewMessageButton) setShowNewMessageButton(false)
      if (unreadBelowCount) setUnreadBelowCount(0)
    }
  }

  // Auto scroll to bottom when chat opens or changes
  useEffect(() => {
    if (activeChatId && activeChat) {
      // Check if chat actually changed
      const chatChanged = prevActiveChatIdRef.current !== activeChatId
      
      if (chatChanged) {
        // Reset message count when switching chats
        prevMessageCountRef.current = activeChat.messages?.length || 0
        prevMessageIdsRef.current = new Set(
          (activeChat.messages || []).map((message) => String(message.id)),
        )
        prevActiveChatIdRef.current = activeChatId
        setUnreadBelowCount(0)
        
        // Scroll immediately when chat opens
        scrollToBottom(false)
      }
    }
  }, [activeChatId, activeChat])

  // Auto scroll when new messages arrive. If the user has scrolled up,
  // keep their position and count only newly received messages below them.
  useEffect(() => {
    if (activeChat?.messages && messagesContainerRef.current) {
      const currentMessageCount = activeChat.messages.length
      const currentIds = new Set(activeChat.messages.map((message) => String(message.id)))
      const isSameChat = prevActiveChatIdRef.current === activeChatId
      const newlyAdded = isSameChat
        ? activeChat.messages.filter((message) => !prevMessageIdsRef.current.has(String(message.id)))
        : []
      const incomingNewCount = newlyAdded.filter((message) => message.side === 'left').length

      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (isNearBottom) {
        scrollToBottom(true)
      } else if (incomingNewCount > 0) {
        setUnreadBelowCount((count) => count + incomingNewCount)
        setShowNewMessageButton(true)
      }

      if (incomingNewCount > 0) {
        playNotificationSound()
      }

      prevMessageCountRef.current = currentMessageCount
      prevMessageIdsRef.current = currentIds
    }
  }, [activeChat?.messages, activeChatId])

  const playNotificationSound = () => {
    // Simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (e) {
      // Ignore audio errors
    }
  }

  // Global drag and drop handler
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      dragCounterRef.current++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
      }
    }

    const handleDragLeave = (_e: DragEvent) => {
      dragCounterRef.current--
      if (dragCounterRef.current === 0) {
        setIsDraggingFile(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      // Prevent default to allow drop
      e.preventDefault()
    }

    const handleDrop = (_e: DragEvent) => {
      // Reset drag state but don't prevent default - let InputArea handle the actual drop
      dragCounterRef.current = 0
      setIsDraggingFile(false)
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  if (!activeChat) {
    return (
      <main className="telegram-chat-pane flex-1 relative min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-5 top-5 z-30 rounded-full bg-card/90 shadow-sm md:hidden"
          onClick={() => window.dispatchEvent(new Event('telegram:open-sidebar'))}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </main>
    )
  }

  return (
    <main className="telegram-chat-pane flex-1 flex flex-col relative min-w-0">
      {/* Global Drag Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Paperclip className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--primary))] animate-bounce" />
            <p className="text-2xl font-semibold text-[hsl(var(--primary))] mb-2">
              Thả file vào đây để gửi
            </p>
            <p className="text-sm text-muted-foreground">
              Hỗ trợ tất cả loại file
            </p>
          </div>
        </div>
      )}

      {/* Floating Telegram-style chat header */}
      <div className="telegram-float-header z-20 flex h-[72px] shrink-0 items-center justify-between bg-[hsl(var(--background))] px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-full"
            onClick={() => window.dispatchEvent(new Event('telegram:open-sidebar'))}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar
              src={activeChat.avatarUrl}
              alt={activeChat.title}
              fallback={activeChat.avatarText}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-base font-semibold text-white"
            />
            <div>
              <div className="text-[19px] font-semibold leading-6">{activeChat.title}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {isComposerFocused ? (
                  <span className="font-medium text-[#9b83ff]">{t('chat.composing')}</span>
                ) : activeChat.type === 'group' || activeChat.type === 'supergroup' ? (
                  <span>{activeChat.memberCount || activeChat.members.size || 0} members</span>
                ) : activeChat.type === 'channel' ? (
                  <span>{activeChat.memberCount || 0} subscribers</span>
                ) : isConnected ? (
                  <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> online</>
                ) : (
                  <><span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" /> offline</>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" title="Search">
            <Search className="h-6 w-6" />
          </Button>
          <ChatInfoDialog />
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="telegram-message-stream flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-2"
        onScroll={handleScroll}
      >
        {activeChatId && <MessageList chatId={activeChatId} />}
      </div>

      {/* Scroll-to-bottom button. The badge counts incoming messages that arrived
          while the user was reading older messages. */}
      {showNewMessageButton && (
        <>
          <div className="pointer-events-none absolute bottom-20 left-0 right-0 h-16 bg-gradient-to-t from-background/90 via-background/60 to-transparent" />
          <Button
            className="telegram-jump-button absolute bottom-24 right-5 z-30 rounded-full shadow-lg animate-slideIn md:right-8"
            onClick={() => scrollToBottom(true)}
            size="icon"
            aria-label={t('chat.newMessage')}
            title={t('chat.newMessage')}
          >
            <ArrowDown className="h-7 w-7 shrink-0" strokeWidth={2.25} />
            {unreadBelowCount > 0 && (
              <span className="telegram-jump-button__badge" aria-label={`${unreadBelowCount} unread messages`}>
                {unreadBelowCount > 99 ? '99+' : unreadBelowCount}
              </span>
            )}
          </Button>
        </>
      )}

      {/* Input Area */}
      <InputArea
        className="telegram-composer bg-transparent border-0"
        isDraggingGlobal={isDraggingFile}
        onComposerFocusChange={setIsComposerFocused}
      />
    </main>
  )
}
