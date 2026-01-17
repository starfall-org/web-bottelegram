export interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
  web_app?: { url: string }
}

export interface Message {
  id: number | string
  type: 'text' | 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker'
  side: 'left' | 'right'
  text?: string
  mediaUrl?: string
  caption?: string
  fileName?: string
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

export interface BotInfo {
  id: number | null
  username: string | null
  name: string | null
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
  lastUpdateId: number
  activeChatId: string | null
}

export interface BotState {
  // Current connection state
  token: string
  isConnected: boolean
  isPolling: boolean
  pollingStatus: 'idle' | 'polling' | 'error'
  lastError: string | null

  // Bot data per token (key: bot token, value: BotData)
  botDataMap: Map<string, BotData>

  // UI state
  replyTo: string | null
  editingMessageId: string | null
  theme: 'light' | 'dark' | 'system'
  language: 'vi' | 'en'

  // Preferences
  preferences: {
    autoScroll: boolean
    sound: boolean
    push: boolean
    parseMode: 'MarkdownV2' | 'Markdown' | 'HTML' | 'None'
  }

  // Actions
  setToken: (token: string) => void
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

  // Chat actions - these now work with current bot
  getOrCreateChat: (chatId: string, initialData?: Partial<Chat>) => Chat
  addMessage: (chatId: string, message: Message) => boolean
  removeMessage: (chatId: string, messageId: number | string) => boolean
  updateMessage: (chatId: string, messageId: number | string, patch: Partial<Message>) => boolean
  upsertMember: (chatId: string, member: Partial<ChatMember> & { id: string }) => ChatMember | null
  removeMember: (chatId: string, userId: string) => boolean
  clearChatHistory: (chatId: string) => boolean
  deleteChat: (chatId: string) => boolean

  // Sticker storage
  addRecentSticker: (sticker: StickerEntry) => void
  getRecentStickers: () => StickerEntry[]
  addFavoriteSticker: (sticker: StickerEntry) => void
  removeFavoriteSticker: (file_id: string) => void
  getFavoriteStickers: () => StickerEntry[]

  // Utility
  clearAllData: () => void
  clearBotData: (botToken: string) => void
  getSortedChats: () => Chat[]

  // Current bot getters
  getCurrentBotData: () => BotData | undefined
  getCurrentBotInfo: () => BotInfo
  getCurrentChats: () => Map<string, Chat>
  getCurrentActiveChatId: () => string | null
  getCurrentLastUpdateId: () => number
}
