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
export interface BotData {
  botInfo: BotInfo
  chats: Map<string, Chat>
  lastUpdateId: number
  activeChatId: string | null
}

export interface BotState {
  // Current connection state
  token: string
  isConnected: boolean
  isPolling: boolean
  
  // Bot data per token (key: bot token, value: BotData)
  botDataMap: Map<string, BotData>
  
  // UI state
  replyTo: string | null
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
  setBotInfo: (info: Partial<BotInfo>) => void
  setActiveChatId: (chatId: string | null) => void
  setReplyTo: (messageId: string | null) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: 'vi' | 'en') => void
  updatePreferences: (prefs: Partial<BotState['preferences']>) => void
  setLastUpdateId: (updateId: number) => void
  
  // Chat actions - these now work with current bot
  getOrCreateChat: (chatId: string, initialData?: Partial<Chat>) => Chat
  addMessage: (chatId: string, message: Message) => boolean
  removeMessage: (chatId: string, messageId: number | string) => boolean
  upsertMember: (chatId: string, member: Partial<ChatMember> & { id: string }) => ChatMember | null
  removeMember: (chatId: string, userId: string) => boolean
  
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
      botDataMap: new Map(),
      replyTo: null,
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
        // Serialize botDataMap as array of entries
        botDataMap: Array.from(state.botDataMap.entries()).map(([token, botData]) => [
          token,
          {
            ...botData,
            chats: Array.from(botData.chats.entries())
          }
        ])
      }),
      onRehydrateStorage: () => (state?: BotState) => {
        if (!state) return
        
        try {
          // Ensure botDataMap is always initialized
          if (!state.botDataMap) {
            state.botDataMap = new Map()
          } else if (Array.isArray(state.botDataMap)) {
            // Convert array back to Map on rehydration
            const botDataArray = state.botDataMap as any[]
            state.botDataMap = new Map(
              botDataArray.map(([token, botData]) => {
                // Ensure botData is valid
                if (!botData || typeof botData !== 'object') {
                  return [token, createDefaultBotData()]
                }
                
                return [
                  token,
                  {
                    ...botData,
                    // Ensure chats is a Map
                    chats: botData.chats && Array.isArray(botData.chats)
                      ? new Map(botData.chats)
                      : new Map(),
                    // Ensure other required fields exist
                    botInfo: botData.botInfo || createDefaultBotInfo(),
                    lastUpdateId: botData.lastUpdateId || 0,
                    activeChatId: botData.activeChatId || null
                  }
                ]
              })
            )
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
          console.error('Error during store rehydration:', error)
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