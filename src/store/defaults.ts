import type {
  Chat,
  BotInfo,
  BotData,
  MtProtoSettings,
  CustomBotCommand,
} from './types'

export const DEFAULT_START_RESPONSE =
  'Attention! This bot is logging in Bottlegram service. Your messages will be watched by human.'

export const createDefaultCustomCommands = (): CustomBotCommand[] => ([
  {
    id: 'builtin-start',
    command: 'start',
    description: 'Start bot',
    response: '',
    enabled: true,
    builtin: 'start',
    buttons: [],
  },
])

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
  customCommands: createDefaultCustomCommands(),
  lastUpdateId: 0,
  activeChatId: null
})

export const createDefaultPreferences = () => ({
  autoScroll: true,
  sound: true,
  push: true,
  parseMode: 'MarkdownV2' as const
})

export const createDefaultMtprotoSettings = (): MtProtoSettings => ({
  apiId: 4,
  apiHash: ''
})