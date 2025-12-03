import { useBotStore } from '@/store/botStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { MoreVertical, Users, User, Info, Shield, Crown } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export function ChatInfoDialog() {
  const { getCurrentActiveChatId, getCurrentChats } = useBotStore()
  const activeChatId = getCurrentActiveChatId()
  const chats = getCurrentChats()
  const chat = activeChatId ? chats?.get(activeChatId) : null
  const { t } = useTranslation()

  if (!chat) return null

  const isGroup = chat.type === 'group' || chat.type === 'supergroup'
  const membersList = Array.from(chat.members.values())

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t('chat.moreOptions')}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('chat.info')}</DialogTitle>
          <DialogDescription>
            {isGroup ? t('chat.groupInfo') : t('chat.userInfo')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-4xl font-semibold">
              {chat.avatarText}
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">{chat.title}</h2>
              {chat.description && (
                <p className="text-sm text-muted-foreground">{chat.description}</p>
              )}
            </div>

            <div className="w-full space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-muted-foreground font-medium">ID</p>
                  <p className="text-sm font-mono truncate" title={chat.id}>{chat.id}</p>
                </div>
              </div>

              {isGroup && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('chat.members')}</p>
                    <p className="text-sm">{chat.members.size} {t('chat.members')}</p>
                  </div>
                </div>
              )}

              {!isGroup && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('chat.type')}</p>
                    <p className="text-sm capitalize">{chat.type}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Member List for Groups */}
            {isGroup && membersList.length > 0 && (
              <div className="w-full mt-4">
                <Separator className="my-4" />
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('chat.members')} ({membersList.length})
                </h3>
                <div className="space-y-2">
                  {membersList.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-sm">
                        {member.avatarText}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.displayName}</p>
                          {member.isCreator && (
                            <span title="Creator">
                              <Crown className="h-3 w-3 text-yellow-500" />
                            </span>
                          )}
                          {member.isAdmin && !member.isCreator && (
                            <span title="Admin">
                              <Shield className="h-3 w-3 text-blue-500" />
                            </span>
                          )}
                        </div>
                        {member.username && (
                          <p className="text-xs text-muted-foreground">@{member.username}</p>
                        )}
                      </div>
                      {member.isBot && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">BOT</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
