/**
 * Main application entry point
 */

import './styles/main.css';
import * as botAPI from './modules/api/bot.js';
import * as appState from './modules/state/appState.js';
import * as storage from './modules/storage/localStorage.js';
import * as render from './modules/ui/render.js';
import * as dom from './modules/ui/dom.js';
import * as notifications from './modules/notifications/notifications.js';
import * as admin from './modules/admin/admin.js';
import * as i18n from './modules/i18n/i18n.js';
import { fmtTime, initials, snippet, senderNameFromMsg, senderUsernameFromMsg, scrollToBottom, isAtBottom, formatDateTime } from './modules/utils/helpers.js';

// Get DOM elements
let els = null;

// Setup polling
let pollTimer = null;
let actionTimer = null;
let isPolling = false;
let pollQueue = [];

const DEFAULT_PREFERENCES = {
  autoScroll: true,
  sound: true,
  push: true
};
let preferences = { ...DEFAULT_PREFERENCES };
let themePreference = 'system';
let systemThemeMatcher = null;
let currentMemberId = null;
let activeMembersTab = 'members';

/**
 * Initialize application
 */
function init() {
  els = dom.getCachedElements();

  // Initialize i18n
  i18n.initI18n();
  updateAllUIText();

  systemThemeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemThemeMatcher.addEventListener) {
    systemThemeMatcher.addEventListener('change', handleSystemThemeChange);
  } else if (systemThemeMatcher.addListener) {
    systemThemeMatcher.addListener(handleSystemThemeChange);
  }

  const storedTheme = storage.loadThemePreference();
  applyTheme(storedTheme || 'system', false);

  preferences = loadPreferences();
  applyPreferencesToUI();
  notifications.initNotifications().catch(() => {});

  // Hide sidebar close button on desktop
  updateSidebarCloseButton();
  window.addEventListener('resize', updateSidebarCloseButton);

  // Migrate from localStorage if needed
  storage.migrateFromLocalStorage();

  // Load stored token
  const storedToken = localStorage.getItem('bot_token');
  const storedProxy = localStorage.getItem('cors_proxy') || '';

  if (storedToken) {
    appState.setToken(storedToken);
    botAPI.setToken(storedToken);
    botAPI.setProxy(storedProxy);

    // Load saved chat history
    const savedChats = storage.loadChatHistory(storedToken);
    appState.setChats(savedChats);

    // Restore last active chat
    const lastActiveChat = localStorage.getItem('last_active_chat');
    if (lastActiveChat && savedChats.has(lastActiveChat)) {
      appState.setActiveChatId(lastActiveChat);
    }

    // Load last update ID
    const lastUpdateId = storage.getLastUpdateId();
    appState.setLastUpdateId(lastUpdateId);

    // Load bot info
    const savedBotInfo = storage.loadBotInfo(storedToken);
    if (savedBotInfo) {
      appState.setBotInfo(savedBotInfo);
      updateBotInfo();
    }

    // Connect to bot
    connect();
  } else {
    // Show settings dialog
    els.overlayEl.classList.remove('hidden');
  }

  // Setup event listeners
  setupEventListeners();

  // Initial render - this will render chat list and active chat if available
  renderUI();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Settings
  els.settingsBtn.addEventListener('click', openSettings);
  els.saveBtn.addEventListener('click', saveSettings);
  els.cancelBtn.addEventListener('click', closeSettings);
  els.testBtn.addEventListener('click', testConnection);
  els.deleteWebhookBtn.addEventListener('click', deleteWebhook);
  els.notifBtn.addEventListener('click', handleNotificationRequest);

  // Theme controls
  els.themeToggleBtn?.addEventListener('click', cycleThemePreference);
  els.themeOptionLight?.addEventListener('click', () => applyTheme('light'));
  els.themeOptionDark?.addEventListener('click', () => applyTheme('dark'));
  els.themeOptionSystem?.addEventListener('click', () => applyTheme('system'));

  // Language controls
  els.langOptionEn?.addEventListener('click', () => switchLanguage('en'));
  els.langOptionVi?.addEventListener('click', () => switchLanguage('vi'));

  // Preferences toggles
  els.prefAutoScrollEl?.addEventListener('change', (e) => updatePreference('autoScroll', e.target.checked));
  els.prefSoundEl?.addEventListener('change', (e) => updatePreference('sound', e.target.checked));
  els.prefPushEl?.addEventListener('change', (e) => updatePreference('push', e.target.checked));

  // Chat list / open chat
  els.openChatBtnEl?.addEventListener('click', openChatFromInput);
  els.openChatInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openChatFromInput();
  });

  // Sidebar
  els.menuToggleEl.addEventListener('click', () => {
    els.sidebarEl.classList.toggle('hidden-mobile');
  });

  els.sidebarCloseBtn?.addEventListener('click', () => {
    els.sidebarEl.classList.toggle('hidden-mobile');
  });

  // Messages
  els.messagesEl.addEventListener('click', handleMessageClick);
  els.newMsgBtn.addEventListener('click', () => {
    scrollToBottom(els.messagesEl);
    els.newMsgBtn.style.display = 'none';
  });

  // Composer
  els.sendBtn.addEventListener('click', sendMessage);
  els.inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  els.inputEl.addEventListener('focus', startChatAction);
  els.inputEl.addEventListener('blur', stopChatAction);

  // Sticker panel
  if (els.stickerBtn) {
    els.stickerBtn.addEventListener('click', toggleStickerPanel);
  }
  if (els.closeStickerBtn) {
    els.closeStickerBtn.addEventListener('click', closeStickerPanel);
  }

  // User actions menu
  els.closeUserActionsBtn.addEventListener('click', closeUserActionsMenu);
  els.copyIdBtn.addEventListener('click', () => performUserAction('copyId'));
  els.copyUsernameBtn.addEventListener('click', () => performUserAction('copyUsername'));
  els.kickUserBtn.addEventListener('click', () => performUserAction('kick'));
  els.promoteUserBtn.addEventListener('click', () => performUserAction('promote'));
  els.moderateUserBtn.addEventListener('click', () => performUserAction('moderate'));
  els.demoteUserBtn.addEventListener('click', () => performUserAction('demote'));
  els.restrictUserBtn.addEventListener('click', () => performUserAction('restrict'));

  // Close user actions menu when clicking outside
  document.addEventListener('click', (e) => {
    if (els.userActionsMenu && !els.userActionsMenu.classList.contains('hidden')) {
      const isClickInsideMenu = els.userActionsMenu.contains(e.target);
      const isClickOnSender = e.target.classList.contains('sender-name');
      
      if (!isClickInsideMenu && !isClickOnSender) {
        closeUserActionsMenu();
      }
    }
  });

  // Close user actions menu with Escape key
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape' || e.key === 'Esc') && els.userActionsMenu && !els.userActionsMenu.classList.contains('hidden')) {
      closeUserActionsMenu();
    }
  });

  // Attachments
  els.attachBtn.addEventListener('click', () => {
    if (!appState.activeChatId) {
      alert(i18n.t('pleaseSelectChat'));
      return;
    }
    stopChatAction();
    els.fileInputEl.value = '';
    els.fileInputEl.accept = '*/*';
    els.fileInputEl.click();
  });

  els.fileInputEl.addEventListener('change', () => {
    const file = els.fileInputEl.files[0];
    if (file) sendFile(file);
  });

  // Reply
  els.cancelReply.addEventListener('click', clearReplyContext);

  // Members & group management
  els.membersBtnEl.addEventListener('click', openMembersDialog);
  els.closeMembersBtn.addEventListener('click', closeMembersDialog);
  els.membersOverlayEl.addEventListener('click', (e) => {
    if (e.target === els.membersOverlayEl) {
      closeMembersDialog();
    }
  });
  els.membersTabBtn?.addEventListener('click', () => switchMembersTab('members'));
  els.groupTabBtn?.addEventListener('click', () => switchMembersTab('group'));
  els.refreshMembersBtn?.addEventListener('click', () => refreshMembersList(true));
  els.saveGroupBtn?.addEventListener('click', saveGroupInfo);
  els.membersListEl?.addEventListener('click', handleMemberListClick);

  // Sidebar controls
  els.chatListEl?.addEventListener('contextmenu', handleChatListContextMenu);

  // Member modal
  els.closeMemberModalBtn?.addEventListener('click', closeMemberModal);
  els.memberModalEl?.addEventListener('click', (e) => {
    if (e.target === els.memberModalEl) {
      closeMemberModal();
    }
  });
  els.memberPromoteBtn?.addEventListener('click', () => changeMemberRole('admin'));
  els.memberModeratorBtn?.addEventListener('click', () => changeMemberRole('moderator'));
  els.memberDemoteBtn?.addEventListener('click', () => changeMemberRole('member'));
  els.memberRestrictBtn?.addEventListener('click', openRestrictModal);
  els.memberKickBtn?.addEventListener('click', kickMemberFromModal);

  // Restrict modal
  els.closeRestrictModalBtn?.addEventListener('click', closeRestrictModal);
  els.restrictModalEl?.addEventListener('click', (e) => {
    if (e.target === els.restrictModalEl) {
      closeRestrictModal();
    }
  });
  els.applyRestrictBtn?.addEventListener('click', applyRestrictPermissions);
}

/**
 * Render UI
 */
function renderUI() {
  const chat = appState.getChat(appState.activeChatId);

  render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);

  if (chat) {
    render.updateChatHeader(chat, els.headerTitleEl, els.activeAvatarEl);
    render.updateMembersButton(chat, els.membersBtnEl);
    const permissions = appState.getChatPermissions(chat.id);
    render.renderChatMessages(chat, els.messagesEl, deleteMessage, { 
      canDeleteOthers: permissions.canDeleteMessages,
      isGroupChat: chat.type === 'group' || chat.type === 'supergroup',
      onUserClick: handleUserClick
    });
    if (preferences.autoScroll) {
      scrollToBottom(els.messagesEl);
    }
  } else {
    render.updateChatHeader(null, els.headerTitleEl, els.activeAvatarEl);
    render.renderChatMessages(null, els.messagesEl);
  }
}

/**
 * Open a chat
 */
function openChat(chatId) {
  appState.setActiveChatId(chatId);
  localStorage.setItem('last_active_chat', chatId);
  const chat = appState.getChat(chatId);

  if (chat) {
    chat.unread = 0;
    els.inputEl.disabled = false;
    els.sendBtn.disabled = false;
    els.attachBtn.disabled = false;
    els.inputEl.placeholder = i18n.t('enterMessage');
    els.inputEl.focus();

    // Hide sidebar on mobile
    if (window.innerWidth <= 768) {
      els.sidebarEl.classList.add('hidden-mobile');
    }
  } else {
    els.inputEl.disabled = true;
    els.sendBtn.disabled = true;
    els.attachBtn.disabled = true;
    els.inputEl.placeholder = i18n.t('noConversationSelected');
  }

  els.newMsgBtn.style.display = 'none';

  renderUI();
  ensureChatPermissions(chatId).catch(() => {});
}

/**
 * Open settings dialog
 */
function openSettings() {
  els.tokenInputEl.value = appState.token;
  els.proxyInputEl.value = localStorage.getItem('cors_proxy') || '';
  els.overlayEl.classList.remove('hidden');
}

function closeSettings() {
  els.overlayEl.classList.add('hidden');
}

/**
 * Save settings
 */
function saveSettings() {
  const token = els.tokenInputEl.value.trim();
  const proxy = els.proxyInputEl.value.trim();

  if (!token) {
    els.settingsHintEl.textContent = i18n.t('enterToken');
    return;
  }

  // If token changed, clear current chat state
  if (token !== appState.token) {
    storage.clearChatHistory(appState.token);
    appState.clearAllState();
  }

  appState.setToken(token);
  botAPI.setToken(token);
  botAPI.setProxy(proxy);

  localStorage.setItem('bot_token', token);
  if (proxy) localStorage.setItem('cors_proxy', proxy);

  closeSettings();
  connect();
}

/**
 * Test connection
 */
async function testConnection() {
  if (!appState.token) {
    els.settingsHintEl.textContent = i18n.t('tokenMissing');
    return;
  }

  try {
    const me = await botAPI.getMe();
    if (me.ok) {
      els.settingsHintEl.textContent = i18n.t('connectionOk', { 
        username: me.result.username || i18n.t('connectionNoUsername'), 
        id: me.result.id 
      });
    } else {
      els.settingsHintEl.textContent = i18n.t('connectionFailed', { error: me.description || i18n.t('unknownError') });
    }
  } catch (e) {
    els.settingsHintEl.textContent = i18n.t('connectionNetworkError', { error: e.message });
  }
}

/**
 * Delete webhook
 */
async function deleteWebhook() {
  if (!appState.token) return;

  try {
    const res = await botAPI.deleteWebhook(false);
    els.settingsHintEl.textContent = res.ok ? i18n.t('webhookDeleted') : i18n.t('webhookDeleteFailed', { error: res.description || i18n.t('unknownError') });
  } catch (e) {
    els.settingsHintEl.textContent = i18n.t('webhookDeleteNetworkError', { error: e.message });
  }
}

/**
 * Request notifications permission
 */
async function handleNotificationRequest() {
  try {
    const permission = await notifications.requestNotifications();
    const granted = permission === 'granted';
    els.settingsHintEl.textContent = granted ? i18n.t('notificationsGranted') : i18n.t('notificationsDenied');
    updatePreference('push', granted);
  } catch (e) {
    els.settingsHintEl.textContent = i18n.t('error') + ': ' + e.message;
  }
}

/**
 * Update stored UI preference
 */
function updatePreference(key, value, persist = true) {
  if (!(key in DEFAULT_PREFERENCES)) return;
  preferences = { ...preferences, [key]: value };
  if (persist) {
    savePreferences();
  }
  applyPreferencesToUI();
}

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem('ui_preferences') || '{}');
    return { ...DEFAULT_PREFERENCES, ...stored };
  } catch (e) {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences() {
  try {
    localStorage.setItem('ui_preferences', JSON.stringify(preferences));
  } catch (e) {
    console.warn('Không thể lưu tuỳ chọn UI:', e);
  }
}

function applyPreferencesToUI() {
  if (els.prefAutoScrollEl) {
    els.prefAutoScrollEl.checked = !!preferences.autoScroll;
  }
  if (els.prefSoundEl) {
    els.prefSoundEl.checked = !!preferences.sound;
  }
  if (els.prefPushEl) {
    els.prefPushEl.checked = !!preferences.push;
  }
}

function resolveTheme(preference) {
  if (preference === 'system') {
    return systemThemeMatcher && systemThemeMatcher.matches ? 'dark' : 'light';
  }
  return preference;
}

function applyTheme(preference, persist = true) {
  themePreference = preference;
  appState.setTheme(preference);
  if (persist) {
    storage.saveThemePreference(preference);
  }
  const resolved = resolveTheme(preference);
  document.body.dataset.theme = resolved;
  document.body.dataset.themePreference = preference;
  highlightThemeOption(preference);
  updateThemeToggleIcon(resolved);
}

function highlightThemeOption(preference) {
  const mapping = {
    light: els.themeOptionLight,
    dark: els.themeOptionDark,
    system: els.themeOptionSystem
  };
  Object.entries(mapping).forEach(([key, button]) => {
    if (!button) return;
    if (key === preference) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

function updateThemeToggleIcon(resolvedTheme) {
  if (!els.themeToggleBtn) return;
  els.themeToggleBtn.textContent = resolvedTheme === 'dark' ? '🌙' : '🌞';
}

function cycleThemePreference() {
  const order = ['light', 'dark', 'system'];
  const currentIndex = order.indexOf(themePreference);
  const nextPreference = order[(currentIndex + 1) % order.length];
  applyTheme(nextPreference);
}

function handleSystemThemeChange() {
  if (themePreference === 'system') {
    applyTheme('system', false);
  }
}

/**
 * Switch language
 */
function switchLanguage(lang) {
  i18n.setLanguage(lang);
  updateAllUIText();
  highlightLanguageOption(lang);
  renderUI();
}

/**
 * Highlight active language option
 */
function highlightLanguageOption(lang) {
  const mapping = {
    en: els.langOptionEn,
    vi: els.langOptionVi
  };
  Object.entries(mapping).forEach(([key, button]) => {
    if (!button) return;
    if (key === lang) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Update all UI text with current language
 */
function updateAllUIText() {
  // Update all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = i18n.t(key);
    }
  });

  // Update placeholders
  if (els.openChatInputEl) {
    els.openChatInputEl.placeholder = i18n.t('enterChatId');
  }
  if (els.inputEl) {
    if (appState.activeChatId) {
      els.inputEl.placeholder = i18n.t('enterMessage');
    } else {
      els.inputEl.placeholder = i18n.t('noConversationSelected');
    }
  }
  if (els.tokenInputEl) {
    els.tokenInputEl.placeholder = i18n.t('botToken');
  }
  if (els.proxyInputEl) {
    els.proxyInputEl.placeholder = i18n.t('corsProxy');
  }

  // Update titles
  if (els.settingsBtn) {
    els.settingsBtn.title = i18n.t('settingsTitle');
    els.settingsBtn.setAttribute('aria-label', i18n.t('settingsTitle'));
  }
  if (els.themeToggleBtn) {
    els.themeToggleBtn.title = i18n.t('changeTheme');
    els.themeToggleBtn.setAttribute('aria-label', i18n.t('changeTheme'));
  }
  if (els.openChatBtnEl) {
    els.openChatBtnEl.title = i18n.t('openChat');
    els.openChatBtnEl.setAttribute('aria-label', i18n.t('openChat'));
  }
  if (els.sendBtn) {
    els.sendBtn.title = i18n.t('send');
    els.sendBtn.setAttribute('aria-label', i18n.t('send'));
  }
  if (els.attachBtn) {
    els.attachBtn.title = i18n.t('attach');
    els.attachBtn.setAttribute('aria-label', i18n.t('attach'));
  }
  if (els.stickerBtn) {
    els.stickerBtn.title = i18n.t('sticker');
    els.stickerBtn.setAttribute('aria-label', i18n.t('sticker'));
  }
  if (els.membersBtnEl) {
    els.membersBtnEl.title = i18n.t('manageMembers');
    els.membersBtnEl.setAttribute('aria-label', i18n.t('manageMembers'));
  }
  if (els.cancelReply) {
    els.cancelReply.setAttribute('aria-label', i18n.t('cancelReply'));
  }

  // Highlight current language
  highlightLanguageOption(i18n.getCurrentLanguage());
}

function getSupportedFeatures() {
  return [
    i18n.t('featureThemes'),
    i18n.t('featurePushNotifications'),
    i18n.t('featureChatHistory'),
    i18n.t('featureMemberManagement'),
    i18n.t('featureSendMessages')
  ];
}

/**
 * Connect to bot
 */
async function connect() {
  if (!appState.token) {
    els.statusEl.textContent = i18n.t('statusDisconnected');
    return;
  }

  els.statusEl.textContent = i18n.t('statusConnecting');

  try {
    const me = await botAPI.getMe();
    if (me.ok) {
      const [commandsRes, descriptionRes, shortDescriptionRes] = await Promise.allSettled([
        botAPI.getMyCommands(),
        botAPI.getMyDescription(),
        botAPI.getMyShortDescription()
      ]);

      const commands = commandsRes.status === 'fulfilled' && commandsRes.value?.ok ? commandsRes.value.result || [] : [];
      const description = descriptionRes.status === 'fulfilled' && descriptionRes.value?.ok ? descriptionRes.value.result?.description || null : null;
      const shortDescription = shortDescriptionRes.status === 'fulfilled' && shortDescriptionRes.value?.ok ? shortDescriptionRes.value.result?.short_description || null : null;

      const botInfo = {
        id: me.result.id,
        username: me.result.username || null,
        name: [me.result.first_name, me.result.last_name].filter(Boolean).join(' ') || me.result.username || 'Bot',
        commands,
        description,
        shortDescription
      };
      appState.setBotInfo(botInfo);
      storage.saveBotInfo(appState.token, botInfo);
      updateBotInfo();
      startPolling();
      // Ensure UI is rendered after successful connection
      renderUI();
    } else {
      els.statusEl.textContent = 'Lỗi getMe: ' + (me.description || 'Không rõ');
    }
  } catch (e) {
    els.statusEl.textContent = 'CORS hoặc mạng lỗi khi getMe';
  }
}

/**
 * Update bot info display
 */
function updateBotInfo() {
  const bot = appState.bot;
  if (bot.username) {
    els.botInfoEl.textContent = '@' + bot.username;
  } else if (bot.id) {
    els.botInfoEl.textContent = 'Bot ID: ' + bot.id;
  } else {
    els.botInfoEl.textContent = '';
  }

  if (els.botDetailNameEl) {
    els.botDetailNameEl.textContent = bot.name || '—';
  }
  if (els.botDetailUsernameEl) {
    els.botDetailUsernameEl.textContent = bot.username ? '@' + bot.username : '—';
  }
  if (els.botDetailIdEl) {
    els.botDetailIdEl.textContent = bot.id || '—';
  }
  if (els.botDetailDescriptionEl) {
    els.botDetailDescriptionEl.textContent = bot.description || '—';
  }
  if (els.botDetailShortDescriptionEl) {
    els.botDetailShortDescriptionEl.textContent = bot.shortDescription || '—';
  }

  if (els.botCommandsListEl) {
    els.botCommandsListEl.innerHTML = '';
    if (Array.isArray(bot.commands) && bot.commands.length) {
      bot.commands.forEach((cmd) => {
        const item = document.createElement('li');
        item.textContent = `/${cmd.command}${cmd.description ? ' — ' + cmd.description : ''}`;
        els.botCommandsListEl.appendChild(item);
      });
    } else {
      const item = document.createElement('li');
      item.textContent = 'Không có lệnh mặc định';
      els.botCommandsListEl.appendChild(item);
    }
  }

  if (els.botFeatureListEl) {
    els.botFeatureListEl.innerHTML = '';
    getSupportedFeatures().forEach((feature) => {
      const item = document.createElement('li');
      item.textContent = feature;
      els.botFeatureListEl.appendChild(item);
    });
  }

  highlightThemeOption(themePreference);
  updateThemeToggleIcon(resolveTheme(themePreference));
}

/**
 * Start polling
 */
function startPolling() {
  clearInterval(pollTimer);
  isPolling = true;
  pollOnceSequential();
  els.statusEl.textContent = 'Đang nhận cập nhật...';
}

/**
 * Stop polling
 */
function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
  isPolling = false;
  pollQueue = [];
}

/**
 * Sequential polling with delay
 */
async function pollOnceSequential() {
  if (!isPolling) return;
  
  try {
    await pollOnce();
    
    // Wait 1 second before next poll
    setTimeout(() => {
      if (isPolling) {
        pollOnceSequential();
      }
    }, 1000);
  } catch (e) {
    console.error('Polling error:', e);
    // Wait 2 seconds on error before retrying
    setTimeout(() => {
      if (isPolling) {
        pollOnceSequential();
      }
    }, 2000);
  }
}

/**
 * Poll for updates once
 */
async function pollOnce() {
  try {
    const res = await botAPI.getUpdates(appState.lastUpdateId || undefined);

    if (!res.ok) {
      els.statusEl.textContent = i18n.t('getUpdatesError', { error: res.description || i18n.t('unknownError') });
      if (String(res.error_code) === '409') {
        els.statusEl.textContent = i18n.t('webhookActive');
      }
      return;
    }

    for (const upd of res.result || []) {
      appState.setLastUpdateId(upd.update_id + 1);
      storage.saveLastUpdateId(upd.update_id + 1);

      const msg = upd.message || upd.edited_message || upd.channel_post || upd.edited_channel_post;
      if (!msg || !msg.chat) continue;

      await processMessage(msg);
    }

    els.statusEl.textContent = i18n.t('statusConnected');
  } catch (e) {
    els.statusEl.textContent = i18n.t('corsError');
    throw e;
  }
}

/**
 * Process incoming message
 */
async function processMessage(msg) {
  const chatData = msg.chat;
  const chatId = String(chatData.id);
  const isPrivate = chatData.type === 'private';
  const fallbackTitle = isPrivate ? [chatData.first_name, chatData.last_name].filter(Boolean).join(' ') || chatData.username || i18n.t('user') : chatData.title || chatData.type || 'Chat';

  const chat = appState.getOrCreateChat(chatId, {
    type: chatData.type,
    title: fallbackTitle,
    avatarText: initials(fallbackTitle)
  });

  if (chatData.title && chatData.title !== chat.title) {
    chat.title = chatData.title;
    chat.avatarText = initials(chatData.title);
    if (appState.activeChatId === chatId) {
      render.updateChatHeader(chat, els.headerTitleEl, els.activeAvatarEl);
    }
  }

  if (chatData.type && chatData.type !== chat.type) {
    chat.type = chatData.type;
  }

  const timestampMs = (msg.date || Math.floor(Date.now() / 1000)) * 1000;

  if (msg.from) {
    appState.upsertMember(chatId, {
      id: msg.from.id,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name,
      username: msg.from.username,
      isBot: msg.from.is_bot,
      status: msg.from.is_bot ? 'bot' : 'member',
      lastSeen: timestampMs
    });
  }

  if (Array.isArray(msg.new_chat_members) && msg.new_chat_members.length) {
    msg.new_chat_members.forEach((m) => {
      appState.upsertMember(chatId, {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        username: m.username,
        isBot: m.is_bot,
        status: m.is_bot ? 'bot' : 'member',
        joinedDate: timestampMs,
        lastSeen: timestampMs
      });
    });
  }

  if (msg.left_chat_member) {
    appState.removeMember(chatId, msg.left_chat_member.id);
  }

  const isActiveChat = appState.activeChatId === chatId;
  const shouldStickToBottom = isActiveChat ? isAtBottom(els.messagesEl) : false;
  const isFromBot = msg.from && appState.bot.id && msg.from.id === appState.bot.id;

  const baseMessage = {
    id: msg.message_id,
    side: isFromBot ? 'right' : 'left',
    date: timestampMs,
    fromId: msg.from ? msg.from.id : null,
    fromName: senderNameFromMsg(msg),
    fromUsername: senderUsernameFromMsg(msg),
    reply_to: msg.reply_to_message && msg.reply_to_message.message_id,
    reply_preview: msg.reply_to_message && snippet(msg.reply_to_message.text || msg.reply_to_message.caption || '')
  };

  let message;

  if (msg.text) {
    message = { ...baseMessage, type: 'text', text: msg.text };
  } else if (msg.photo) {
    const p = msg.photo[msg.photo.length - 1];
    const url = await getFileUrl(p.file_id);
    message = { ...baseMessage, type: 'photo', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.video) {
    const url = await getFileUrl(msg.video.file_id);
    message = { ...baseMessage, type: 'video', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.audio) {
    const url = await getFileUrl(msg.audio.file_id);
    message = { ...baseMessage, type: 'audio', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.voice) {
    const url = await getFileUrl(msg.voice.file_id);
    message = { ...baseMessage, type: 'voice', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.document) {
    const url = await getFileUrl(msg.document.file_id);
    message = { ...baseMessage, type: 'document', mediaUrl: url, caption: msg.caption || '', fileName: msg.document.file_name || 'Tệp' };
  } else if (msg.sticker) {
    const st = msg.sticker;
    let fmt = 'tgs';
    let url = '';

    if (st.is_video) {
      fmt = 'webm';
      url = await getFileUrl(st.file_id);
    } else if (!st.is_animated) {
      fmt = 'webp';
      url = await getFileUrl(st.file_id);
    }

    // Save sticker to collection
    const stickerData = {
      file_id: st.file_id,
      url: url,
      emoji: st.emoji || '',
      is_animated: st.is_animated,
      is_video: st.is_video,
      set_name: st.set_name,
      width: st.width,
      height: st.height
    };
    storage.saveSticker(appState.token, stickerData);

    message = { ...baseMessage, type: 'sticker', mediaUrl: url, stickerFormat: fmt, emoji: st.emoji || '' };
  } else {
    message = { ...baseMessage, type: 'text', text: i18n.t('unsupportedContent') };
  }

  if (appState.addMessageToChat(chatId, message)) {
    if (isActiveChat) {
      const permissions = appState.getChatPermissions(chatId);
      const chat = appState.getChat(chatId);
      const isGroupChat = chat && (chat.type === 'group' || chat.type === 'supergroup');
      
      render.renderMessage(message, els.messagesEl, deleteMessage, { 
        canDeleteOthers: permissions.canDeleteMessages,
        isGroupChat,
        onUserClick: handleUserClick
      });
      
      if (preferences.autoScroll && shouldStickToBottom) {
        scrollToBottom(els.messagesEl);
        els.newMsgBtn.style.display = 'none';
      } else {
        render.maybeShowNewMsgBtn(els.newMsgBtn, els.messagesEl);
      }
    } else {
      chat.unread = (chat.unread || 0) + 1;
      notifications.notifyNewMessage(chat, message, els.toastsEl, {
        playSound: preferences.sound,
        push: preferences.push,
        scrollToMessage: window.scrollToMessage
      });
    }

    render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
    if (isActiveChat) {
      render.updateMembersButton(chat, els.membersBtnEl);
    }

    storage.saveChatHistory(appState.token, appState.chats);
  }
}

/**
 * Get bot permissions for current chat
 */
async function ensureChatPermissions(chatId) {
  if (!chatId || !appState.bot.id) {
    return appState.getChatPermissions(chatId);
  }
  try {
    const res = await botAPI.getChatMember(chatId, appState.bot.id);
    if (res.ok) {
      const member = res.result;
      const permissions = {
        canDeleteMessages: !!member.can_delete_messages,
        canPromoteMembers: !!member.can_promote_members,
        canRestrictMembers: !!member.can_restrict_members,
        canChangeInfo: !!member.can_change_info,
        canInviteUsers: !!member.can_invite_users
      };
      appState.setChatPermissions(chatId, permissions);
      return permissions;
    }
  } catch (e) {
    console.warn('Không lấy được quyền bot:', e);
  }
  return appState.getChatPermissions(chatId);
}

/**
 * Get file URL from Telegram
 */
async function getFileUrl(fileId) {
  try {
    const info = await botAPI.getFile(fileId);
    if (!info.ok) throw new Error(info.description);
    return botAPI.fullFileUrl(info.result.file_path);
  } catch (e) {
    console.error('Failed to get file URL:', e);
    return '';
  }
}

/**
 * Handle message click (for reply or member action)
 */
function handleMessageClick(e) {
  if (e.target.closest('.msg-action-btn')) return;

  if (e.target.closest('.msg-sender-name')) {
    const senderEl = e.target.closest('.msg-sender-name');
    const userId = parseInt(senderEl.dataset.userId, 10);
    if (userId && canManageMembers()) {
      showMemberModal(userId);
      return;
    }
  }

  const msgEl = e.target.closest('.message');
  if (!msgEl) return;

  const msgId = msgEl.dataset.msgId;
  const prev = msgEl.innerText.slice(0, 30).replace('/ /g', ' ');
  setReplyContext(msgId, prev);
}

/**
 * Check if bot can manage members
 */
function canManageMembers() {
  if (!appState.activeChatId) return false;
  const chat = appState.getChat(appState.activeChatId);
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return false;
  const permissions = appState.getChatPermissions(appState.activeChatId);
  return permissions.canRestrictMembers || permissions.canPromoteMembers;
}

/**
 * Set reply context
 */
function setReplyContext(msgId, preview) {
  appState.setReplyTo(msgId);
  els.replyText.textContent = preview;
  els.replyContext.classList.remove('hidden');
}

/**
 * Clear reply context
 */
function clearReplyContext() {
  appState.clearReplyTo();
  els.replyContext.classList.add('hidden');
}

/**
 * Send message
 */
async function sendMessage() {
  const text = els.inputEl.value.trim();
  if (!text) return;

  if (!appState.token) {
    alert(i18n.t('needToken'));
    return;
  }

  if (!appState.activeChatId) {
    alert(i18n.t('pleaseSelectConversation'));
    return;
  }

  const body = { chat_id: appState.activeChatId, text };
  if (appState.replyTo) {
    body.reply_to_message_id = parseInt(appState.replyTo, 10);
  }

  const stickToBottom = isAtBottom(els.messagesEl);

  els.inputEl.value = '';
  clearReplyContext();
  stopChatAction();

  try {
    const sent = await botAPI.botPost('sendMessage', body);

    if (sent.ok) {
      const msg = sent.result;
      const message = {
        id: msg.message_id,
        side: 'right',
        type: 'text',
        text,
        date: msg.date * 1000,
        fromName: i18n.t('you'),
        reply_to: body.reply_to_message_id,
        reply_preview: appState.replyTo ? snippet(text) : null
      };

      const chatId = appState.activeChatId;
      appState.getOrCreateChat(chatId);
      if (appState.addMessageToChat(chatId, message)) {
        const permissions = appState.getChatPermissions(chatId);
        render.renderMessage(message, els.messagesEl, deleteMessage, {
          canDeleteOthers: permissions.canDeleteMessages,
          canManageMembers: canManageMembers()
        });
        if (preferences.autoScroll && stickToBottom) {
          scrollToBottom(els.messagesEl);
          els.newMsgBtn.style.display = 'none';
        } else {
          render.maybeShowNewMsgBtn(els.newMsgBtn, els.messagesEl);
        }
        render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
        storage.saveChatHistory(appState.token, appState.chats);
      }
    } else {
      alert(i18n.t('messageSendFailed', { error: sent.description || i18n.t('unknownError') }));
    }
  } catch (e) {
    alert(i18n.t('networkError', { error: e.message }));
  }
}

/**
 * Send file
 */
async function sendFile(file) {
  if (!file || !appState.activeChatId) {
    alert(i18n.t('selectFile'));
    return;
  }

  const caption = els.inputEl.value.trim();
  els.inputEl.value = '';
  clearReplyContext();
  stopChatAction();

  const fd = new FormData();
  fd.append('chat_id', appState.activeChatId);
  if (caption) fd.append('caption', caption);

  let method = 'sendDocument';
  let field = 'document';
  let type = 'document';

  if (file.type.startsWith('image/')) {
    method = 'sendPhoto';
    field = 'photo';
    type = 'photo';
  } else if (file.type.startsWith('video/')) {
    method = 'sendVideo';
    field = 'video';
    type = 'video';
  } else if (file.type.startsWith('audio/')) {
    method = 'sendAudio';
    field = 'audio';
    type = 'audio';
  }

  fd.append(field, file, file.name || undefined);

  const stickToBottom = isAtBottom(els.messagesEl);

  try {
    const res = await botAPI.botForm(method, fd);

    if (res.ok) {
      const msg = res.result;
      let mediaUrl = '';
      let fileName = file.name || '';

      if (type === 'photo') {
        const p = msg.photo[msg.photo.length - 1];
        mediaUrl = await getFileUrl(p.file_id);
      } else if (type === 'video') {
        mediaUrl = await getFileUrl(msg.video.file_id);
      } else if (type === 'audio') {
        mediaUrl = await getFileUrl(msg.audio.file_id);
      } else {
        mediaUrl = await getFileUrl(msg.document.file_id);
        fileName = msg.document.file_name || fileName;
      }

      const message = {
        id: msg.message_id,
        side: 'right',
        type,
        mediaUrl,
        caption,
        fileName,
        date: msg.date * 1000,
        fromName: i18n.t('you')
      };

      const chatId = appState.activeChatId;
      appState.getOrCreateChat(chatId);
      if (appState.addMessageToChat(chatId, message)) {
        const permissions = appState.getChatPermissions(chatId);
        render.renderMessage(message, els.messagesEl, deleteMessage, {
          canDeleteOthers: permissions.canDeleteMessages,
          canManageMembers: canManageMembers()
        });
        if (preferences.autoScroll && stickToBottom) {
          scrollToBottom(els.messagesEl);
          els.newMsgBtn.style.display = 'none';
        } else {
          render.maybeShowNewMsgBtn(els.newMsgBtn, els.messagesEl);
        }
        render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
        storage.saveChatHistory(appState.token, appState.chats);
      }
    } else {
      alert(i18n.t('fileSendFailed', { error: res.description || i18n.t('unknownError') }));
    }
  } catch (e) {
    alert(i18n.t('networkError', { error: e.message }));
  }
}

/**
 * Delete message
 */
async function deleteMessage(messageId) {
  if (!confirm(i18n.t('confirmDelete'))) return;

  const chatId = appState.activeChatId;
  if (!chatId) return;

  try {
    const res = await botAPI.deleteMessage(chatId, messageId);

    if (res.ok) {
      appState.removeMessageFromChat(chatId, messageId);
      const chat = appState.getChat(chatId);
      const permissions = appState.getChatPermissions(chatId);
      render.renderChatMessages(chat, els.messagesEl, deleteMessage, { 
        canDeleteOthers: permissions.canDeleteMessages,
        isGroupChat: chat.type === 'group' || chat.type === 'supergroup',
        onUserClick: handleUserClick
      });
      render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
      storage.saveChatHistory(appState.token, appState.chats);
      notifications.toastsShow(i18n.t('success'), i18n.t('messageDeleted'), els.toastsEl);
    } else {
      const reason = res.description || i18n.t('cannotDeleteMessage');
      notifications.toastsShow(i18n.t('error'), reason, els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow(i18n.t('error'), i18n.t('networkError', { error: e.message }), els.toastsEl);
  }
}

/**
 * Open chat by ID or username from input
 */
async function openChatFromInput() {
  const query = els.openChatInputEl?.value.trim();

  if (!query) {
    notifications.toastsShow(i18n.t('warning'), i18n.t('enterChatIdOrUsername'), els.toastsEl);
    return;
  }

  try {
    let chatIdentifier = query;

    if (query.startsWith('@')) {
      const username = query.substring(1);
      notifications.toastsShow(i18n.t('searching'), i18n.t('searchingForUser', { username }), els.toastsEl);
      chatIdentifier = '@' + username;
    }

    const res = await botAPI.getChat(chatIdentifier);

    if (res.ok) {
      const c = res.result;
      const id = String(c.id);
      const isPrivate = c.type === 'private';
      const title = isPrivate ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || i18n.t('user') : c.title || c.type || 'Chat';

      if (!appState.getChat(id)) {
        appState.getOrCreateChat(id, {
          type: c.type,
          title,
          avatarText: initials(title)
        });
        notifications.toastsShow(i18n.t('found'), title, els.toastsEl);
      }

      render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
      openChat(id);
      if (els.openChatInputEl) {
        els.openChatInputEl.value = '';
      }
    } else {
      notifications.toastsShow(i18n.t('notFound'), res.description || i18n.t('chatNotFound'), els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow(i18n.t('error'), i18n.t('searchError', { error: e.message }), els.toastsEl);
  }
}

/**
 * Open members dialog
 */
function openMembersDialog() {
  if (!appState.activeChatId) return;
  const chat = appState.getChat(appState.activeChatId);
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;

  els.membersOverlayEl.classList.remove('hidden');
  switchMembersTab(activeMembersTab);
  refreshMembersList(false);
}

/**
 * Close members dialog
 */
function closeMembersDialog() {
  els.membersOverlayEl.classList.add('hidden');
}

/**
 * Switch members tab
 */
function switchMembersTab(tab) {
  activeMembersTab = tab;

  if (tab === 'members') {
    els.membersTabBtn?.classList.add('active');
    els.groupTabBtn?.classList.remove('active');
    els.membersTabPanel?.classList.add('active');
    els.groupSettingsTab?.classList.remove('active');
  } else {
    els.membersTabBtn?.classList.remove('active');
    els.groupTabBtn?.classList.add('active');
    els.membersTabPanel?.classList.remove('active');
    els.groupSettingsTab?.classList.add('active');
    loadGroupSettings();
  }
}

/**
 * Load group settings
 */
function loadGroupSettings() {
  const chat = appState.getChat(appState.activeChatId);
  if (!chat) return;

  if (els.groupNameInputEl) els.groupNameInputEl.value = chat.title || '';
  if (els.groupDescriptionInputEl) els.groupDescriptionInputEl.value = chat.description || '';
}

/**
 * Save group info
 */
async function saveGroupInfo() {
  if (!appState.activeChatId) return;

  const title = els.groupNameInputEl?.value.trim();
  const description = els.groupDescriptionInputEl?.value.trim();
  const photoFile = els.groupPhotoInputEl?.files[0];

  try {
    if (title) {
      const res = await admin.updateGroupTitle(appState.activeChatId, title);
      if (res.ok) {
        const chat = appState.getChat(appState.activeChatId);
        if (chat) {
          chat.title = title;
          renderUI();
        }
        notifications.toastsShow('✅ Thành công', 'Đã cập nhật tên nhóm', els.toastsEl);
      }
    }

    if (description) {
      const res = await admin.updateGroupDescription(appState.activeChatId, description);
      if (res.ok) {
        const chat = appState.getChat(appState.activeChatId);
        if (chat) chat.description = description;
        notifications.toastsShow('✅ Thành công', 'Đã cập nhật mô tả', els.toastsEl);
      }
    }

    if (photoFile) {
      const res = await admin.updateGroupPhoto(appState.activeChatId, photoFile);
      if (res.ok) {
        notifications.toastsShow('✅ Thành công', 'Đã cập nhật ảnh đại diện', els.toastsEl);
      }
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', e.message, els.toastsEl);
  }
}

/**
 * Refresh members list
 */
async function refreshMembersList(showToast = true) {
  if (!appState.activeChatId) return;

  try {
    const admins = await admin.fetchAdministrators(appState.activeChatId);
    const chat = appState.getChat(appState.activeChatId);

    admins.forEach(m => {
      appState.upsertMember(appState.activeChatId, {
        id: m.user.id,
        first_name: m.user.first_name,
        last_name: m.user.last_name,
        username: m.user.username,
        isBot: m.user.is_bot,
        status: m.status,
        isAdmin: m.status === 'administrator',
        isCreator: m.status === 'creator',
        raw: m
      });
    });

    renderMembersList();

    const memberCount = appState.getChatMembersArray(appState.activeChatId).length;
    if (els.groupInfoEl) {
      els.groupInfoEl.textContent = `Tổng: ${memberCount} thành viên`;
    }

    if (showToast) {
      notifications.toastsShow('✅ Thành công', 'Đã tải lại danh sách', els.toastsEl);
    }
  } catch (e) {
    if (els.membersHintEl) {
      els.membersHintEl.textContent = 'Lỗi: ' + e.message;
    }
    if (showToast) {
      notifications.toastsShow('❌ Lỗi', e.message, els.toastsEl);
    }
  }
}

/**
 * Render members list
 */
function renderMembersList() {
  if (!els.membersListEl) return;
  els.membersListEl.innerHTML = '';

  const members = appState.getChatMembersArray(appState.activeChatId);

  members.forEach(member => {
    const item = document.createElement('div');
    item.className = 'member-item';
    item.dataset.userId = member.id;

    const avatar = document.createElement('div');
    avatar.className = 'member-avatar';
    avatar.textContent = member.avatarText || '?';

    const info = document.createElement('div');
    info.className = 'member-info';

    const name = document.createElement('div');
    name.className = 'member-name';
    name.textContent = member.displayName || 'Người dùng';

    const status = document.createElement('div');
    status.className = 'member-status';
    status.textContent = admin.roleLabel(member.status);

    info.appendChild(name);
    info.appendChild(status);

    item.appendChild(avatar);
    item.appendChild(info);

    els.membersListEl.appendChild(item);
  });
}

/**
 * Chat action (typing indicator)
 */
function sendChatAction() {
  if (!appState.activeChatId || !appState.token) return;
  botAPI.sendChatAction(appState.activeChatId, 'typing').catch(() => {});
}

function startChatAction() {
  sendChatAction();
  actionTimer = setInterval(sendChatAction, 4000);
}

function stopChatAction() {
  clearInterval(actionTimer);
  actionTimer = null;
}

/**
 * Delete chat
 */
async function deleteChat(chatId) {
  if (!chatId) return;
  
  // Remove from app state
  appState.removeChat(chatId);
  
  // Save to storage
  storage.saveChatHistory(appState.token, appState.chats);
  
  // If this was the active chat, clear it
  if (appState.activeChatId === chatId) {
    appState.setActiveChatId(null);
    render.clearMessagesView(els.messagesEl);
    render.updateChatHeader(null, els.headerTitleEl, els.activeAvatarEl);
    els.inputEl.disabled = true;
  }
  
  // Re-render chat list
  render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat, deleteChat);
  
  notifications.toastsShow('Thành công', 'Đã xóa chat', els.toastsEl);
}

/**
 * Handle user click in group chat
 */
function handleUserClick(userId, userName, userUsername = null) {
  if (!userId || !appState.activeChatId) return;
  
  const chat = appState.getChat(appState.activeChatId);
  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return;
  
  // Store current user info for actions
  window.currentUserAction = {
    userId,
    userName,
    userUsername,
    chatId: appState.activeChatId
  };
  
  // Show user actions menu
  showUserActionsMenu(userName, userUsername, userId);
}

/**
 * Show user actions menu
 */
function showUserActionsMenu(userName, userUsername = null, userId = null) {
  const userInfo = [];
  userInfo.push(`<strong>${userName}</strong>`);
  if (userUsername) {
    userInfo.push(`@${userUsername}`);
  }
  if (userId) {
    userInfo.push(`ID: ${userId}`);
  }
  
  els.userActionsTitle.innerHTML = userInfo.join(' • ');
  els.userActionsMenu.classList.remove('hidden');
}

/**
 * Close user actions menu
 */
function closeUserActionsMenu() {
  els.userActionsMenu.classList.add('hidden');
  window.currentUserAction = null;
}

/**
 * Perform user action
 */
async function performUserAction(action) {
  if (!window.currentUserAction) return;
  
  const { userId, userName, userUsername, chatId } = window.currentUserAction;
  
  try {
    switch (action) {
      case 'copyId':
        if (userId) {
          navigator.clipboard.writeText(userId.toString()).then(() => {
            notifications.toastsShow('Thành công', `Đã copy ID: ${userId}`, els.toastsEl);
          }).catch(() => {
            notifications.toastsShow('Lỗi', 'Không thể copy ID', els.toastsEl);
          });
        }
        break;
        
      case 'copyUsername':
        if (userUsername) {
          const usernameToCopy = userUsername.startsWith('@') ? userUsername : `@${userUsername}`;
          navigator.clipboard.writeText(usernameToCopy).then(() => {
            notifications.toastsShow('Thành công', `Đã copy username: ${usernameToCopy}`, els.toastsEl);
          }).catch(() => {
            notifications.toastsShow('Lỗi', 'Không thể copy username', els.toastsEl);
          });
        } else {
          notifications.toastsShow('Thông báo', 'Người dùng không có username', els.toastsEl);
        }
        break;
        
      case 'kick':
        if (confirm(`Kick ${userName} khỏi nhóm?`)) {
          await admin.kickMember(chatId, userId);
          notifications.toastsShow('Thành công', `Đã kick ${userName}`, els.toastsEl);
        }
        break;
        
      case 'promote':
        await admin.applyRole(chatId, userId, 'admin');
        notifications.toastsShow('Thành công', `Đã thăng ${userName} làm admin`, els.toastsEl);
        break;
        
      case 'moderate':
        await admin.applyRole(chatId, userId, 'moderator');
        notifications.toastsShow('Thành công', `Đã thăng ${userName} làm moderator`, els.toastsEl);
        break;
        
      case 'demote':
        await admin.applyRole(chatId, userId, 'member');
        notifications.toastsShow('Thành công', `Đã hạ ${userName} thành thành viên`, els.toastsEl);
        break;
        
      case 'restrict':
        // This would need a more complex UI for specific restrictions
        notifications.toastsShow('Thông báo', 'Tính năng hạn chế quyền đang phát triển', els.toastsEl);
        break;
    }
  } catch (error) {
    notifications.toastsShow('Lỗi', `Không thực hiện tác vụ: ${error.message}`, els.toastsEl);
  }
  
  closeUserActionsMenu();
}

/**
 * Toggle sticker panel
 */
function toggleStickerPanel() {
  if (!els.stickerPanel) return;
  const isHidden = els.stickerPanel.classList.toggle('hidden');
  if (!isHidden) {
    showStickerPanel();
  }
}

/**
 * Show sticker panel
 */
function showStickerPanel() {
  els.stickerPanel.classList.remove('hidden');
  
  // Load stickers
  const stickers = storage.loadStickers(appState.token);
  
  // Ensure stickers have URLs
  const stickersWithUrls = Promise.all(
    stickers.map(async (sticker) => {
      if (!sticker.url && sticker.file_id) {
        try {
          const info = await botAPI.getFile(sticker.file_id);
          if (info.ok) {
            sticker.url = botAPI.fullFileUrl(info.result.file_path);
          }
        } catch (e) {
          console.warn('Failed to get sticker URL:', e);
        }
      }
      return sticker;
    })
  );
  
  stickersWithUrls.then((resolvedStickers) => {
    render.renderStickerPanel(resolvedStickers, els.stickerList, handleStickerClick);
  });
}

/**
 * Close sticker panel
 */
function closeStickerPanel() {
  els.stickerPanel.classList.add('hidden');
}

/**
 * Handle sticker click
 */
async function handleStickerClick(sticker) {
  if (!appState.activeChatId) {
    notifications.toastsShow('Lỗi', 'Chọn chat trước', els.toastsEl);
    return;
  }
  
  try {
    await botAPI.sendSticker(appState.activeChatId, sticker.file_id);
    closeStickerPanel();
    
    // Add sticker to sent messages (optimistic UI)
    const message = {
      id: Date.now(), // Temporary ID
      side: 'right',
      date: Date.now(),
      fromName: appState.bot.name || 'Bot',
      type: 'sticker',
      mediaUrl: sticker.url,
      stickerFormat: sticker.is_animated ? 'tgs' : (sticker.is_video ? 'webm' : 'webp'),
      emoji: sticker.emoji || ''
    };
    
    appState.addMessageToChat(appState.activeChatId, message);
    render.renderMessage(message, els.messagesEl, deleteMessage, { 
      canDeleteOthers: false,
      isGroupChat: false
    });
    scrollToBottom(els.messagesEl);
    
  } catch (error) {
    notifications.toastsShow('Lỗi', `Không gửi sticker: ${error.message}`, els.toastsEl);
  }
}

/**
 * Scroll to message function for notifications
 */
window.scrollToMessage = function(chatId, messageId) {
  if (appState.activeChatId !== chatId) {
    openChat(chatId);
  }
  
  setTimeout(() => {
    const messageEl = document.querySelector(`[data-msg-id="${messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageEl.style.animation = 'pulse 1s ease-in-out';
      setTimeout(() => {
        messageEl.style.animation = '';
      }, 1000);
    }
  }, 500);
};

/**
 * Update sidebar close button visibility based on screen size
 */
function updateSidebarCloseButton() {
  if (!els || !els.sidebarCloseBtn) return;
  
  const isMobile = window.innerWidth <= 840;
  if (isMobile) {
    els.sidebarCloseBtn.style.display = 'grid';
  } else {
    els.sidebarCloseBtn.style.display = 'none';
  }
}

/**
 * Start application
 */
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => {
  if (appState.token) {
    storage.saveChatHistory(appState.token, appState.chats);
  }
});
