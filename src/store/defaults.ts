import type { Chat, BotInfo, BotData } from './types'

export const createDefaultChat = (chatId: string, initialData: Partial<Chat> = {}): Chat => ({
  id: chatId,
  type: 'private',
  title: `Chat ${chatId}`,
  avatarText: '?',
  messages: [],
  messageIds: new Set(),
  members: new Map(),
  permissions: {
    canDeleteMessages: false,
    canPromoteMembers: false,
    canRestrictMembers: false,
    canChangeInfo: false,
    canInviteUsers: false
  },
  lastText: '',
  lastDate: 0,
  unread: 0,
  ...initialData
})

export const createDefaultBotInfo = (): BotInfo => ({
  id: null,
  username: null,
  name: null,
  description: null,
  shortDescription: null,
  commands: []
})

export const createDefaultBotData = (): BotData => ({
  botInfo: createDefaultBotInfo(),
  chats: new Map(),
  recentStickers: [],
  favoriteStickers: [],
  lastUpdateId: 0,
  activeChatId: null
})

export const createDefaultPreferences = () => ({
  autoScroll: true,
  sound: true,
  push: true,
  parseMode: 'MarkdownV2' as const
})
