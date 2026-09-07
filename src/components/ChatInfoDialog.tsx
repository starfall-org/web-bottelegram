import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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
import { MoreVertical, Users, User, Info, Shield, Crown, Camera, Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { Avatar } from '@/components/Avatar'
import { getChatAvatarUrl } from '@/lib/telegramAvatar'
import { botService } from '@/services/botService'

export function ChatInfoDialog() {
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    getCurrentBotInfo,
    getOrCreateChat,
    clearChatHistory,
    deleteChat,
  } = useBotStore()
  const activeChatId = getCurrentActiveChatId()
  const chats = getCurrentChats()
  const chat = activeChatId ? chats?.get(activeChatId) : null
  const botInfo = getCurrentBotInfo()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !chat) return

    let cancelled = false
    const syncChatProfile = async () => {
      try {
        const profileResponse = await botService.getChat(chat.id)
        if (profileResponse.ok && profileResponse.result) {
          const avatarUrl = await getChatAvatarUrl(profileResponse.result)
          if (!cancelled && avatarUrl) {
            getOrCreateChat(chat.id, { avatarUrl })
          }
        }

        if (chat.type !== 'private' && botInfo.id) {
          const memberResponse = await botService.getChatMember(chat.id, botInfo.id)
          const member: any = memberResponse.ok ? memberResponse.result : null
          const canChangeInfo = member?.status === 'creator' ||
            (member?.status === 'administrator' && Boolean(member.can_change_info))

          if (!cancelled) {
            getOrCreateChat(chat.id, {
              permissions: { ...chat.permissions, canChangeInfo },
            })
          }
        }
      } catch (error) {
        console.warn('Failed to load chat profile:', error)
      }
    }

    void syncChatProfile()
    return () => { cancelled = true }
  }, [open, chat?.id, chat?.type, botInfo.id, getOrCreateChat])

  if (!chat) return null

  const isGroup = chat.type === 'group' || chat.type === 'supergroup'
  const membersList = Array.from(chat.members.values())

  const handleClearHistory = () => {
    if (confirm(t('chat.clearHistoryConfirm'))) {
      clearChatHistory(chat.id)
    }
  }

  const handleDeleteChat = () => {
    if (confirm(t('chat.deleteChatConfirm'))) {
      deleteChat(chat.id)
    }
  }

  const canChangeAvatar = chat.type !== 'private' && chat.permissions.canChangeInfo

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0]
    event.target.value = ''
    if (!photo) return

    setAvatarError(null)
    setIsUpdatingAvatar(true)
    try {
      const response = await botService.setChatPhoto(chat.id, photo)
      if (!response.ok) {
        throw new Error(response.description || t('common.error'))
      }

      const refreshed = await botService.getChat(chat.id)
      const avatarUrl = refreshed.ok && refreshed.result
        ? await getChatAvatarUrl(refreshed.result)
        : undefined
      getOrCreateChat(chat.id, {
        avatarUrl: avatarUrl || URL.createObjectURL(photo),
      })
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsUpdatingAvatar(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <div className="relative">
              <Avatar
                src={chat.avatarUrl}
                alt={chat.title}
                fallback={chat.avatarText}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-semibold text-primary-foreground"
              />
              {canChangeAvatar && (
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full shadow-md"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUpdatingAvatar}
                  title={t('chat.changePhoto')}
                >
                  {isUpdatingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">{chat.title}</h2>
              {chat.description && (
                <p className="text-sm text-muted-foreground">{chat.description}</p>
              )}
              {chat.type !== 'private' && !canChangeAvatar && (
                <p className="mt-2 text-xs text-muted-foreground">{t('chat.photoPermissionRequired')}</p>
              )}
              {avatarError && <p className="mt-2 text-xs text-destructive">{avatarError}</p>}
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

          <Separator className="my-4" />
          <div className="w-full mt-2 space-y-2">
            <h3 className="text-sm font-semibold text-destructive">{t('settings.dangerZone')}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleClearHistory}
              >
                {t('chat.clearHistory')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChat}
              >
                {t('chat.deleteChat')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
