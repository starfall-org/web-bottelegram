/**
 * Cookie-based storage for chat history by bot profile
 */

const CHAT_HISTORY_PREFIX = 'tg_bot_chat_';
const BOT_INFO_PREFIX = 'tg_bot_info_';
const UPDATE_ID_KEY = 'tg_last_update_id';
const THEME_PREF_KEY = 'tg_theme_preference';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Create safe cookie value from object
 */
function sanitizeValue(val) {
  try {
    return encodeURIComponent(JSON.stringify(val));
  } catch (e) {
    return '';
  }
}

/**
 * Parse cookie value back to object
 */
function parseValue(val) {
  try {
    return JSON.parse(decodeURIComponent(val));
  } catch (e) {
    return null;
  }
}

/**
 * Get cookie value by name
 */
function getCookie(name) {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(nameEQ)) {
      return c.substring(nameEQ.length);
    }
  }
  return null;
}

/**
 * Set cookie
 */
function setCookie(name, value, days = COOKIE_MAX_AGE / (24 * 60 * 60)) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax`;
}

/**
 * Delete cookie
 */
function deleteCookie(name) {
  setCookie(name, '', -1);
}

/**
 * Get bot profile ID from token (hash or full token)
 */
function getBotProfileId(token) {
  if (!token) return null;
  // Use the numeric part of the token as profile ID for better organization
  const match = token.match(/^(\d+):/);
  if (match) {
    return match[1];
  }
  // Fallback: hash the token
  return String(simpleHash(token));
}

/**
 * Simple hash function for token normalization
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Save chat history for a bot profile
 */
export function saveChatHistory(token, chatData) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const cookieName = CHAT_HISTORY_PREFIX + profileId;
  const arr = Array.from(chatData.entries()).map(([k, v]) => {
    let membersSource;
    if (v.members instanceof Map) {
      membersSource = v.members;
    } else if (Array.isArray(v.members)) {
      membersSource = new Map(v.members);
    } else if (v.members && typeof v.members === 'object') {
      membersSource = new Map(Object.entries(v.members));
    } else {
      membersSource = new Map();
    }
    const membersEntries = Array.from(membersSource.entries());
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

  try {
    const encoded = sanitizeValue(arr);
    setCookie(cookieName, encoded);
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

  const cookieName = CHAT_HISTORY_PREFIX + profileId;
  const value = getCookie(cookieName);

  if (!value) return new Map();

  const data = parseValue(value);
  if (!Array.isArray(data)) return new Map();

  const chats = new Map();
  for (const [k, v] of data) {
    let members = new Map();
    if (Array.isArray(v.members)) {
      members = new Map(v.members.map(([id, info]) => [String(id), info]));
    } else if (v.members && typeof v.members === 'object') {
      members = new Map(Object.entries(v.members).map(([id, info]) => [String(id), info]));
    }

    chats.set(k, {
      ...v,
      messageIds: new Set(v.messageIds || []),
      members,
      permissions: { ...(v.permissions || {}) }
    });
  }
  return chats;
}

/**
 * Save bot info
 */
export function saveBotInfo(token, botInfo) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const cookieName = BOT_INFO_PREFIX + profileId;
  try {
    const encoded = sanitizeValue(botInfo);
    setCookie(cookieName, encoded);
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

  const cookieName = BOT_INFO_PREFIX + profileId;
  const value = getCookie(cookieName);

  if (!value) return null;
  return parseValue(value);
}

/**
 * Get last update ID
 */
export function getLastUpdateId() {
  const val = getCookie(UPDATE_ID_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
}

/**
 * Save last update ID
 */
export function saveLastUpdateId(updateId) {
  setCookie(UPDATE_ID_KEY, String(updateId));
}

/**
 * Clear chat history for a bot profile
 */
export function clearChatHistory(token) {
  const profileId = getBotProfileId(token);
  if (!profileId) return false;

  const cookieName = CHAT_HISTORY_PREFIX + profileId;
  deleteCookie(cookieName);
  return true;
}

/**
 * Migrate data from localStorage to cookies
 * This preserves existing chat history
 */
export function migrateFromLocalStorage() {
  const storageToken = localStorage.getItem('bot_token');
  if (!storageToken) return false;

  // Try to migrate old chat history
  const oldStorageKey = 'chat_history_' + storageToken;
  const oldData = localStorage.getItem(oldStorageKey);

  if (oldData) {
    try {
      const arr = JSON.parse(oldData);
      const chats = new Map();
      for (const [k, v] of arr) {
        chats.set(k, {
          ...v,
          messageIds: new Set(v.messageIds || [])
        });
      }
      saveChatHistory(storageToken, chats);
      return true;
    } catch (e) {
      console.warn('Migration failed:', e);
      return false;
    }
  }

  return false;
}

/**
 * Get all stored bot profiles
 */
export function getAllBotProfiles() {
  const profiles = [];
  const cookies = document.cookie.split(';');

  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(CHAT_HISTORY_PREFIX)) {
      const profileId = c.split('=')[0].substring(CHAT_HISTORY_PREFIX.length);
      profiles.push(profileId);
    }
  }

  return profiles;
}

/**
 * Save theme preference
 */
export function saveThemePreference(theme) {
  if (!theme) {
    deleteCookie(THEME_PREF_KEY);
    return;
  }
  setCookie(THEME_PREF_KEY, encodeURIComponent(theme));
}

/**
 * Load theme preference
 */
export function loadThemePreference() {
  const val = getCookie(THEME_PREF_KEY);
  return val ? decodeURIComponent(val) : null;
}
