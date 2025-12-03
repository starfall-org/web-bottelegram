import { Bot, GrammyError, HttpError, InputFile } from 'grammy'

export interface BotConfig {
  token: string
  proxyPrefix?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: any
  edited_message?: any
  channel_post?: any
  edited_channel_post?: any
}

export class BotService {
  private bot: Bot | null = null
  private config: BotConfig | null = null
  private isPolling = false
  private lastUpdateId = 0
  private pollingInterval: number | null = null
  private updateCallback: ((updates: TelegramUpdate[]) => void) | null = null

  constructor() {}

  setConfig(config: BotConfig) {
    this.config = config
    if (this.bot) {
      this.stop()
    }
    this.bot = new Bot(config.token)
    this.setupBot()
  }

  private setupBot() {
    if (!this.bot) return

    // Setup error handling
    this.bot.catch((err) => {
      const ctx = err.ctx
      console.error(`Error while handling update ${ctx.update.update_id}:`)
      const e = err.error
      if (e instanceof GrammyError) {
        console.error("Error in request:", e.description)
      } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e)
      } else {
        console.error("Unknown error:", e)
      }
    })
  }

  async getMe() {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const me = await this.bot.api.getMe()
      return { ok: true, result: me }
    } catch (error) {
      return { 
        ok: false, 
        description: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async getUpdates(offset?: number, timeout = 0): Promise<{ ok: boolean; result?: TelegramUpdate[]; description?: string; error_code?: number }> {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const updates = await this.bot.api.getUpdates({
        offset,
        timeout,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post']
      })
      return { ok: true, result: updates }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error',
        error_code: error.error_code || 0
      }
    }
  }

  async sendMessage(chatId: string | number, text: string, options: {
    reply_to_message_id?: number
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      console.debug(`[BotService] Sending message to ${chatId}:`, text)
      const message = await this.bot.api.sendMessage(chatId, text, options)
      console.debug('[BotService] Message sent:', message)
      return { ok: true, result: message }
    } catch (error: any) {
      console.error('[BotService] Send message error:', error)
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendPhoto(chatId: string | number, photo: string | InputFile, options: {
    caption?: string
    reply_to_message_id?: number
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const message = await this.bot.api.sendPhoto(chatId, photo, options)
      return { ok: true, result: message }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendVideo(chatId: string | number, video: string | InputFile, options: {
    caption?: string
    reply_to_message_id?: number
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const message = await this.bot.api.sendVideo(chatId, video, options)
      return { ok: true, result: message }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendAudio(chatId: string | number, audio: string | InputFile, options: {
    caption?: string
    reply_to_message_id?: number
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const message = await this.bot.api.sendAudio(chatId, audio, options)
      return { ok: true, result: message }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendDocument(chatId: string | number, document: string | InputFile, options: {
    caption?: string
    reply_to_message_id?: number
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const message = await this.bot.api.sendDocument(chatId, document, options)
      return { ok: true, result: message }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendSticker(chatId: string | number, sticker: string | InputFile) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const message = await this.bot.api.sendSticker(chatId, sticker)
      return { ok: true, result: message }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async deleteMessage(chatId: string | number, messageId: number) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const result = await this.bot.api.deleteMessage(chatId, messageId)
      return { ok: true, result }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async sendChatAction(chatId: string | number, action: string) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const result = await this.bot.api.sendChatAction(chatId, action as any)
      return { ok: true, result }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async getFile(fileId: string) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const file = await this.bot.api.getFile(fileId)
      return { ok: true, result: file }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async getChat(chatId: string | number) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const chat = await this.bot.api.getChat(chatId)
      return { ok: true, result: chat }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async getChatAdministrators(chatId: string | number) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const admins = await this.bot.api.getChatAdministrators(chatId)
      return { ok: true, result: admins }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async banChatMember(chatId: string | number, userId: number, options: {
    until_date?: number
    revoke_messages?: boolean
  } = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const result = await this.bot.api.banChatMember(chatId, userId, options)
      return { ok: true, result }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async promoteChatMember(chatId: string | number, userId: number, permissions: any = {}) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const result = await this.bot.api.promoteChatMember(chatId, userId, {
        can_manage_chat: permissions.can_manage_chat !== false,
        can_delete_messages: permissions.can_delete_messages !== false,
        can_manage_video_chats: permissions.can_manage_video_chats !== false,
        can_restrict_members: permissions.can_restrict_members !== false,
        can_promote_members: permissions.can_promote_members || false,
        can_change_info: permissions.can_change_info !== false,
        can_invite_users: permissions.can_invite_users !== false,
        can_pin_messages: permissions.can_pin_messages !== false,
        is_anonymous: permissions.is_anonymous || false
      })
      return { ok: true, result }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async deleteWebhook(dropPendingUpdates = false) {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const result = await this.bot.api.deleteWebhook({ drop_pending_updates: dropPendingUpdates })
      return { ok: true, result }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  async getMyCommands() {
    if (!this.bot) throw new Error('Bot not initialized')
    
    try {
      const commands = await this.bot.api.getMyCommands()
      return { ok: true, result: commands }
    } catch (error: any) {
      return { 
        ok: false, 
        description: error.description || error.message || 'Unknown error' 
      }
    }
  }

  getFileUrl(filePath: string): string {
    if (!this.config) throw new Error('Bot not configured')
    
    const baseUrl = `https://api.telegram.org/file/bot${this.config.token}/${filePath}`
    return this.config.proxyPrefix ? 
      `${this.config.proxyPrefix.replace(/\/+$/, '')}/${baseUrl}` : 
      baseUrl
  }

  async startPolling(
    updateCallback?: (updates: TelegramUpdate[]) => void,
    statusCallback?: (status: 'idle' | 'polling' | 'error', error?: string | null) => void
  ) {
    if (!this.bot) throw new Error('Bot not initialized')
    if (this.isPolling) return

    this.updateCallback = updateCallback || null
    this.isPolling = true
    
    if (statusCallback) statusCallback('polling')

    const poll = async () => {
      if (!this.isPolling) return

      try {
        console.debug('[BotService] Polling for updates...')
        const response = await this.getUpdates(this.lastUpdateId + 1, 30)
        
        if (response.ok) {
          if (statusCallback) statusCallback('polling')
          
          if (response.result && response.result.length > 0) {
            const updates = response.result
            console.debug(`[BotService] Received ${updates.length} updates`)
            
            // Update lastUpdateId
            this.lastUpdateId = updates[updates.length - 1].update_id
            
            // Call update callback if provided
            if (this.updateCallback) {
              this.updateCallback(updates)
            }
          }
        } else {
          console.error('[BotService] Polling failed:', response.description)
          if (statusCallback) statusCallback('error', response.description)
          
          // Handle 409 Conflict specifically
          if (response.error_code === 409) {
            console.error('[BotService] Conflict detected, stopping polling')
            this.stop()
            if (statusCallback) statusCallback('error', 'Conflict: Another bot instance is running')
            return
          }
        }
      } catch (error: any) {
        console.error('[BotService] Polling error:', error)
        if (statusCallback) statusCallback('error', error.message || 'Unknown error')
        // Continue polling even if there's an error, unless stopped
      }

      // Schedule next poll
      if (this.isPolling) {
        this.pollingInterval = setTimeout(poll, 1000) as any
      }
    }

    // Start polling
    poll()
  }

  stop() {
    this.isPolling = false
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval)
      this.pollingInterval = null
    }
    if (this.bot) {
      try {
        this.bot.stop()
      } catch (error) {
        console.error('Error stopping bot:', error)
      }
    }
  }

  isRunning(): boolean {
    return this.isPolling
  }

  setLastUpdateId(updateId: number) {
    this.lastUpdateId = updateId
  }

  getLastUpdateId(): number {
    return this.lastUpdateId
  }
}

// Global instance
export const botService = new BotService()