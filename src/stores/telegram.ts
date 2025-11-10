import { Bot } from "grammy";
import type {
  TelegramState,
  TelegramActions,
  RichMessage,
  RichChat,
  Toast,
  BotInfo,
  BaseMessage,
  TextMessage,
  PhotoMessage,
  VideoMessage,
  AudioMessage,
  VoiceMessage,
  DocumentMessage,
  StickerMessage,
  ChatMember,
  RenderedMember,
} from "../types/types";
import type { Message } from "grammy/types";

// Helper functions
function initials(text: string): string {
  const t = (text || "").trim();
  if (!t) return "?";
  const words = t.split(/\s+/).filter(Boolean);
  const a = words[0]?.[0] || "";
  const b = words[1]?.[0] || "";
  return (a + b).toUpperCase() || a.toUpperCase() || "?";
}

function snippet(text: string): string {
  return (text || "").replace(/\s+/g, " ").slice(0, 60);
}

function senderNameFromMsg(msg: any): string {
  if (msg.from) {
    const n = [msg.from.first_name, msg.from.last_name]
      .filter(Boolean)
      .join(" ");
    return n || msg.from.username || "Người dùng";
  }
  if (msg.author_signature) return msg.author_signature;
  return "Hệ thống";
}

// Create the telegram store
function createTelegramStore() {
  // Initialize state
  let tokenValue = localStorage.getItem("token") || "";
  let token = tokenValue;
  let proxyBase = localStorage.getItem("proxyBase") || "";
  let chats = new Map<string, RichChat>();
  let currentChatId = <number | null>null;
  let replyTo = <number | null>null;
  let cachedFileUrls = new Map<string, string>();
  let toastQueue = <Toast[]>[];
  let botInfo = <BotInfo | null>null;
  let isConnected = false;
  let hasNewerMessages = false;
  let showSidebar = window.innerWidth > 768;
  let showSettings = false;
  let chatAdminStatus = new Map<string, boolean>();

  let bot: Bot | null = null;

  // Token management
  const setToken = (newToken: string) => {
    token = newToken;
    localStorage.setItem("token", newToken);
    // Clear existing data when token changes
    chats.clear();
    currentChatId = null;
    cachedFileUrls.clear();
    hasNewerMessages = false;
    loadState();
    if (newToken) {
      initializeBot();
    }
  };

  const getTokenPrompt = () => {
    const newToken = prompt("Enter your bot token:");
    if (!newToken) {
      throw new Error("Bot token is required");
    }
    setToken(newToken);
    return newToken;
  };

  // Persistence functions
  const saveState = () => {
    if (!token) return;
    const state = {
      proxyBase,
      chats: Array.from(chats.entries()).map(([k, v]) => [
        k,
        { ...v, messageIds: [...v.messageIds] },
      ]),
      currentChatId,
      cachedFileUrls: Array.from(cachedFileUrls.entries()),
    };
    localStorage.setItem(`telegram_${token}`, JSON.stringify(state));
  };

  const loadState = () => {
    if (!token) return;
    const saved = localStorage.getItem(`telegram_${token}`);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      proxyBase = parsed.proxyBase || "";

      // Restore chats
      if (parsed.chats) {
        const restoredChats = new Map<string, RichChat>();
        for (const [id, chatData] of parsed.chats) {
          const chat = chatData as any;
          restoredChats.set(id, {
            ...chat,
            messageIds: new Set(chat.messageIds),
          });
        }
        chats = restoredChats;
      }

      currentChatId = parsed.currentChatId || null;

      // Restore cached file URLs
      if (parsed.cachedFileUrls) {
        cachedFileUrls = new Map(parsed.cachedFileUrls);
      }
      hasNewerMessages = false;
    } catch (error) {
      console.error("Error loading state:", error);
    }
  };

  // Bot initialization
  const initializeBot = async () => {
    if (!token) return;

    try {
      bot = new Bot(token);

      // Apply proxy if configured
      if (proxyBase) {
        bot.api.config.use(async (prev, method, payload, signal) => {
          const url = `https://api.telegram.org/bot${token}/${method}`;
          const proxyUrl = proxyBase.replace(/\/+$/, "") + "/" + url;
          const response = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload || {}),
            signal: signal as AbortSignal | undefined,
          });
          return response.json();
        });
      }

      // Get bot info
      const gmInfo = await bot.api.getMe();
      botInfo = {
        id: gmInfo.id,
        username: gmInfo.username,
        first_name: gmInfo.first_name,
        can_join_groups: gmInfo.can_join_groups,
        can_read_all_group_messages: gmInfo.can_read_all_group_messages,
      };
      document.title = `${botInfo?.first_name} - Bottelegram` || "Bottelegram";

      // Set up message handlers
      bot.command("start", (ctx) =>
        ctx.reply(
          `Welcome! This bot is powered by https://bottelegram.web.app

        Channel @starfall_org
        Group @starfall_community`
        )
      );

      bot.on("message", async (ctx) => {
        const msg = ctx.message;
        if (!msg?.chat) return;

        await processIncomingMessage(msg.chat.id, msg, true);
      });

      await bot.start();
      isConnected = true;
    } catch (error) {
      console.error("Error initializing bot:", error);
      isConnected = false;
      enqueueToast(
        "Connection Error",
        "Failed to initialize bot. Please check your token.",
        "error"
      );
    }
  };

  // Process incoming messages
  const processIncomingMessage = async (
    chatId: number,
    msg: Message,
    incoming: boolean
  ) => {
    // Ensure chat exists
    if (!chats.has(chatId.toString())) {
      const chat = msg.chat;
      const isPrivate = chatId > 0;
      const title = isPrivate
        ? [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ") ||
          msg.chat.username ||
          "Người dùng"
        : msg.chat.title || chat.type || "Chat";

      chats.set(chatId.toString(), {
        id: chatId,
        type: chat.type,
        title,
        avatarText: initials(title),
        messages: [],
        messageIds: new Set(),
        lastText: "",
        lastDate: 0,
        unread: 0,
      });
    }

    const chat = chats.get(chatId.toString())!;
    const fromName = senderNameFromMsg(msg);

    // Create base message
    const base: BaseMessage = {
      id: msg.message_id,
      chatId,
      side: incoming ? "left" : "right",
      date: (msg.date || Math.floor(Date.now() / 1000)) * 1000,
      fromName,
      reply_to: msg.reply_to_message?.message_id,
      reply_preview: msg.reply_to_message
        ? snippet(
            msg.reply_to_message.text || msg.reply_to_message.caption || ""
          )
        : undefined,
    };

    let richMessage: RichMessage;

    // Normalize message based on type
    if (msg.text) {
      richMessage = { ...base, type: "text", text: msg.text } as TextMessage;
    } else if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      const mediaUrl = await getFileUrl(photo.file_id);
      richMessage = {
        ...base,
        type: "photo",
        mediaUrl,
        caption: msg.caption || "",
      } as PhotoMessage;
    } else if (msg.video) {
      const mediaUrl = await getFileUrl(msg.video.file_id);
      richMessage = {
        ...base,
        type: "video",
        mediaUrl,
        caption: msg.caption || "",
      } as VideoMessage;
    } else if (msg.audio) {
      const mediaUrl = await getFileUrl(msg.audio.file_id);
      richMessage = {
        ...base,
        type: "audio",
        mediaUrl,
        caption: msg.caption || "",
      } as AudioMessage;
    } else if (msg.voice) {
      const mediaUrl = await getFileUrl(msg.voice.file_id);
      richMessage = {
        ...base,
        type: "voice",
        mediaUrl,
        caption: msg.caption || "",
      } as VoiceMessage;
    } else if (msg.document) {
      const mediaUrl = await getFileUrl(msg.document.file_id);
      richMessage = {
        ...base,
        type: "document",
        mediaUrl,
        caption: msg.caption || "",
        fileName: msg.document.file_name || "Tệp",
      } as DocumentMessage;
    } else if (msg.sticker) {
      const sticker = msg.sticker;
      let stickerFormat: "webp" | "webm" | "tgs" = "tgs";
      let mediaUrl = "";

      if (sticker.is_video) {
        stickerFormat = "webm";
        mediaUrl = await getFileUrl(sticker.file_id);
      } else if (!sticker.is_animated) {
        stickerFormat = "webp";
        mediaUrl = await getFileUrl(sticker.file_id);
      }

      richMessage = {
        ...base,
        type: "sticker",
        mediaUrl,
        stickerFormat,
        emoji: sticker.emoji || "",
      } as StickerMessage;
    } else {
      richMessage = {
        ...base,
        type: "text",
        text: "[Không hiển thị loại nội dung này]",
      } as TextMessage;
    }

    // Add message to chat
    if (!chat.messageIds.has(richMessage.id)) {
      chat.messageIds.add(richMessage.id);
      chat.messages.push(richMessage);
      // Set last text for chat preview
      let lastText = "";
      if (richMessage.type === "text") {
        lastText = (richMessage as TextMessage).text;
      } else if ("caption" in richMessage && richMessage.caption) {
        lastText = richMessage.caption;
      } else if ("text" in richMessage) {
        lastText = (richMessage as any).text;
      } else {
        lastText = `[${richMessage.type}]`;
      }
      chat.lastText = lastText;
      chat.lastDate = richMessage.date;

      if (incoming) {
        if (chatId !== currentChatId) {
          chat.unread++;
          // Trigger toast notification for new messages
          enqueueToast(chat.title, chat.lastText, "info");
        } else {
          hasNewerMessages = true;
        }
      }

      saveState();
    }
  };

  // API helper functions
  const getFileUrl = async (fileId: string): Promise<string> => {
    if (cachedFileUrls.has(fileId)) {
      return cachedFileUrls.get(fileId)!;
    }

    if (!bot) throw new Error("Bot not initialized");

    try {
      const file = await bot.api.getFile(fileId);
      const baseUrl = "https://api.telegram.org";
      const url = `${baseUrl}/file/bot${token}/${file.file_path}`;

      if (proxyBase) {
        const proxyUrl = proxyBase.replace(/\/+$/, "") + "/" + url;
        cachedFileUrls.set(fileId, proxyUrl);
      } else {
        cachedFileUrls.set(fileId, url);
      }

      saveState();
      return cachedFileUrls.get(fileId)!;
    } catch (error) {
      console.error("Error getting file URL:", error);
      throw error;
    }
  };

  // Action functions
  const selectChat = (chatId: number) => {
    currentChatId = chatId;
    hasNewerMessages = false;
    const chat = chats.get(chatId.toString());
    if (chat) {
      chat.unread = 0;
      saveState();
    }
  };

  const markRead = (chatId: number) => {
    const chat = chats.get(chatId.toString());
    if (chat) {
      chat.unread = 0;
      saveState();
    }
  };

  const setHasNewerMessages = (value: boolean) => {
    hasNewerMessages = value;
  };

  // Audio feedback helper
  let audioContext: AudioContext | null = null;

  const playNotificationSound = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  };

  const enqueueToast = (
    title: string,
    body: string,
    type: Toast["type"] = "info",
    duration?: number
  ) => {
    const toast: Toast = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      body,
      type,
      timestamp: Date.now(),
      duration: duration || (type === "error" ? 8000 : 5000), // Errors stay longer
    };
    toastQueue.push(toast);

    // Play sound for success and new message toasts
    if (type === "success" || type === "info") {
      playNotificationSound();
    }
  };

  const dismissToast = (id: string) => {
    const index = toastQueue.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      toastQueue.splice(index, 1);
    }
  };

  const clearToasts = () => {
    toastQueue.length = 0;
  };

  const sendText = async (
    chatId: number,
    text: string,
    replyToMessageId?: number
  ) => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      const payload: any = { chat_id: chatId, text };
      if (replyToMessageId) {
        payload.reply_to_message_id = replyToMessageId;
      }

      const sent = await bot.api.sendMessage(chatId, text, {
        reply_to_message_id: replyToMessageId,
      });

      // Process the sent message as outgoing
      await processIncomingMessage(chatId, sent, false);
      hasNewerMessages = false;

      // Show success toast
      enqueueToast(
        "Message Sent",
        "Your message was delivered successfully",
        "success",
        2000
      );
    } catch (error) {
      console.error("Error sending message:", error);
      enqueueToast(
        "Send Failed",
        "Failed to send message. Please try again.",
        "error"
      );
      throw error;
    }
  };

  const sendChatAction = async (
    chatId: number,
    action: string
  ): Promise<void> => {
    if (!bot) throw new Error("Bot not initialized");
    await bot.api.sendChatAction(chatId, action as any);
  };

  const sendMedia = async (
    chatId: number,
    files: FileList,
    caption?: string,
    replyToMessageId?: number
  ) => {
    if (!bot) throw new Error("Bot not initialized");
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const payload: any = {
          chat_id: chatId,
          caption: caption || "",
        };
        if (replyToMessageId) {
          payload.reply_to_message_id = replyToMessageId;
        }

        let sent;
        const fileType = file.type.split("/")[0];

        if (fileType === "image") {
          sent = await bot.api.sendPhoto(chatId, file as any, payload);
        } else if (fileType === "video") {
          sent = await bot.api.sendVideo(chatId, file as any, payload);
        } else if (fileType === "audio") {
          sent = await bot.api.sendAudio(chatId, file as any, payload);
        } else {
          // Default to document for unknown types
          sent = await bot.api.sendDocument(chatId, file as any, payload);
        }

        // Process the sent message as outgoing
        await processIncomingMessage(chatId, sent, false);
      }

      hasNewerMessages = false;
      enqueueToast(
        "Media Sent",
        "Your media was delivered successfully",
        "success",
        2000
      );
    } catch (error) {
      console.error("Error sending media:", error);
      enqueueToast(
        "Send Failed",
        "Failed to send media. Please try again.",
        "error"
      );
      throw error;
    }
  };

  const deleteMessage = async (chatId: number, messageId: number) => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      await bot.api.deleteMessage(chatId, messageId);

      // Remove from local state
      const chat = chats.get(chatId.toString());
      if (chat) {
        chat.messages = chat.messages.filter((m) => m.id !== messageId);
        chat.messageIds.delete(messageId);
        saveState();
      }

      // Show success toast
      enqueueToast(
        "Message Deleted",
        "Message was deleted successfully",
        "success",
        2000
      );
    } catch (error) {
      console.error("Error deleting message:", error);
      enqueueToast(
        "Delete Failed",
        "Failed to delete message. Please try again.",
        "error"
      );
      throw error;
    }
  };

  const getChat = async (chatId: number) => {
    if (!bot) throw new Error("Bot not initialized");
    return bot.api.getChat(chatId);
  };

  const searchChat = async (query: string): Promise<string | null> => {
    if (!bot) throw new Error("Bot not initialized");

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      enqueueToast(
        "Invalid Query",
        "Please enter a chat ID or @username",
        "warning"
      );
      return null;
    }

    try {
      enqueueToast(
        "Searching",
        `Searching for ${trimmedQuery}...`,
        "info",
        3000
      );

      let chatId: string | number = trimmedQuery;

      if (trimmedQuery.startsWith("@")) {
        // If it starts with @, try to get the chat ID
        const chatInfo = await bot.api.getChat(trimmedQuery.slice(1));
        chatId = chatInfo.id;
      } else if (!isNaN(Number(trimmedQuery))) {
        // If it's a number, use it as-is
        chatId = trimmedQuery;
      } else {
        enqueueToast(
          "Invalid Format",
          "Please enter a numeric ID or @username",
          "warning"
        );
        return null;
      }

      // Try to get chat info
      const chatInfo = await bot.api.getChat(chatId);
      const targetId = chatInfo.id;
      // Check if chat already exists
      if (chats.has(targetId.toString())) {
        enqueueToast(
          "Already Added",
          chatInfo.title || "Chat already in sidebar",
          "info"
        );
        selectChat(targetId);
        saveState();
        return targetId.toString();
      }

      // Add new chat
      const isPrivate = chatInfo.type === "private";
      const title = isPrivate
        ? [chatInfo.first_name, chatInfo.last_name].filter(Boolean).join(" ") ||
          chatInfo.username ||
          "User"
        : chatInfo.title || chatInfo.type || "Chat";

      chats.set(targetId.toString(), {
        id: targetId,
        type: chatInfo.type,
        title,
        avatarText: initials(title),
        messages: [],
        messageIds: new Set(),
        lastText: "",
        lastDate: 0,
        unread: 0,
      });

      saveState();
      enqueueToast("Found!", title, "success");
      selectChat(targetId);

      return targetId.toString();
    } catch (error: any) {
      const errorMsg = error?.message || "Unknown error";
      const errorCode = error?.error_code || error?.code;

      if (errorCode === 400 || errorMsg.includes("400")) {
        enqueueToast("Not Found", "Chat ID or @username not found", "error");
      } else if (errorCode === 403 || errorMsg.includes("403")) {
        enqueueToast(
          "Access Denied",
          "Bot doesn't have access to this chat",
          "error"
        );
      } else if (errorMsg.includes("not found")) {
        enqueueToast("Not Found", "Chat not found", "error");
      } else {
        enqueueToast("Search Failed", errorMsg, "error");
      }

      return null;
    }
  };

  const getChatAdministrators = async (chatId: string) => {
    if (!bot) throw new Error("Bot not initialized");
    return bot.api.getChatAdministrators(chatId);
  };

  const clearReplyContext = () => {
    replyTo = null;
  };

  const setReplyContext = (messageId: number, preview: string) => {
    replyTo = messageId;
  };

  const fetchChatAdministrators = async (
    chatId: string
  ): Promise<RenderedMember[]> => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      const admins = await bot.api.getChatAdministrators(chatId);
      const rendered: RenderedMember[] = admins.map((member: ChatMember) => {
        const name =
          [member.user.first_name, member.user.last_name]
            .filter(Boolean)
            .join(" ") ||
          member.user.username ||
          "User";

        let badge = "";
        if (member.status === "creator") {
          badge = "👑 Creator";
        } else if (member.status === "administrator") {
          badge = "⭐ Administrator";
        } else {
          badge = member.status;
        }

        return {
          id: member.user.id,
          name,
          username: member.user.username,
          status: member.status,
          badge,
        };
      });

      // Remember that bot is admin in this chat
      chatAdminStatus.set(chatId, true);
      saveState();

      return rendered;
    } catch (error) {
      console.error("Error fetching chat administrators:", error);
      // Remember that bot is not admin in this chat
      chatAdminStatus.set(chatId, false);
      saveState();
      throw error;
    }
  };

  const kickMember = async (
    chatId: string,
    userId: number,
    userName: string
  ) => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      await bot.api.banChatMember(chatId, userId);
      enqueueToast(
        "✅ Success",
        `Kicked ${userName} from the group`,
        "success",
        3000
      );
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to kick member";
      enqueueToast("❌ Error", errorMsg, "error");
      throw error;
    }
  };

  const toggleAdminStatus = async (
    chatId: string,
    userId: number,
    promote: boolean,
    userName: string
  ) => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      const permissions = {
        can_manage_chat: promote,
        can_delete_messages: promote,
        can_manage_video_chats: promote,
        can_restrict_members: promote,
        can_promote_members: false,
        can_change_info: promote,
        can_invite_users: promote,
        can_pin_messages: promote,
      };

      await bot.api.promoteChatMember(chatId, userId, permissions);
      const action = promote ? "promoted" : "demoted";
      enqueueToast(
        "✅ Success",
        `${userName} has been ${action}`,
        "success",
        3000
      );
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to change admin status";
      enqueueToast("❌ Error", errorMsg, "error");
      throw error;
    }
  };

  const setProxyBase = (newProxyBase: string) => {
    proxyBase = newProxyBase;
    localStorage.setItem("proxyBase", newProxyBase);
    saveState();
    // Reinitialize bot with new proxy if token exists
    if (token) {
      bot = null;
      initializeBot();
    }
  };

  const testConnection = async () => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      const me = await bot.api.getMe();
      const username = me.username || "(no username)";
      const message = `✅ Connected: @${username} (ID: ${me.id})`;
      enqueueToast("Connection Test", message, "success", 3000);
      return message;
    } catch (error: any) {
      const errorMsg = error?.message || "Connection test failed";
      const message = `❌ Connection Failed: ${errorMsg}`;
      enqueueToast("Connection Error", message, "error");
      throw error;
    }
  };

  const deleteWebhook = async () => {
    if (!bot) throw new Error("Bot not initialized");

    try {
      await bot.api.deleteWebhook({ drop_pending_updates: false });
      enqueueToast(
        "Webhook Deleted",
        "✅ Webhook has been deleted successfully",
        "success",
        3000
      );
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to delete webhook";
      enqueueToast("Delete Webhook Error", `❌ ${errorMsg}`, "error");
      throw error;
    }
  };

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        enqueueToast(
          "Notifications Enabled",
          "✅ Browser notifications are now enabled",
          "success",
          3000
        );
        return true;
      } else if (permission === "denied") {
        enqueueToast(
          "Notifications Denied",
          "❌ Notification permission was denied",
          "warning",
          3000
        );
        return false;
      } else {
        enqueueToast(
          "Notifications Pending",
          "⏳ Notification permission is pending",
          "info",
          3000
        );
        return false;
      }
    } catch (error: any) {
      const errorMsg =
        error?.message || "Failed to request notification permission";
      enqueueToast("Notification Error", `❌ ${errorMsg}`, "error");
      throw error;
    }
  };

  const clearChatHistoryForToken = () => {
    if (!token) return;
    localStorage.removeItem(`telegram_${token}`);
    chats.clear();
    currentChatId = null;
    cachedFileUrls.clear();
    hasNewerMessages = false;
    chatAdminStatus.clear();
    enqueueToast(
      "Data Cleared",
      "✅ Local chat history has been cleared",
      "success",
      2000
    );
  };

  // Initialize state on creation
  loadState();

  const actions: TelegramActions = {
    initializeBot,
    selectChat,
    markRead,
    saveState,
    loadState,
    setHasNewerMessages,
    enqueueToast,
    dismissToast,
    clearToasts,
    sendText,
    sendMedia,
    sendChatAction,
    deleteMessage,
    getChat,
    searchChat,
    getChatAdministrators,
    getFileUrl,
    clearReplyContext,
    setReplyContext,
    setToken,
    getTokenPrompt,
    fetchChatAdministrators,
    kickMember,
    toggleAdminStatus,
    setProxyBase,
    testConnection,
    deleteWebhook,
    requestNotifications,
    clearChatHistoryForToken,
  };

  return {
    // State
    token,
    proxyBase,
    chats,
    currentChatId,
    replyTo,
    cachedFileUrls,
    toastQueue,
    botInfo,
    isConnected,
    hasNewerMessages,
    showSidebar,
    showSettings,
    chatAdminStatus,
    // Actions
    ...actions,
  };
}

export const telegramStore = createTelegramStore();
