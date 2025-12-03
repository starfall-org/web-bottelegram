import React, { useState, useRef } from 'react'
import { useBotStore } from '@/store/botStore'
import { botService } from '@/services/botService'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '@/components/ui/button'
import { Send, Paperclip, Smile, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputAreaProps {
  className?: string
}

export function InputArea({ className }: InputAreaProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useTranslation()
  
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    replyTo,
    setReplyTo,
    isConnected,
    addMessage
  } = useBotStore()

  const activeChatId = getCurrentActiveChatId()
  const chats = getCurrentChats()
  const activeChat = activeChatId ? chats?.get(activeChatId) : null
  const replyMessage = replyTo && activeChat ?
    activeChat.messages.find((m: any) => m.id.toString() === replyTo) : null

  const handleSend = async () => {
    if (!message.trim() || !activeChatId || !isConnected) return
    
    const textToSend = message.trim()
    const replyToId = replyTo ? parseInt(replyTo) : undefined
    
    // Clear input immediately for better UX
    setMessage('')
    setReplyTo(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const response = await botService.sendMessage(activeChatId, textToSend, {
        reply_to_message_id: replyToId
      })

      if (response.ok && response.result) {
        const sentMessage = response.result
        const newMessage = {
          id: sentMessage.message_id,
          type: 'text' as const,
          side: 'right' as const,
          text: sentMessage.text || textToSend,
          date: sentMessage.date * 1000,
          fromId: sentMessage.from?.id,
          fromName: sentMessage.from?.first_name || t('chat.you'),
          reply_to: replyToId,
          reply_preview: replyMessage?.text?.substring(0, 50)
        }
        addMessage(activeChatId, newMessage)
      } else {
        console.error('Failed to send message:', response.description)
        // Restore message on failure
        setMessage(textToSend)
        if (replyTo) setReplyTo(replyTo)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message on failure
      setMessage(textToSend)
      if (replyTo) setReplyTo(replyTo)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    
    // Show typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true)
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    // TODO: Implement file upload
    console.log('Files selected:', files)
  }

  const cancelReply = () => {
    setReplyTo(null)
  }

  return (
    <div className={cn("border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      {/* Reply Context */}
      {replyTo && replyMessage && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{t('chat.replyingTo')}</p>
            <p className="text-sm truncate">{replyMessage.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelReply}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        {/* Attach Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileSelect}
          disabled={!isConnected || !activeChatId}
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={
              !isConnected ? t('chat.disconnected') :
              !activeChatId ? t('chat.selectChat') :
              t('chat.typeMessage')
            }
            disabled={!isConnected || !activeChatId}
            className={cn(
              "w-full min-h-[40px] max-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "resize-none"
            )}
            rows={1}
          />
        </div>

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!isConnected || !activeChatId}
          className="shrink-0"
        >
          <Smile className="h-4 w-4" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || !isConnected || !activeChatId}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,video/*,audio/*,document/*"
        />
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">{t('chat.composing')}</p>
        </div>
      )}
    </div>
  )
}