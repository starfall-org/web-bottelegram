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
import { fmtTime, initials, snippet, senderNameFromMsg, playBeep, scrollToBottom, isAtBottom } from './modules/utils/helpers.js';

// Get DOM elements
let els = null;

// Setup polling
let pollTimer = null;
let actionTimer = null;

/**
 * Initialize application
 */
function init() {
  els = dom.getCachedElements();

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
  els.cancelBtn.addEventListener('click', () => els.overlayEl.classList.add('hidden'));
  els.testBtn.addEventListener('click', testConnection);
  els.deleteWebhookBtn.addEventListener('click', deleteWebhook);
  els.notifBtn.addEventListener('click', requestNotifications);

  // Chat list
  els.searchBtnEl.addEventListener('click', searchChat);
  els.searchInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchChat();
  });

  // Sidebar
  els.menuToggleEl.addEventListener('click', () => {
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

  // Members
  els.membersBtnEl.addEventListener('click', showMembersDialog);
  els.closeMembersBtn.addEventListener('click', () => els.membersOverlayEl.classList.add('hidden'));
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
    render.renderChatMessages(chat, els.messagesEl, deleteMessage);
    scrollToBottom(els.messagesEl);
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
    render.updateChatHeader(chat, els.headerTitleEl, els.activeAvatarEl);
    render.updateMembersButton(chat, els.membersBtnEl);

    els.inputEl.disabled = false;
    els.sendBtn.disabled = false;
    els.attachBtn.disabled = false;
    els.inputEl.placeholder = 'Nhập tin nhắn...';
    els.inputEl.focus();

    render.renderChatMessages(chat, els.messagesEl, deleteMessage);
    scrollToBottom(els.messagesEl);

    // Hide sidebar on mobile
    if (window.innerWidth <= 768) {
      els.sidebarEl.classList.add('hidden-mobile');
    }
  }

  renderUI();
}

/**
 * Open settings dialog
 */
function openSettings() {
  els.tokenInputEl.value = appState.token;
  els.proxyInputEl.value = localStorage.getItem('cors_proxy') || '';
  els.overlayEl.classList.remove('hidden');
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

  els.overlayEl.classList.add('hidden');
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
async function requestNotifications() {
  try {
    const permission = await notifications.requestNotifications();
    els.settingsHintEl.textContent = permission === 'granted' ? '✅ Thông báo: đã cấp quyền.' : '❌ Thông báo: bị từ chối hoặc chưa cấp.';
  } catch (e) {
    els.settingsHintEl.textContent = '❌ Lỗi: ' + e.message;
  }
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
      const botInfo = {
        id: me.result.id,
        username: me.result.username || null,
        name: [me.result.first_name, me.result.last_name].filter(Boolean).join(' ') || me.result.username || 'Bot'
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
  if (appState.bot.username) {
    els.botInfoEl.textContent = '@' + appState.bot.username;
  } else if (appState.bot.id) {
    els.botInfoEl.textContent = 'Bot ID: ' + appState.bot.id;
  }
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
  const c = msg.chat;
  const id = String(c.id);

  // Ensure chat exists
  if (!appState.getChat(id)) {
    const isPrivate = c.type === 'private';
    const title = isPrivate ? [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ') || msg.chat.username || 'Người dùng' : msg.chat.title || c.type || 'Chat';

    appState.getOrCreateChat(id, {
      type: c.type,
      title,
      avatarText: initials(title)
    });
  }

  const chat = appState.getChat(id);
  const fromName = senderNameFromMsg(msg);

  const base = {
    id: msg.message_id,
    side: 'left',
    date: (msg.date || Math.floor(Date.now() / 1000)) * 1000,
    fromName,
    reply_to: msg.reply_to_message && msg.reply_to_message.message_id,
    reply_preview: msg.reply_to_message && snippet(msg.reply_to_message.text || msg.reply_to_message.caption || '')
  };

  let m = null;

  if (msg.text) {
    m = { ...base, type: 'text', text: msg.text };
  } else if (msg.photo) {
    const p = msg.photo[msg.photo.length - 1];
    const url = await getFileUrl(p.file_id);
    m = { ...base, type: 'photo', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.video) {
    const url = await getFileUrl(msg.video.file_id);
    m = { ...base, type: 'video', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.audio) {
    const url = await getFileUrl(msg.audio.file_id);
    m = { ...base, type: 'audio', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.voice) {
    const url = await getFileUrl(msg.voice.file_id);
    m = { ...base, type: 'voice', mediaUrl: url, caption: msg.caption || '' };
  } else if (msg.document) {
    const url = await getFileUrl(msg.document.file_id);
    m = { ...base, type: 'document', mediaUrl: url, caption: msg.caption || '', fileName: msg.document.file_name || 'Tệp' };
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

    m = { ...base, type: 'sticker', mediaUrl: url, stickerFormat: fmt, emoji: st.emoji || '' };
  } else {
    m = { ...base, type: 'text', text: '[Không hiển thị loại nội dung này]' };
  }

  // Add message to chat
  if (appState.addMessageToChat(id, m)) {
    if (appState.activeChatId === id) {
      render.renderMessage(m, els.messagesEl, deleteMessage);
      scrollToBottom(els.messagesEl);
    } else {
      chat.unread = (chat.unread || 0) + 1;
      notifications.notifyNewMessage(chat, m, els.toastsEl);
    }

    renderUI();
    render.maybeShowNewMsgBtn(els.newMsgBtn, els.messagesEl);
    storage.saveChatHistory(appState.token, appState.chats);
  }
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
 * Handle message click (for reply)
 */
function handleMessageClick(e) {
  if (e.target.closest('.msg-action-btn')) return;
  const msgEl = e.target.closest('.message');
  if (!msgEl) return;

  const msgId = msgEl.dataset.msgId;
  const prev = msgEl.innerText.slice(0, 30).replace('/ /g', ' ');
  setReplyContext(msgId, prev);
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

  els.inputEl.value = '';
  clearReplyContext();
  stopChatAction();

  try {
    const sent = await botAPI.botPost('sendMessage', body);

    if (sent.ok) {
      const msg = sent.result;
      const m = {
        id: msg.message_id,
        side: 'right',
        type: 'text',
        text,
        date: msg.date * 1000,
        fromName: 'Bạn',
        reply_to: body.reply_to_message_id,
        reply_preview: appState.replyTo ? snippet(body.text) : null
      };

      appState.getOrCreateChat(appState.activeChatId);
      appState.addMessageToChat(appState.activeChatId, m);
      render.renderMessage(m, els.messagesEl, deleteMessage);
      scrollToBottom(els.messagesEl);
      renderUI();
      storage.saveChatHistory(appState.token, appState.chats);
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

  let method = 'sendDocument',
    field = 'document',
    type = 'document';

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

  try {
    const res = await botAPI.botForm(method, fd);

    if (res.ok) {
      const msg = res.result;
      let mediaUrl = '',
        fileName = file.name || '';

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

      const m = {
        id: msg.message_id,
        side: 'right',
        type,
        mediaUrl,
        caption,
        fileName,
        date: msg.date * 1000,
        fromName: 'Bạn'
      };

      appState.getOrCreateChat(appState.activeChatId);
      appState.addMessageToChat(appState.activeChatId, m);
      render.renderMessage(m, els.messagesEl, deleteMessage);
      scrollToBottom(els.messagesEl);
      renderUI();
      storage.saveChatHistory(appState.token, appState.chats);
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

  try {
    const res = await botAPI.deleteMessage(appState.activeChatId, messageId);

    if (res.ok) {
      appState.removeMessageFromChat(appState.activeChatId, messageId);
      renderUI();
      storage.saveChatHistory(appState.token, appState.chats);
      notifications.toastsShow('✅ Thành công', 'Đã xóa tin nhắn', els.toastsEl);
    } else {
      notifications.toastsShow('❌ Lỗi', res.description || 'Không thể xóa tin nhắn', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', 'Lỗi mạng: ' + e.message, els.toastsEl);
  }
}

/**
 * Search chat
 */
async function searchChat() {
  const query = els.searchInputEl.value.trim();

  if (!query) {
    notifications.toastsShow('⚠️ Chú ý', 'Vui lòng nhập chat ID hoặc username', els.toastsEl);
    return;
  }

  try {
    let chatId = query;

    if (query.startsWith('@')) {
      const username = query.substring(1);
      notifications.toastsShow('🔍 Đang tìm...', 'Tìm kiếm @' + username, els.toastsEl);
      chatId = '@' + username;
    }

    const res = await botAPI.getChat(chatId);

    if (res.ok) {
      const c = res.result;
      const id = String(c.id);

      if (!appState.getChat(id)) {
        const isPrivate = c.type === 'private';
        const title = isPrivate ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || 'Người dùng' : c.title || c.type || 'Chat';

        appState.getOrCreateChat(id, {
          type: c.type,
          title,
          avatarText: initials(title)
        });

        renderUI();
        notifications.toastsShow('✅ Tìm thấy', title, els.toastsEl);
      }

      openChat(id);
      els.searchInputEl.value = '';
    } else {
      notifications.toastsShow('❌ Không tìm thấy', res.description || 'Chat không tồn tại hoặc bot chưa có quyền truy cập', els.toastsEl);
    }
  } catch (e) {
    notifications.toastsShow('❌ Lỗi', 'Lỗi khi tìm kiếm: ' + e.message, els.toastsEl);
  }
}

/**
 * Show members dialog
 */
async function showMembersDialog() {
  if (!appState.activeChatId) return;

  const chat = appState.getChat(appState.activeChatId);

  await admin.showMembers(
    appState.activeChatId,
    chat,
    els.membersOverlayEl,
    els.groupInfoEl,
    els.membersListEl,
    els.membersHintEl,
    els.toastsEl,
    (userId, userName) => admin.kickMember(appState.activeChatId, userId, userName, els.toastsEl, showMembersDialog),
    (userId, promote, userName) => admin.toggleAdmin(appState.activeChatId, userId, promote, userName, els.toastsEl, showMembersDialog)
  );
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
