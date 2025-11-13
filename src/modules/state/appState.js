/**
 * Application state management
 */

import { initials } from '../utils/helpers.js';

export let token = '';
export let chats = new Map();
export let activeChatId = null;
export let lastUpdateId = 0;
export let bot = createDefaultBot();
export let replyTo = null;
export let theme = 'system';

function createDefaultPermissions() {
  return {
    canDeleteMessages: false,
    canPromoteMembers: false,
    canRestrictMembers: false,
    canChangeInfo: false,
    canInviteUsers: false
  };
}

function createDefaultBot() {
  return {
    id: null,
    username: null,
    name: null,
    description: null,
    shortDescription: null,
    commands: []
  };
}

function normalizeChat(chat) {
  if (!chat) return chat;

  if (!(chat.messageIds instanceof Set)) {
    chat.messageIds = new Set(chat.messageIds || []);
  }

  if (!(chat.members instanceof Map)) {
    let entries = [];
    if (Array.isArray(chat.members)) {
      entries = chat.members;
    } else if (chat.members && typeof chat.members === 'object') {
      entries = Object.entries(chat.members);
    }
    chat.members = new Map(entries.map(([id, data]) => [String(id), data]));
  }

  if (!Array.isArray(chat.messages)) {
    chat.messages = [];
  }

  chat.permissions = { ...createDefaultPermissions(), ...(chat.permissions || {}) };

  if (!chat.avatarText) {
    chat.avatarText = '?';
  }

  return chat;
}

function normalizeMember(member) {
  if (!member || !member.id) return null;
  const id = String(member.id);
  const first = member.first_name || member.firstName || '';
  const last = member.last_name || member.lastName || '';
  const displayName = member.displayName || [first, last].filter(Boolean).join(' ') || member.username || member.name || 'Người dùng';
  const avatarText = member.avatarText || initials(displayName);
  const status = member.status || (member.isCreator ? 'creator' : member.isAdmin ? 'administrator' : 'member');

  return {
    id,
    firstName: first || null,
    lastName: last || null,
    username: member.username || null,
    displayName,
    avatarText,
    status,
    isAdmin: member.isAdmin ?? (status === 'administrator' || status === 'creator'),
    isCreator: member.isCreator ?? status === 'creator',
    isBot: member.isBot ?? member.is_bot ?? false,
    joinedDate: member.joinedDate || member.joined_date || null,
    lastSeen: member.lastSeen || Date.now(),
    raw: member.raw || null
  };
}

function memberSortWeight(member) {
  if (member.isCreator) return 0;
  if (member.status === 'administrator' || member.isAdmin) return 1;
  if (member.status === 'moderator') return 2;
  return 3;
}

/**
 * Update token
 */
export function setToken(newToken) {
  token = newToken;
}

/**
 * Update theme
 */
export function setTheme(newTheme) {
  theme = newTheme;
}

/**
 * Update chats
 */
export function setChats(newChats) {
  const normalized = new Map();
  if (newChats && typeof newChats.forEach === 'function') {
    newChats.forEach((value, key) => {
      const chat = normalizeChat({ ...value, id: String(value.id || key) });
      normalized.set(String(key), chat);
    });
  }
  chats = normalized;
}

/**
 * Add or update a chat
 */
export function setChat(chatId, chatData) {
  const chat = normalizeChat({ ...chatData, id: String(chatId) });
  chats.set(String(chatId), chat);
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
  bot = { ...bot, ...newBot };
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
  chats = new Map();
  activeChatId = null;
  replyTo = null;
  lastUpdateId = 0;
  bot = createDefaultBot();
}

/**
 * Get all chats sorted by last message date
 */
export function getSortedChats() {
  return Array.from(chats.values()).sort((a, b) => (b.lastDate || 0) - (a.lastDate || 0));
}

/**
 * Get members map for a chat
 */
export function getChatMembers(chatId) {
  const chat = getChat(chatId);
  return chat?.members || new Map();
}

/**
 * Get members array sorted by role and name
 */
export function getChatMembersArray(chatId) {
  const members = getChatMembers(chatId);
  return Array.from(members.values()).sort((a, b) => {
    const diff = memberSortWeight(a) - memberSortWeight(b);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '', 'vi', { sensitivity: 'base' });
  });
}

/**
 * Get member info
 */
export function getChatMember(chatId, userId) {
  const chat = getChat(chatId);
  if (!chat || !userId) return null;
  return chat.members.get(String(userId)) || null;
}

/**
 * Upsert member info
 */
export function upsertMember(chatId, memberData) {
  if (!chatId || !memberData) return null;
  const chat = getOrCreateChat(chatId);
  const normalized = normalizeMember(memberData);
  if (!normalized) return null;

  const existing = chat.members.get(normalized.id) || {};
  const updated = {
    ...existing,
    ...normalized,
    avatarText: normalized.avatarText || existing.avatarText || initials(normalized.displayName || ''),
    lastSeen: normalized.lastSeen || existing.lastSeen || Date.now()
  };

  chat.members.set(normalized.id, updated);
  return updated;
}

/**
 * Remove member info
 */
export function removeMember(chatId, userId) {
  const chat = getChat(chatId);
  if (!chat || !userId) return false;
  return chat.members.delete(String(userId));
}

/**
 * Update stored permissions for bot in chat
 */
export function setChatPermissions(chatId, permissions) {
  if (!chatId) return;
  const chat = getOrCreateChat(chatId);
  chat.permissions = { ...chat.permissions, ...permissions };
}

/**
 * Get stored permissions for bot in chat
 */
export function getChatPermissions(chatId) {
  const chat = getChat(chatId);
  if (!chat) return createDefaultPermissions();
  return { ...createDefaultPermissions(), ...(chat.permissions || {}) };
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
    const base = {
      id: String(chatId),
      type: initialData.type || 'unknown',
      title: initialData.title || 'Chat ' + chatId,
      avatarText: initialData.avatarText || (initialData.title ? initials(initialData.title) : '?'),
      messages: [],
      messageIds: new Set(),
      members: new Map(),
      permissions: createDefaultPermissions(),
      lastText: '',
      lastDate: 0,
      unread: 0,
      ...initialData
    };
    setChat(chatId, base);
    chat = getChat(chatId);
  } else {
    chat = normalizeChat(chat);
  }
  return chat;
}
