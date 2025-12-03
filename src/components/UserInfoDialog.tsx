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

interface UserInfoDialogProps {
  userId: number
  userName: string
  username?: string
  children: React.ReactNode
}

export function UserInfoDialog({ userId, userName, username, children }: UserInfoDialogProps) {
  const { setActiveChatId, getCurrentChats } = useBotStore()
  const { t } = useTranslation()
  const chats = getCurrentChats()

  const handleOpenChat = () => {
    // First, try to find existing chat with this user
    const existingChat = Array.from(chats?.values() || []).find(
      chat => chat.type === 'private' && chat.id === userId.toString()
    )

    if (existingChat) {
      setActiveChatId(existingChat.id)
    } else {
      // Create a new chat placeholder (will be populated when first message arrives)
      setActiveChatId(userId.toString())
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
