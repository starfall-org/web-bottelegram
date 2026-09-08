export interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
  web_app?: { url: string }
}

export interface MediaGroupItem {
  id: number | string
  type: 'photo' | 'video' | 'audio' | 'document'
  mediaUrl?: string
  caption?: string
  fileName?: string
  mimeType?: string
  date?: number
}

export interface Message {
  id: number | string
  type: 'text' | 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'media_group'
  side: 'left' | 'right'
  text?: string
  mediaUrl?: string
  caption?: string
  fileName?: string
  mediaGroupId?: string
  mediaGroupItems?: MediaGroupItem[]
  stickerFormat?: string
  emoji?: string
  date: number
  fromId?: number
  fromName: string
  fromUsername?: string
  reply_to?: number | string
  reply_preview?: string
  reply_markup?: InlineKeyboardButton[][]
}

export interface Member {
  id: string
  firstName?: string
  lastName?: string
  username?: string
  displayName: string
  avatarText: string
  avatarUrl?: string
  status: string
  isAdmin: boolean
  isCreator: boolean
  isBot: boolean
  joinedDate?: number
  lastSeen: number
  raw?: any
}

export interface ChatMember extends Member {}

export interface Chat {
  id: string
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title: string
  avatarText: string
  avatarUrl?: string
  username?: string
  memberCount?: number
  messages: Message[]
  messageIds: Set<number | string>
  members: Map<string, ChatMember>
  permissions: {
    canDeleteMessages: boolean
    canPromoteMembers: boolean
    canRestrictMembers: boolean
    canChangeInfo: boolean
    canInviteUsers: boolean
  }
  lastText: string
  lastDate: number
  unread: number
  description?: string
}

export interface BotCommand {
  command: string
  description: string
}

export interface CustomCommandButton {
  id: string
  text: string
  type: 'callback' | 'url'
  value: string
  row: number
}

export interface CustomBotCommand {
  id: string
  command: string
  description: string
  response: string
  enabled: boolean
  builtin?: 'start'
  buttons: CustomCommandButton[]
}

export interface BotInfo {
  id: number | null
  username: string | null
  name: string | null
  avatarUrl?: string
  description: string | null
  shortDescription: string | null
  commands: Array<{ command: string; description: string }>
}

export interface StickerEntry {
  file_id: string
  url?: string
  emoji?: string
  format: 'static' | 'video' | 'animated' | 'unknown'
  addedAt: number
  favorite?: boolean
}

export interface BotData {
  botInfo: BotInfo
  chats: Map<string, Chat>
  recentStickers: StickerEntry[]
  favoriteStickers: StickerEntry[]
  customCommands: CustomBotCommand[]
  lastUpdateId: number
  activeChatId: string | null
}

export interface MtProtoSettings {
  apiId: number | null
  apiHash: string
}

export type GatewayMode = 'bot' | 'mtproto'

export interface BotState {
  token: string
  gateway: GatewayMode
  mtproto: MtProtoSettings
  isConnected: boolean
  isPolling: boolean
  pollingStatus: 'idle' | 'polling' | 'error'
  lastError: string | null
  botDataMap: Map<string, BotData>
  replyTo: string | null
  editingMessageId: string | null
  theme: 'light' | 'dark' | 'system'
  language: 'vi' | 'en'
  preferences: {
    autoScroll: boolean
    sound: boolean
    push: boolean
    parseMode: 'MarkdownV2' | 'Markdown' | 'HTML' | 'None'
  }
  setToken: (token: string) => void
  setGateway: (gateway: GatewayMode) => void
  setMtprotoSettings: (settings: Partial<MtProtoSettings>) => void
  setConnected: (connected: boolean) => void
  setPolling: (polling: boolean) => void
  setPollingStatus: (status: 'idle' | 'polling' | 'error') => void
  setLastError: (error: string | null) => void
  setBotInfo: (info: Partial<BotInfo>) => void
  setActiveChatId: (chatId: string | null) => void
  setReplyTo: (messageId: string | null) => void
  setEditingMessageId: (messageId: string | null) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: 'vi' | 'en') => void
  updatePreferences: (prefs: Partial<BotState['preferences']>) => void
  setLastUpdateId: (updateId: number) => void
  getOrCreateChat: (chatId: string, initialData?: Partial<Chat>) => Chat
  addMessage: (chatId: string, message: Message) => boolean
  removeMessage: (chatId: string, messageId: number | string) => boolean
  updateMessage: (chatId: string, messageId: number | string, patch: Partial<Message>) => boolean
  upsertMember: (chatId: string, member: Partial<ChatMember> & { id: string }) => ChatMember | null
  removeMember: (chatId: string, userId: string) => boolean
  clearChatHistory: (chatId: string) => boolean
  deleteChat: (chatId: string) => boolean
  addRecentSticker: (sticker: StickerEntry) => void
  getRecentStickers: () => StickerEntry[]
  addFavoriteSticker: (sticker: StickerEntry) => void
  removeFavoriteSticker: (file_id: string) => void
  getFavoriteStickers: () => StickerEntry[]
  getCustomCommands: () => CustomBotCommand[]
  upsertCustomCommand: (command: CustomBotCommand) => void
  removeCustomCommand: (commandId: string) => boolean
  clearAllData: () => void
  clearBotData: (botToken: string) => void
  getSortedChats: () => Chat[]
  getCurrentBotData: () => BotData | undefined
  getCurrentBotInfo: () => BotInfo
  getCurrentChats: () => Map<string, Chat>
  getCurrentActiveChatId: () => string | null
  getCurrentLastUpdateId: () => number
}