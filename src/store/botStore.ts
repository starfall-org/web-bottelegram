import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

// Bot-specific data structure
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

const createDefaultChat = (chatId: string, initialData: Partial<Chat> = {}): Chat => ({
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

const createDefaultBotInfo = (): BotInfo => ({
  id: null,
  username: null,
  name: null,
  description: null,
  shortDescription: null,
  commands: []
})

const createDefaultBotData = (): BotData => ({
  botInfo: createDefaultBotInfo(),
  chats: new Map(),
  recentStickers: [],
  favoriteStickers: [],
  lastUpdateId: 0,
  activeChatId: null
})

export const useBotStore = create<BotState>()(
  persist(
    (set: any, get: any): BotState => ({
      // Initial state
      token: '',
      isConnected: false,
      isPolling: false,
      pollingStatus: 'idle',
      lastError: null,
      botDataMap: new Map(),
      replyTo: null,
      editingMessageId: null,
      theme: 'system',
      language: 'vi',
      preferences: {
        autoScroll: true,
        sound: true,
        push: true
      },

      // Actions
      setToken: (token: string) => {
        set({ token })
        // Ensure bot data exists for this token
        if (token) {
          const state = get()
          if (!state.botDataMap || !state.botDataMap.has(token)) {
            set((state: BotState) => ({
              botDataMap: new Map(state.botDataMap || new Map()).set(token, createDefaultBotData())
            }))
          }
        }
      },
      
      setConnected: (isConnected: boolean) => set({ isConnected }),
      setPolling: (isPolling: boolean) => set({ isPolling }),
      setPollingStatus: (pollingStatus: 'idle' | 'polling' | 'error') => set({ pollingStatus }),
      setLastError: (lastError: string | null) => set({ lastError }),
      
      setBotInfo: (info: Partial<BotInfo>) => {
        const state = get()
        if (!state.token) return
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const updatedBotData = {
          ...currentBotData,
          botInfo: { ...currentBotData.botInfo, ...info }
        }
        
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },
      
      setActiveChatId: (activeChatId: string | null) => {
        const state = get()
        if (!state.token) return
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const updatedBotData = {
          ...currentBotData,
          activeChatId
        }
        
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },
      
      setReplyTo: (replyTo: string | null) => set({ replyTo }),
      setEditingMessageId: (editingMessageId: string | null) => set({ editingMessageId }),
      setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),
      setLanguage: (language: 'vi' | 'en') => set({ language }),
      updatePreferences: (prefs: Partial<BotState['preferences']>) => set((state: BotState) => ({
        preferences: { ...state.preferences, ...prefs }
      })),
      
      setLastUpdateId: (lastUpdateId: number) => {
        const state = get()
        if (!state.token) return
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const updatedBotData = {
          ...currentBotData,
          lastUpdateId
        }
        
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },

      // Chat actions
      getOrCreateChat: (chatId: string, initialData: Partial<Chat> = {}) => {
        const state = get()
        if (!state.token) return createDefaultChat(chatId, initialData)
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        let chat = currentBotData.chats.get(chatId)
        
        if (!chat) {
          chat = createDefaultChat(chatId, initialData)
          const updatedChats = new Map(currentBotData.chats).set(chatId, chat)
          const updatedBotData = { ...currentBotData, chats: updatedChats }
          
          set((state: BotState) => ({
            botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
          }))
        }
        
        return chat
      },

      addMessage: (chatId: string, message: Message) => {
        const state = get()
        if (!state.token) return false
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return false

        if (chat.messageIds.has(message.id)) {
          return false // Already exists
        }

        const updatedChat = {
          ...chat,
          messages: [...chat.messages, message],
          messageIds: new Set([...chat.messageIds, message.id]),
          lastText: message.type === 'text' ? message.text || '' : 
                   (message.caption || message.text || `[${message.type}]`),
          lastDate: message.date
        }

        const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
        const updatedBotData = { ...currentBotData, chats: updatedChats }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return true
      },

      removeMessage: (chatId: string, messageId: number | string) => {
        const state = get()
        if (!state.token) return false
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return false

        const messageIndex = chat.messages.findIndex((m: Message) => m.id === messageId)
        if (messageIndex === -1) return false

        const updatedMessages = [...chat.messages]
        updatedMessages.splice(messageIndex, 1)
        
        const updatedMessageIds = new Set(chat.messageIds)
        updatedMessageIds.delete(messageId)

        const updatedChat = {
          ...chat,
          messages: updatedMessages,
          messageIds: updatedMessageIds
        }

        const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
        const updatedBotData = { ...currentBotData, chats: updatedChats }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return true
      },

      updateMessage: (chatId: string, messageId: number | string, patch: Partial<Message>) => {
        const state = get()
        if (!state.token) return false

        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return false

        const idx = chat.messages.findIndex((m: Message) => m.id === messageId)
        if (idx === -1) return false

        const updatedMessages = [...chat.messages]
        const updatedMessage = { ...updatedMessages[idx], ...patch }
        updatedMessages[idx] = updatedMessage

        const isLast = idx === chat.messages.length - 1
        const updatedChat = {
          ...chat,
          messages: updatedMessages,
          ...(isLast
            ? {
                lastText:
                  updatedMessage.type === 'text'
                    ? updatedMessage.text || ''
                    : (updatedMessage.caption || updatedMessage.text || `[${updatedMessage.type}]`),
                lastDate: updatedMessage.date || chat.lastDate
              }
            : {})
        }

        const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
        const updatedBotData = { ...currentBotData, chats: updatedChats }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return true
      },

      upsertMember: (chatId: string, memberData: Partial<ChatMember> & { id: string }) => {
        const state = get()
        if (!state.token) return null
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return null

        const existing = chat.members.get(memberData.id) || {}
        const updated: ChatMember = {
          ...existing,
          displayName: memberData.displayName || existing.displayName || '',
          avatarText: memberData.avatarText || existing.avatarText || '?',
          status: memberData.status || existing.status || 'member',
          isAdmin: memberData.isAdmin ?? existing.isAdmin ?? false,
          isCreator: memberData.isCreator ?? existing.isCreator ?? false,
          isBot: memberData.isBot ?? existing.isBot ?? false,
          lastSeen: memberData.lastSeen || existing.lastSeen || Date.now(),
          ...memberData
        }

        const updatedMembers = new Map(chat.members)
        updatedMembers.set(memberData.id, updated)

        const updatedChat = { ...chat, members: updatedMembers }
        const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
        const updatedBotData = { ...currentBotData, chats: updatedChats }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return updated
      },

      removeMember: (chatId: string, userId: string) => {
        const state = get()
        if (!state.token) return false
        
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return false

        const updatedMembers = new Map(chat.members)
        const result = updatedMembers.delete(userId)

        if (result) {
          const updatedChat = { ...chat, members: updatedMembers }
          const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
          const updatedBotData = { ...currentBotData, chats: updatedChats }

          set((state: BotState) => ({
            botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
          }))
        }

        return result
      },

      // Clear all messages of a specific chat (local only)
      clearChatHistory: (chatId: string) => {
        const state = get()
        if (!state.token) return false

        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const chat = currentBotData.chats.get(chatId)
        if (!chat) return false

        const updatedChat: Chat = {
          ...chat,
          messages: [],
          messageIds: new Set(),
          lastText: '',
          lastDate: 0,
          unread: 0
        }

        const updatedChats = new Map(currentBotData.chats).set(chatId, updatedChat)
        const updatedBotData = { ...currentBotData, chats: updatedChats }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return true
      },

      // Delete a chat entirely from current bot (local only)
      deleteChat: (chatId: string) => {
        const state = get()
        if (!state.token) return false

        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()

        const updatedChats = new Map(currentBotData.chats)
        const existed = updatedChats.delete(chatId)

        if (!existed) return false

        let nextActiveChatId = currentBotData.activeChatId
        if (nextActiveChatId === chatId) {
          const remaining = Array.from(updatedChats.values() as Iterable<Chat>)
            .sort((a: Chat, b: Chat) => (b.lastDate || 0) - (a.lastDate || 0))
          nextActiveChatId = remaining.length > 0 ? remaining[0].id : null
        }

        const updatedBotData = {
          ...currentBotData,
          chats: updatedChats,
          activeChatId: nextActiveChatId
        }

        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))

        return true
      },

      addRecentSticker: (sticker: StickerEntry) => {
        const state = get()
        if (!state.token) return
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const existing = currentBotData.recentStickers || []
        const filtered = existing.filter((s: StickerEntry) => s.file_id !== sticker.file_id)
        const normalized = { ...sticker, addedAt: sticker.addedAt || Date.now() }
        const updated = [normalized, ...filtered].slice(0, 50)
        const updatedBotData = { ...currentBotData, recentStickers: updated }
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },

      getRecentStickers: () => {
        const state = get()
        const data = state.getCurrentBotData()
        return data?.recentStickers || []
      },

      addFavoriteSticker: (sticker: StickerEntry) => {
        const state = get()
        if (!state.token) return
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const existing = currentBotData.favoriteStickers || []
        const filtered = existing.filter((s: StickerEntry) => s.file_id !== sticker.file_id)
        const normalized = { ...sticker, addedAt: sticker.addedAt || Date.now(), favorite: true }
        const updated = [normalized, ...filtered].slice(0, 100)
        const updatedBotData = { ...currentBotData, favoriteStickers: updated }
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },

      removeFavoriteSticker: (file_id: string) => {
        const state = get()
        if (!state.token) return
        const currentBotData = state.botDataMap.get(state.token) || createDefaultBotData()
        const existing = currentBotData.favoriteStickers || []
        const updated = existing.filter((s: StickerEntry) => s.file_id !== file_id)
        const updatedBotData = { ...currentBotData, favoriteStickers: updated }
        set((state: BotState) => ({
          botDataMap: new Map(state.botDataMap).set(state.token, updatedBotData)
        }))
      },

      getFavoriteStickers: () => {
        const state = get()
        const data = state.getCurrentBotData()
        return data?.favoriteStickers || []
      },

      clearAllData: () => set({
        botDataMap: new Map(),
        replyTo: null
      }),

      clearBotData: (botToken: string) => {
        set((state: BotState) => {
          const newBotDataMap = new Map(state.botDataMap)
          newBotDataMap.delete(botToken)
          return { botDataMap: newBotDataMap }
        })
      },

      getSortedChats: (): Chat[] => {
        const state = get()
        const currentBotData = state.getCurrentBotData()
        if (!currentBotData) return []
        
        return (Array.from(currentBotData.chats.values()) as Chat[])
          .sort((a: Chat, b: Chat) => (b.lastDate || 0) - (a.lastDate || 0))
      },

      // Current bot getters
      getCurrentBotData: (): BotData | undefined => {
        const state = get()
        if (!state.token || !state.botDataMap) return undefined
        return state.botDataMap.get(state.token)
      },

      getCurrentBotInfo: (): BotInfo => {
        const state = get()
        const botData = state.getCurrentBotData()
        return botData?.botInfo || createDefaultBotInfo()
      },

      getCurrentChats: (): Map<string, Chat> => {
        const state = get()
        const botData = state.getCurrentBotData()
        return botData?.chats || new Map()
      },

      getCurrentActiveChatId: (): string | null => {
        const state = get()
        const botData = state.getCurrentBotData()
        return botData?.activeChatId || null
      },

      getCurrentLastUpdateId: (): number => {
        const state = get()
        const botData = state.getCurrentBotData()
        return botData?.lastUpdateId || 0
      }
    }),
    {
      name: 'telegram-bot-store',
      partialize: (state: BotState) => ({
        token: state.token,
        theme: state.theme,
        language: state.language,
        preferences: state.preferences,
        // Serialize botDataMap as array of entries, and handle nested Sets/Maps
        botDataMap: state.botDataMap instanceof Map
          ? Array.from(state.botDataMap.entries()).map(([token, botData]) => [
              token,
              {
                ...botData,
                chats: botData.chats instanceof Map
                  ? Array.from(botData.chats.entries()).map(([chatId, chat]) => [
                      chatId,
                      {
                        ...chat,
                        messageIds: chat.messageIds instanceof Set
                          ? Array.from(chat.messageIds)
                          : Array.isArray(chat.messageIds) ? chat.messageIds : [],
                        members: chat.members instanceof Map
                          ? Array.from(chat.members.entries())
                          : []
                      }
                    ])
                  : [],
                recentStickers: botData.recentStickers || [],
                favoriteStickers: botData.favoriteStickers || []
              }
            ])
          : []
      }),
      onRehydrateStorage: () => (state?: BotState) => {
        console.debug('[BotStore] Rehydrating state...', state)
        if (!state) return
        
        try {
          // Ensure botDataMap is always initialized
          if (!state.botDataMap) {
            console.warn('[BotStore] botDataMap is missing, initializing new Map')
            state.botDataMap = new Map()
          } else if (Array.isArray(state.botDataMap)) {
            console.debug('[BotStore] Converting botDataMap array to Map', state.botDataMap)
            // Convert array back to Map on rehydration
            const botDataArray = state.botDataMap as any[]
            state.botDataMap = new Map(
              botDataArray.map(([token, botData]) => {
                // Ensure botData is valid
                if (!botData || typeof botData !== 'object') {
                  console.warn('[BotStore] Invalid botData for token', token)
                  return [token, createDefaultBotData()]
                }
                
                return [
                  token,
                  {
                    ...botData,
                    // Ensure chats is a Map and reconstruct nested Sets/Maps
                    chats: botData.chats && Array.isArray(botData.chats)
                      ? new Map(
                          (botData.chats as any[]).map(([chatId, chat]: [string, any]) => [
                            chatId,
                            {
                              ...chat,
                              messageIds: new Set(chat.messageIds || []),
                              members: new Map(chat.members || [])
                            }
                          ])
                        )
                      : new Map(),
                    // Ensure other required fields exist
                    botInfo: botData.botInfo || createDefaultBotInfo(),
                    lastUpdateId: botData.lastUpdateId || 0,
                    activeChatId: botData.activeChatId || null,
                    recentStickers: botData.recentStickers || [],
                    favoriteStickers: botData.favoriteStickers || []
                  }
                ]
              })
            )
            console.debug('[BotStore] Rehydration complete. Chats:', state.botDataMap)
          } else {
            console.debug('[BotStore] botDataMap is already a Map (or unknown type)', state.botDataMap)
          }
          
          // Ensure other required properties exist
          if (!state.preferences) {
            state.preferences = {
              autoScroll: true,
              sound: true,
              push: true
            }
          }
          
          if (!state.language) {
            state.language = 'vi'
          }
          
          if (!state.theme) {
            state.theme = 'system'
          }
        } catch (error) {
          console.error('[BotStore] Error during store rehydration:', error)
          // Reset to default state if rehydration fails
          if (state) {
            state.botDataMap = new Map()
            state.preferences = {
              autoScroll: true,
              sound: true,
              push: true
            }
            state.language = 'vi'
            state.theme = 'system'
          }
        }
      }
    }
  )
)