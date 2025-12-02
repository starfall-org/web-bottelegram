import React from 'react'
import { useBotStore, Message } from '@/store/botStore'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

interface MessageListProps {
  chatId: string
}

interface MessageItemProps {
  message: Message
  onDelete?: (messageId: number | string) => void
  onReply?: (messageId: number | string) => void
  showSenderName?: boolean
}

function MessageItem({ message, onDelete, onReply, showSenderName = false }: MessageItemProps) {
  const isOwn = message.side === 'right'

  const handleDelete = () => {
    if (onDelete && confirm('Xóa tin nhắn này?')) {
      onDelete(message.id)
    }
  }

  const handleReply = () => {
    if (onReply) {
      onReply(message.id)
    }
  }

  const renderContent = () => {
    switch (message.type) {
      case 'photo':
        return (
          <div>
            <img 
              src={message.mediaUrl} 
              alt={message.caption || 'Photo'} 
              className="max-w-full rounded-lg"
              loading="lazy"
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        )

      case 'video':
        return (
          <div>
            <video 
              src={message.mediaUrl} 
              controls 
              className="max-w-full rounded-lg"
              preload="metadata"
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        )

      case 'audio':
      case 'voice':
        return (
          <div>
            <audio src={message.mediaUrl} controls className="w-full" />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        )

      case 'document':
        return (
          <div>
            <a 
              href={message.mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 p-2 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              📄 {message.fileName || 'Document'}
            </a>
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        )

      case 'sticker':
        return (
          <div className="flex flex-col items-center">
            {message.stickerFormat === 'webp' || message.stickerFormat === 'static' ? (
              <img 
                src={message.mediaUrl} 
                alt={message.emoji || 'Sticker'} 
                className="sticker-message"
              />
            ) : message.stickerFormat === 'webm' || message.stickerFormat === 'video' ? (
              <video 
                src={message.mediaUrl} 
                autoPlay 
                loop 
                muted 
                className="sticker-message"
              />
            ) : (
              <div className="text-4xl p-4">
                {message.emoji || '✨'}
                <div className="text-xs text-muted-foreground mt-1">
                  Animated Sticker
                </div>
              </div>
            )}
          </div>
        )

      default:
        return <p className="whitespace-pre-wrap break-words">{message.text}</p>
    }
  }

  return (
    <div
      className={cn(
        'group flex',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'chat-message relative',
          isOwn ? 'own' : 'other',
          message.reply_to && 'border-l-4 border-primary pl-3'
        )}
        onClick={handleReply}
      >
        {/* Reply context */}
        {message.reply_preview && (
          <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded border-l-2 border-primary">
            ↪ {message.reply_preview}
          </div>
        )}

        {/* Sender name for group chats */}
        {showSenderName && !isOwn && (
          <div className="text-xs font-medium text-primary mb-1">
            {message.fromName}
          </div>
        )}

        {/* Message content */}
        <div className="mb-2">
          {renderContent()}
        </div>

        {/* Message metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(message.date)}</span>
          
          {/* Action buttons */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MessageList({ chatId }: MessageListProps) {
  const { getCurrentChats, setReplyTo, removeMessage } = useBotStore()
  const chats = getCurrentChats()
  const chat = chats?.get(chatId)

  if (!chat || chat.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Chưa có tin nhắn nào.</p>
          <p className="text-xs mt-1">Hãy gửi tin nhắn đầu tiên!</p>
        </div>
      </div>
    )
  }

  const isGroupChat = chat.type === 'group' || chat.type === 'supergroup'

  const handleDeleteMessage = async (messageId: number | string) => {
    // TODO: Call bot service to delete message
    console.log('Deleting message:', messageId)
    
    // Optimistically remove from local state
    removeMessage(chatId, messageId)
  }

  const handleReplyToMessage = (messageId: number | string) => {
    setReplyTo(messageId.toString())
  }

  return (
    <div className="space-y-3">
      {chat.messages.map((message: Message) => (
        <MessageItem
          key={message.id}
          message={message}
          onDelete={handleDeleteMessage}
          onReply={handleReplyToMessage}
          showSenderName={isGroupChat}
        />
      ))}
    </div>
  )
}