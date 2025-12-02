import { useEffect } from 'react'
import { useBotStore, type BotState } from '@/store/botStore'
import { botService, type TelegramUpdate } from '@/services/botService'

export function useBotConnection() {
  const {
    token,
    setConnected,
    setPolling,
    setBotInfo,
    getCurrentLastUpdateId,
    setLastUpdateId,
    addMessage,
    getOrCreateChat
  } = useBotStore()
  
  const lastUpdateId = getCurrentLastUpdateId()

  useEffect(() => {
    if (!token) {
      // Stop polling if no token
      botService.stop()
      setConnected(false)
      setPolling(false)
      return
    }

    const initializeBot = async () => {
      try {
        // Configure bot service
        const proxyPrefix = localStorage.getItem('cors_proxy') || undefined
        botService.setConfig({ token, proxyPrefix })

        // Test connection by getting bot info
        const response = await botService.getMe()
        
        if (response.ok && response.result) {
          const botInfo = response.result
          setBotInfo({
            id: botInfo.id,
            username: botInfo.username || null,
            name: botInfo.first_name || null,
            description: null,
            shortDescription: null,
            commands: []
          })
          
          // Try to get commands
          try {
            const commandsResponse = await botService.getMyCommands()
            if (commandsResponse.ok && commandsResponse.result) {
              setBotInfo({
                commands: commandsResponse.result.map(cmd => ({
                  command: cmd.command,
                  description: cmd.description
                }))
              })
            }
          } catch (error) {
            console.warn('Failed to get bot commands:', error)
          }

          setConnected(true)

          // Set last update ID from store
          if (lastUpdateId > 0) {
            botService.setLastUpdateId(lastUpdateId)
          }

          // Start polling for updates
          await botService.startPolling(handleUpdates)
          setPolling(true)
        } else {
          console.error('Failed to connect to bot:', response.description)
          setConnected(false)
          setPolling(false)
        }
      } catch (error) {
        console.error('Bot initialization error:', error)
        setConnected(false)
        setPolling(false)
      }
    }

    const handleUpdates = (updates: TelegramUpdate[]) => {
      updates.forEach(update => {
        // Update last update ID in store
        setLastUpdateId(update.update_id)

        // Process different types of updates
        if (update.message) {
          processMessage(update.message)
        } else if (update.edited_message) {
          processMessage(update.edited_message, true)
        } else if (update.channel_post) {
          processMessage(update.channel_post)
        } else if (update.edited_channel_post) {
          processMessage(update.edited_channel_post, true)
        }
      })
    }

    const processMessage = (message: any, isEdited = false) => {
      const chatId = message.chat.id.toString()
      
      // Get or create chat
      const chatData = {
        type: message.chat.type,
        title: message.chat.title || `${message.chat.first_name || ''} ${message.chat.last_name || ''}`.trim() || 'Private Chat',
        avatarText: message.chat.title ? message.chat.title.charAt(0).toUpperCase() : 
                   (message.chat.first_name || message.chat.username || 'U').charAt(0).toUpperCase()
      }
      
      getOrCreateChat(chatId, chatData)

      // Process message content
      let messageType: 'text' | 'photo' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' = 'text'
      let text = message.text || message.caption || ''
      let mediaUrl = ''
      let fileName = ''
      
      if (message.photo) {
        messageType = 'photo'
        // Get largest photo
        const photo = message.photo[message.photo.length - 1]
        mediaUrl = photo.file_id
      } else if (message.video) {
        messageType = 'video'
        mediaUrl = message.video.file_id
        fileName = message.video.file_name || 'video'
      } else if (message.audio) {
        messageType = 'audio'
        mediaUrl = message.audio.file_id
        fileName = message.audio.file_name || 'audio'
      } else if (message.voice) {
        messageType = 'voice'
        mediaUrl = message.voice.file_id
      } else if (message.document) {
        messageType = 'document'
        mediaUrl = message.document.file_id
        fileName = message.document.file_name || 'document'
      } else if (message.sticker) {
        messageType = 'sticker'
        mediaUrl = message.sticker.file_id
      }

      // Create message object
      const newMessage = {
        id: message.message_id,
        type: messageType,
        side: message.from?.is_bot === true ? 'left' : 'right',
        text,
        mediaUrl,
        fileName,
        date: message.date * 1000, // Convert to milliseconds
        fromId: message.from?.id,
        fromName: message.from?.first_name || message.from?.username || 'Unknown',
        fromUsername: message.from?.username,
        reply_to: message.reply_to_message?.message_id,
        reply_preview: message.reply_to_message?.text?.substring(0, 50)
      }

      // Add message to store
      addMessage(chatId, newMessage)
    }

    // Initialize bot connection
    initializeBot()

    // Cleanup on unmount or token change
    return () => {
      botService.stop()
      setPolling(false)
    }
  }, [token]) // Re-run when token changes

  return {
    isConnected: useBotStore((state: BotState) => state.isConnected),
    isPolling: useBotStore((state: BotState) => state.isPolling),
    botInfo: useBotStore((state: BotState) => state.getCurrentBotInfo())
  }
}