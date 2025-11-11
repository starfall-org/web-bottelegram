/**
 * Main application entry point
 */

import './styles/main.css';
import * as botAPI from './modules/api/bot.js';
import * as appState from './modules/state/appState.js';
import * as storage from './modules/storage/cookieStorage.js';
import * as render from './modules/ui/render.js';
import * as dom from './modules/ui/dom.js';
import * as notifications from './modules/notifications/notifications.js';
import * as admin from './modules/admin/admin.js';
import { fmtTime, initials, snippet, senderNameFromMsg, scrollToBottom, isAtBottom, formatDateTime } from './modules/utils/helpers.js';

// Get DOM elements
let els = null;

// Setup polling
let pollTimer = null;
let actionTimer = null;

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

  // Migrate from localStorage if needed
  storage.migrateFromLocalStorage();

  // Load stored token
  const storedToken = localStorage.getItem('bot_token');
  const storedProxy = localStorage.getItem('cors_proxy') || '';

  if (storedToken) {
    appState.setToken(storedToken);
    botAPI.setToken(storedToken);
    botAPI.setProxy(storedProxy);

    // Load saved chat history from cookies
    const savedChats = storage.loadChatHistory(storedToken);
    appState.setChats(savedChats);

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

  // Initial render
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
    els.sidebarEl.classList.add('hidden-mobile');
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
    if (e.key === 'Enter') sendMessage();
  });
  els.inputEl.addEventListener('focus', startChatAction);
  els.inputEl.addEventListener('blur', stopChatAction);

  // Attachments
  els.attachBtn.addEventListener('click', () => {
    if (!appState.activeChatId) {
      alert('Chọn chat trước.');
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

  render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);

  if (chat) {
    render.updateChatHeader(chat, els.headerTitleEl, els.activeAvatarEl);
    render.updateMembersButton(chat, els.membersBtnEl);
    const permissions = appState.getChatPermissions(chat.id);
    render.renderChatMessages(chat, els.messagesEl, deleteMessage, {
      canDeleteOthers: permissions.canDeleteMessages,
      canManageMembers: canManageMembers()
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
  const chat = appState.getChat(chatId);

  if (chat) {
    chat.unread = 0;
    els.inputEl.disabled = false;
    els.sendBtn.disabled = false;
    els.attachBtn.disabled = false;
    els.inputEl.placeholder = 'Nhập tin nhắn...';
    els.inputEl.focus();

    // Hide sidebar on mobile
    if (window.innerWidth <= 768) {
      els.sidebarEl.classList.add('hidden-mobile');
    }
  } else {
    els.inputEl.disabled = true;
    els.sendBtn.disabled = true;
    els.attachBtn.disabled = true;
    els.inputEl.placeholder = 'Chưa chọn cuộc trò chuyện';
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
    els.settingsHintEl.textContent = '❌ Nhập Bot Token!';
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
    els.settingsHintEl.textContent = 'Chưa có token.';
    return;
  }

  try {
    const me = await botAPI.getMe();
    if (me.ok) {
      els.settingsHintEl.textContent = `✅ OK: @${me.result.username || '(không tên)'} • id=${me.result.id}`;
    } else {
      els.settingsHintEl.textContent = '❌ Lỗi getMe: ' + (me.description || 'Không rõ');
    }
  } catch (e) {
    els.settingsHintEl.textContent = '❌ CORS hoặc mạng lỗi: ' + e.message;
  }
}

/**
 * Delete webhook
 */
async function deleteWebhook() {
  if (!appState.token) return;

  try {
    const res = await botAPI.deleteWebhook(false);
    els.settingsHintEl.textContent = res.ok ? '✅ Đã xóa webhook.' : '❌ Không xóa được: ' + (res.description || 'Không rõ');
  } catch (e) {
    els.settingsHintEl.textContent = '❌ Lỗi mạng khi xóa webhook: ' + e.message;
  }
}

/**
 * Request notifications permission
 */
async function handleNotificationRequest() {
  try {
    const permission = await notifications.requestNotifications();
    const granted = permission === 'granted';
    els.settingsHintEl.textContent = granted ? '✅ Thông báo: đã cấp quyền.' : '❌ Thông báo: bị từ chối hoặc chưa cấp.';
    updatePreference('push', granted);
  } catch (e) {
    els.settingsHintEl.textContent = '❌ Lỗi: ' + e.message;
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

function getSupportedFeatures() {
  return [
    'Giao diện sáng / tối / hệ thống',
    'Thông báo đẩy khi có tin nhắn mới',
    'Lưu lịch sử hội thoại trong trình duyệt',
    'Quản lý thành viên & chỉnh sửa quyền',
    'Gửi tin nhắn văn bản và media'
  ];
}

/**
 * Connect to bot
 */
async function connect() {
  if (!appState.token) {
    els.statusEl.textContent = 'Chưa kết nối (thiếu token)';
    return;
  }

  els.statusEl.textContent = 'Đang kết nối...';

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
  pollOnce().catch(() => {});
  pollTimer = setInterval(() => pollOnce().catch(() => {}), 2500);
  els.statusEl.textContent = 'Đang nhận cập nhật...';
}

/**
 * Stop polling
 */
function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

/**
 * Poll for updates once
 */
async function pollOnce() {
  try {
    const res = await botAPI.getUpdates(appState.lastUpdateId || undefined);

    if (!res.ok) {
      els.statusEl.textContent = 'Lỗi getUpdates: ' + (res.description || 'Không rõ');
      if (String(res.error_code) === '409') {
        els.statusEl.textContent = 'Webhook đang hoạt động. Xóa webhook trong Cài đặt.';
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

    els.statusEl.textContent = 'Đang nhận cập nhật...';
  } catch (e) {
    els.statusEl.textContent = 'CORS hoặc mạng lỗi khi getUpdates';
  }
}

/**
 * Process incoming message
 */
async function processMessage(msg) {
  const chatData = msg.chat;
  const chatId = String(chatData.id);
  const isPrivate = chatData.type === 'private';
  const fallbackTitle = isPrivate ? [chatData.first_name, chatData.last_name].filter(Boolean).join(' ') || chatData.username || 'Người dùng' : chatData.title || chatData.type || 'Chat';

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
    fromName: senderNameFromMsg(msg),
    fromId: msg.from ? msg.from.id : null,
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

    message = { ...baseMessage, type: 'sticker', mediaUrl: url, stickerFormat: fmt, emoji: st.emoji || '' };
  } else {
    message = { ...baseMessage, type: 'text', text: '[Không hiển thị loại nội dung này]' };
  }

  if (appState.addMessageToChat(chatId, message)) {
    if (isActiveChat) {
      const permissions = appState.getChatPermissions(chatId);
      render.renderMessage(message, els.messagesEl, deleteMessage, {
        canDeleteOthers: permissions.canDeleteMessages,
        canManageMembers: canManageMembers()
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
        push: preferences.push
      });
    }

    render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);
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
    alert('Bạn cần nhập token.');
    return;
  }

  if (!appState.activeChatId) {
    alert('Hãy chọn cuộc trò chuyện.');
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
        fromName: 'Bạn',
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
        render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);
        storage.saveChatHistory(appState.token, appState.chats);
      }
    } else {
      alert('Gửi thất bại: ' + (sent.description || 'Không rõ'));
    }
  } catch (e) {
    alert('Lỗi mạng khi gửi tin nhắn: ' + e.message);
  }
}

/**
 * Send file
 */
async function sendFile(file) {
  if (!file || !appState.activeChatId) {
    alert('Chưa chọn chat hoặc tệp.');
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
        fromName: 'Bạn'
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
        render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);
        storage.saveChatHistory(appState.token, appState.chats);
      }
    } else {
      alert('Gửi tệp thất bại: ' + (res.description || 'Không rõ'));
    }
  } catch (e) {
    alert('Lỗi mạng khi gửi tệp: ' + e.message);
  }
}

/**
 * Delete message
 */
async function deleteMessage(messageId) {
  if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

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
        canManageMembers: canManageMembers()
      });
      render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);
      storage.saveChatHistory(appState.token, appState.chats);
      notifications.toastsShow('✅ Thành công', 'Đã xóa tin nhắn', els.toastsEl);
    } else {
      const reason = res.description || 'Không thể xóa tin nhắn (kiểm tra quyền của bot)';
      notifications.toastsShow('❌ Lỗi', reason, els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', 'Lỗi mạng: ' + e.message, els.toastsEl);
  }
}

/**
 * Open chat by ID or username from input
 */
async function openChatFromInput() {
  const query = els.openChatInputEl?.value.trim();

  if (!query) {
    notifications.toastsShow('⚠️ Chú ý', 'Vui lòng nhập chat ID hoặc username', els.toastsEl);
    return;
  }

  try {
    let chatIdentifier = query;

    if (query.startsWith('@')) {
      const username = query.substring(1);
      notifications.toastsShow('🔍 Đang tìm...', 'Đang tìm @' + username, els.toastsEl);
      chatIdentifier = '@' + username;
    }

    const res = await botAPI.getChat(chatIdentifier);

    if (res.ok) {
      const c = res.result;
      const id = String(c.id);
      const isPrivate = c.type === 'private';
      const title = isPrivate ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || 'Người dùng' : c.title || c.type || 'Chat';

      if (!appState.getChat(id)) {
        appState.getOrCreateChat(id, {
          type: c.type,
          title,
          avatarText: initials(title)
        });
        notifications.toastsShow('✅ Tìm thấy', title, els.toastsEl);
      }

      render.renderChatList(appState.chats, appState.activeChatId, els.emptyNoticeEl, els.chatListEl, openChat);
      openChat(id);
      if (els.openChatInputEl) {
        els.openChatInputEl.value = '';
      }
    } else {
      notifications.toastsShow('❌ Không tìm thấy', res.description || 'Chat không tồn tại hoặc bot chưa có quyền truy cập', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', 'Lỗi khi tìm kiếm: ' + e.message, els.toastsEl);
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
 * Handle member list click
 */
function handleMemberListClick(e) {
  const item = e.target.closest('.member-item');
  if (!item) return;

  const userId = parseInt(item.dataset.userId, 10);
  if (!userId) return;

  showMemberModal(userId);
}

/**
 * Show member modal
 */
async function showMemberModal(userId) {
  const member = appState.getChatMember(appState.activeChatId, userId);
  if (!member) return;

  currentMemberId = userId;

  if (els.memberModalAvatarEl) els.memberModalAvatarEl.textContent = member.avatarText || '?';
  if (els.memberModalNameEl) els.memberModalNameEl.textContent = member.displayName || 'Người dùng';
  if (els.memberModalUsernameEl) els.memberModalUsernameEl.textContent = member.username ? '@' + member.username : '—';
  if (els.memberModalIdEl) els.memberModalIdEl.textContent = 'ID: ' + member.id;
  if (els.memberModalStatusEl) els.memberModalStatusEl.textContent = admin.roleLabel(member.status);
  if (els.memberModalJoinedEl) {
    els.memberModalJoinedEl.textContent = member.joinedDate
      ? 'Tham gia: ' + new Date(member.joinedDate).toLocaleDateString('vi-VN')
      : '—';
  }

  const permissions = appState.getChatPermissions(appState.activeChatId);
  const canManage = permissions.canPromoteMembers || permissions.canRestrictMembers;

  if (els.memberPromoteBtn) els.memberPromoteBtn.style.display = canManage && !member.isCreator ? 'block' : 'none';
  if (els.memberModeratorBtn) els.memberModeratorBtn.style.display = canManage && !member.isCreator ? 'block' : 'none';
  if (els.memberDemoteBtn) els.memberDemoteBtn.style.display = canManage && !member.isCreator ? 'block' : 'none';
  if (els.memberRestrictBtn) els.memberRestrictBtn.style.display = canManage && !member.isCreator ? 'block' : 'none';
  if (els.memberKickBtn) els.memberKickBtn.style.display = canManage && !member.isCreator ? 'block' : 'none';

  els.memberModalEl?.classList.remove('hidden');
}

/**
 * Close member modal
 */
function closeMemberModal() {
  els.memberModalEl?.classList.add('hidden');
  currentMemberId = null;
}

/**
 * Change member role
 */
async function changeMemberRole(role) {
  if (!currentMemberId || !appState.activeChatId) return;

  const member = appState.getChatMember(appState.activeChatId, currentMemberId);
  if (!member) return;

  try {
    const res = await admin.applyRole(appState.activeChatId, currentMemberId, role);
    if (res.ok) {
      member.status = role === 'admin' ? 'administrator' : role;
      member.isAdmin = role === 'admin' || role === 'administrator';
      notifications.toastsShow('✅ Thành công', `Đã thay đổi vai trò`, els.toastsEl);
      closeMemberModal();
      refreshMembersList(false);
    } else {
      notifications.toastsShow('❌ Lỗi', res.description || 'Không thể thay đổi vai trò', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', e.message, els.toastsEl);
  }
}

/**
 * Kick member from modal
 */
async function kickMemberFromModal() {
  if (!currentMemberId || !appState.activeChatId) return;

  const member = appState.getChatMember(appState.activeChatId, currentMemberId);
  if (!member) return;

  if (!confirm(`Kick ${member.displayName} khỏi nhóm?`)) return;

  try {
    const res = await admin.kickMember(appState.activeChatId, currentMemberId);
    if (res.ok) {
      appState.removeMember(appState.activeChatId, currentMemberId);
      notifications.toastsShow('✅ Thành công', `Đã kick ${member.displayName}`, els.toastsEl);
      closeMemberModal();
      refreshMembersList(false);
    } else {
      notifications.toastsShow('❌ Lỗi', res.description || 'Không thể kick thành viên', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', e.message, els.toastsEl);
  }
}

/**
 * Open restrict modal
 */
function openRestrictModal() {
  if (!currentMemberId) return;

  if (els.permSendMessagesEl) els.permSendMessagesEl.checked = true;
  if (els.permSendMediaEl) els.permSendMediaEl.checked = true;
  if (els.permSendPollsEl) els.permSendPollsEl.checked = true;
  if (els.permSendOtherEl) els.permSendOtherEl.checked = true;
  if (els.permAddWebPageEl) els.permAddWebPageEl.checked = true;
  if (els.permChangeInfoEl) els.permChangeInfoEl.checked = false;
  if (els.permInviteUsersEl) els.permInviteUsersEl.checked = true;
  if (els.permPinMessagesEl) els.permPinMessagesEl.checked = false;

  els.memberModalEl?.classList.add('hidden');
  els.restrictModalEl?.classList.remove('hidden');
}

/**
 * Close restrict modal
 */
function closeRestrictModal() {
  els.restrictModalEl?.classList.add('hidden');
  els.memberModalEl?.classList.remove('hidden');
}

/**
 * Apply restrict permissions
 */
async function applyRestrictPermissions() {
  if (!currentMemberId || !appState.activeChatId) return;

  const permissions = {
    can_send_messages: els.permSendMessagesEl?.checked ?? true,
    can_send_audios: els.permSendMediaEl?.checked ?? true,
    can_send_documents: els.permSendMediaEl?.checked ?? true,
    can_send_photos: els.permSendMediaEl?.checked ?? true,
    can_send_videos: els.permSendMediaEl?.checked ?? true,
    can_send_video_notes: els.permSendMediaEl?.checked ?? true,
    can_send_voice_notes: els.permSendMediaEl?.checked ?? true,
    can_send_polls: els.permSendPollsEl?.checked ?? true,
    can_send_other_messages: els.permSendOtherEl?.checked ?? true,
    can_add_web_page_previews: els.permAddWebPageEl?.checked ?? true,
    can_change_info: els.permChangeInfoEl?.checked ?? false,
    can_invite_users: els.permInviteUsersEl?.checked ?? true,
    can_pin_messages: els.permPinMessagesEl?.checked ?? false,
    can_manage_topics: false
  };

  try {
    const res = await botAPI.restrictChatMember(appState.activeChatId, currentMemberId, permissions);
    if (res.ok) {
      notifications.toastsShow('✅ Thành công', 'Đã áp dụng hạn chế', els.toastsEl);
      closeRestrictModal();
      closeMemberModal();
      refreshMembersList(false);
    } else {
      notifications.toastsShow('❌ Lỗi', res.description || 'Không thể áp dụng hạn chế', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', e.message, els.toastsEl);
  }
}

/**
 * Handle chat list context menu
 */
function handleChatListContextMenu(e) {
  const item = e.target.closest('.chat-item');
  if (!item) return;

  e.preventDefault();

  const chatId = item.dataset.chatId;
  if (!chatId) return;

  if (confirm('Xóa cuộc trò chuyện này và toàn bộ lịch sử?')) {
    deleteChat(chatId);
  }
}

/**
 * Delete chat
 */
function deleteChat(chatId) {
  appState.removeChat(chatId);

  if (appState.activeChatId === chatId) {
    appState.setActiveChatId(null);
  }

  storage.saveChatHistory(appState.token, appState.chats);
  renderUI();
  notifications.toastsShow('✅ Đã xóa', 'Cuộc trò chuyện đã được xóa', els.toastsEl);
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
 * Start application
 */
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => {
  if (appState.token) {
    storage.saveChatHistory(appState.token, appState.chats);
  }
});
