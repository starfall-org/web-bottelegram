import { useBotStore } from '@/store/botStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { User, MessageCircle, Info } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { botService } from '@/services/botService'

interface UserInfoDialogProps {
  userId: number
  userName: string
  username?: string
  children: React.ReactNode
}

export function UserInfoDialog({ userId, userName, username, children }: UserInfoDialogProps) {
  const { setActiveChatId, getCurrentChats, isConnected, getOrCreateChat } = useBotStore()
  const { t } = useTranslation()
  const chats = getCurrentChats()

  const handleOpenChat = async () => {
    // First, try to find existing chat with this user
    const idStr = userId.toString()
    const existingChat = Array.from(chats?.values() || []).find(
      chat => chat.type === 'private' && chat.id === idStr
    )

    if (existingChat) {
      setActiveChatId(existingChat.id)
      return
    }

    try {
      let chatId = idStr
      let chatData: any = {
        type: 'private',
        title: userName || `User ${idStr}`,
        avatarText: (userName || 'U').charAt(0).toUpperCase()
      }

      // If we have username and bot is connected, resolve info via API for better metadata
      if (isConnected && username) {
        const uname = username.startsWith('@') ? username : `@${username}`
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
            avatarText
          }
        }
      }

      getOrCreateChat(chatId, chatData)
      setActiveChatId(chatId)
    } catch (_e) {
      // Fallback: ensure a local chat exists
      getOrCreateChat(idStr, {
        type: 'private',
        title: userName || `User ${idStr}`,
        avatarText: (userName || 'U').charAt(0).toUpperCase()
      })
      setActiveChatId(idStr)
    }
  }

  // Get first letter for avatar
  const avatarText = userName.charAt(0).toUpperCase()

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('chat.userInfo')}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl font-semibold">
            {avatarText}
          </div>
          
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{userName}</h2>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
          </div>

          <div className="w-full space-y-3 mt-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-muted-foreground font-medium">ID</p>
                <p className="text-sm font-mono truncate">{userId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('chat.type')}</p>
                <p className="text-sm capitalize">Private</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleOpenChat} 
            className="w-full mt-4"
            size="lg"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {t('chat.openChat')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
