/**
 * Application state management
 */

export let token = '';
export let chats = new Map();
export let activeChatId = null;
export let lastUpdateId = 0;
export let bot = {
  id: null,
  username: null,
  name: null
};
export let replyTo = null;

/**
 * Update token
 */
export function setToken(newToken) {
  token = newToken;
}

/**
 * Update chats
 */
export function setChats(newChats) {
  chats = newChats;
}

/**
 * Add or update a chat
 */
export function setChat(chatId, chatData) {
  chats.set(String(chatId), chatData);
}

/**
 * Get a specific chat
 */
export function getChat(chatId) {
  return chats.get(String(chatId));
}

/**
 * Remove a chat
 */
export function removeChat(chatId) {
  chats.delete(String(chatId));
}

/**
 * Update active chat
 */
export function setActiveChatId(chatId) {
  activeChatId = String(chatId) || null;
}

/**
 * Update last update ID
 */
export function setLastUpdateId(id) {
  lastUpdateId = id;
}

/**
 * Update bot info
 */
export function setBotInfo(newBot) {
  bot = { ...newBot };
}

/**
 * Set reply context
 */
export function setReplyTo(msgId) {
  replyTo = msgId;
}

/**
 * Clear reply context
 */
export function clearReplyTo() {
  replyTo = null;
}

/**
 * Clear all app state for new bot
 */
export function clearAllState() {
  chats.clear();
  activeChatId = null;
  replyTo = null;
  bot = {
    id: null,
    username: null,
    name: null
  };
}

/**
 * Get all chats sorted by last message date
 */
export function getSortedChats() {
  return Array.from(chats.values()).sort((a, b) => (b.lastDate || 0) - (a.lastDate || 0));
}

/**
 * Add message to chat
 */
export function addMessageToChat(chatId, message) {
  const chat = getChat(chatId);
  if (!chat) return false;

  const chatIdStr = String(chatId);
  if (chat.messageIds.has(message.id)) {
    return false; // Already exists
  }

  chat.messageIds.add(message.id);
  chat.messages.push(message);
  chat.lastText = message.type === 'text' ? message.text : (message.caption || message.text || '[' + message.type + ']');
  chat.lastDate = message.date;

  return true;
}

/**
 * Remove message from chat
 */
export function removeMessageFromChat(chatId, messageId) {
  const chat = getChat(chatId);
  if (!chat) return false;

  const index = chat.messages.findIndex(m => m.id === messageId);
  if (index === -1) return false;

  chat.messages.splice(index, 1);
  chat.messageIds.delete(messageId);

  return true;
}

/**
 * Get chat or create it
 */
export function getOrCreateChat(chatId, initialData = {}) {
  let chat = getChat(chatId);
  if (!chat) {
    chat = {
      id: String(chatId),
      type: initialData.type || 'unknown',
      title: initialData.title || 'Chat ' + chatId,
      avatarText: initialData.avatarText || '?',
      messages: [],
      messageIds: new Set(),
      lastText: '',
      lastDate: 0,
      unread: 0,
      ...initialData
    };
    setChat(chatId, chat);
  }
  return chat;
}
