/**
 * localStorage-based storage for chat history by bot profile
 */

const CHAT_HISTORY_PREFIX = 'tg_bot_chat_';
const BOT_INFO_PREFIX = 'tg_bot_info_';
const UPDATE_ID_KEY = 'tg_last_update_id';
const THEME_PREF_KEY = 'tg_theme_preference';
const STICKERS_PREFIX = 'tg_bot_stickers_';

/**
 * Get bot profile ID from token
 */
function getBotProfileId(token) {
  if (!token) return null;
  const match = token.match(/^(\d+):/);
  return match ? match[1] : null;
}

/**
 * Save chat history for a bot profile
 */
export function saveChatHistory(token, chatData) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const key = CHAT_HISTORY_PREFIX + profileId;
  try {
    const arr = Array.from(chatData.entries()).map(([k, v]) => {
      const membersEntries = v.members instanceof Map ? Array.from(v.members.entries()) : [];
      return [
        k,
        {
          ...v,
          messageIds: Array.from(v.messageIds || []),
          members: membersEntries,
          permissions: { ...(v.permissions || {}) }
        }
      ];
    });
    localStorage.setItem(key, JSON.stringify(arr));
    return true;
  } catch (e) {
    console.error('Failed to save chat history:', e);
    return false;
  }
}

/**
 * Load chat history for a bot profile
 */
export function loadChatHistory(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return new Map();

  const key = CHAT_HISTORY_PREFIX + profileId;
  const value = localStorage.getItem(key);

  if (!value) return new Map();

  try {
    const data = JSON.parse(value);
    if (!Array.isArray(data)) return new Map();

    const chats = new Map();
    for (const [k, v] of data) {
      const members = Array.isArray(v.members) ? new Map(v.members.map(([id, info]) => [String(id), info])) : new Map();
      chats.set(k, {
        ...v,
        messageIds: new Set(v.messageIds || []),
        members,
        permissions: { ...(v.permissions || {}) }
      });
    }
    return chats;
  } catch (e) {
    console.error('Failed to load chat history:', e);
    return new Map();
  }
}

/**
 * Save bot info
 */
export function saveBotInfo(token, botInfo) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const key = BOT_INFO_PREFIX + profileId;
  try {
    localStorage.setItem(key, JSON.stringify(botInfo));
    return true;
  } catch (e) {
    console.error('Failed to save bot info:', e);
    return false;
  }
}

/**
 * Load bot info
 */
export function loadBotInfo(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return null;

  const key = BOT_INFO_PREFIX + profileId;
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

/**
 * Get last update ID
 */
export function getLastUpdateId() {
  const val = localStorage.getItem(UPDATE_ID_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
}

/**
 * Save last update ID
 */
export function saveLastUpdateId(updateId) {
  localStorage.setItem(UPDATE_ID_KEY, String(updateId));
}

/**
 * Clear chat history for a bot profile
 */
export function clearChatHistory(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const key = CHAT_HISTORY_PREFIX + profileId;
  localStorage.removeItem(key);
  return true;
}

/**
 * Save theme preference
 */
export function saveThemePreference(theme) {
  if (!theme) {
    localStorage.removeItem(THEME_PREF_KEY);
  } else {
    localStorage.setItem(THEME_PREF_KEY, theme);
  }
}

/**
 * Load theme preference
 */
export function loadThemePreference() {
  return localStorage.getItem(THEME_PREF_KEY);
}

/**
 * Save sticker to collection
 */
export function saveSticker(token, sticker) {
  const profileId = getBotProfileId(token);
  if (!profileId || !sticker || !sticker.file_id) return false;

  const key = STICKERS_PREFIX + profileId;
  const existingStickers = loadStickers(token);

  if (existingStickers.some(s => s.file_id === sticker.file_id)) {
    return true;
  }

  const updatedStickers = [sticker, ...existingStickers].slice(0, 100);

  try {
    localStorage.setItem(key, JSON.stringify(updatedStickers));
    return true;
  } catch (e) {
    console.error('Failed to save sticker:', e);
    return false;
  }
}

/**
 * Load stickers collection
 */
export function loadStickers(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return [];

  const key = STICKERS_PREFIX + profileId;
  const value = localStorage.getItem(key);
  if (!value) return [];

  try {
    const data = JSON.parse(value);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/**
 * Clear stickers collection
 */
export function clearStickers(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const key = STICKERS_PREFIX + profileId;
  localStorage.removeItem(key);
  return true;
}

/**
 * Dummy migration function (no longer needed)
 */
export function migrateFromLocalStorage() {
  // This function is no longer needed as we are now using localStorage by default.
  // It's kept for API compatibility to avoid breaking the main script.
  return true;
}
