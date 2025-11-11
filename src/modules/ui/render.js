/**
 * UI rendering module
 */

import { fmtTime, snippet, initials } from '../utils/helpers.js';
import * as appState from '../state/appState.js';

/**
 * Render a single message
 */
export function renderMessage(message, messagesEl, onDeleteClick, options = {}) {
  const isOwn = message.side === 'right';
  const canDelete = isOwn || options.canDeleteOthers;

  const item = document.createElement('div');
  item.className = 'message ' + (isOwn ? 'right' : 'left') + (message.reply_to ? ' reply' : '');
  item.dataset.msgId = message.id;

  if (canDelete) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const delBtn = document.createElement('button');
    delBtn.className = 'msg-action-btn';
    delBtn.textContent = '🗑️';
    delBtn.title = 'Xóa tin nhắn';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onDeleteClick) onDeleteClick(message.id);
    });
    actions.appendChild(delBtn);
    item.appendChild(actions);
  }

  // Reply preview
  if (message.reply_preview) {
    const rt = document.createElement('div');
    rt.className = 'reply-to';
    rt.textContent = '↪ ' + message.reply_preview;
    item.appendChild(rt);
  }

  // Content
  const cnt = document.createElement('div');
  if (message.type === 'photo') {
    const img = document.createElement('img');
    img.src = message.mediaUrl;
    img.className = 'media';
    img.alt = message.caption || 'Ảnh';
    cnt.appendChild(img);
    if (message.caption) {
      const t = document.createElement('div');
      t.textContent = message.caption;
      t.style.marginTop = '6px';
      cnt.appendChild(t);
    }
  } else if (message.type === 'video') {
    const v = document.createElement('video');
    v.src = message.mediaUrl;
    v.controls = true;
    v.playsInline = true;
    v.className = 'media';
    cnt.appendChild(v);
    if (message.caption) {
      const t = document.createElement('div');
      t.textContent = message.caption;
      t.style.marginTop = '6px';
      cnt.appendChild(t);
    }
  } else if (message.type === 'audio' || message.type === 'voice') {
    const a = document.createElement('audio');
    a.src = message.mediaUrl;
    a.controls = true;
    a.className = 'media';
    cnt.appendChild(a);
    if (message.caption) {
      const t = document.createElement('div');
      t.textContent = message.caption;
      t.style.marginTop = '6px';
      cnt.appendChild(t);
    }
  } else if (message.type === 'document') {
    const a = document.createElement('a');
    a.href = message.mediaUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'doc-link';
    a.textContent = message.fileName || 'Tệp';
    cnt.appendChild(a);
    if (message.caption) {
      const t = document.createElement('div');
      t.textContent = message.caption;
      t.style.marginTop = '6px';
      cnt.appendChild(t);
    }
  } else if (message.type === 'sticker') {
    renderSticker(cnt, message);
  } else {
    cnt.textContent = message.text;
  }

  item.appendChild(cnt);

  const meta = document.createElement('div');
  meta.className = 'meta';
  
  // Make sender name clickable in group chats for user actions
  const fromNameSpan = document.createElement('span');
  fromNameSpan.className = 'sender-name';
  fromNameSpan.textContent = message.fromName;
  if (options.isGroupChat && options.onUserClick) {
    fromNameSpan.style.cursor = 'pointer';
    fromNameSpan.style.textDecoration = 'underline';
    fromNameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onUserClick(message.fromId, message.fromName, message.fromUsername);
    });
  }
  
  meta.appendChild(fromNameSpan);
  meta.appendChild(document.createTextNode(` • ${fmtTime(message.date)}`));
  item.appendChild(meta);

  messagesEl.appendChild(item);
}

/**
 * Render sticker message
 */
function renderSticker(container, message) {
  if (message.stickerFormat === 'webp' || message.stickerFormat === 'static') {
    // Regular sticker
    const img = document.createElement('img');
    img.src = message.mediaUrl;
    img.className = 'media sticker-image';
    img.alt = message.emoji || 'Sticker';
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';
    img.style.objectFit = 'contain';
    container.appendChild(img);
  } else if (message.stickerFormat === 'webm' || message.stickerFormat === 'video') {
    // Video/animated sticker
    const v = document.createElement('video');
    v.src = message.mediaUrl;
    v.autoplay = true;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.className = 'media sticker-video';
    v.style.maxWidth = '200px';
    v.style.maxHeight = '200px';
    v.style.objectFit = 'contain';
    container.appendChild(v);
  } else if (message.stickerFormat === 'tgs' || message.stickerFormat === 'animated') {
    // Animated sticker (TGS) - we can't render these in browser natively,
    // so we show the emoji or a placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'sticker-placeholder';
    placeholder.style.fontSize = '3rem';
    placeholder.style.textAlign = 'center';
    placeholder.style.padding = '10px';
    placeholder.textContent = message.emoji || '✨';
    container.appendChild(placeholder);

    // Add a note
    const note = document.createElement('div');
    note.className = 'sticker-note';
    note.style.fontSize = '0.75rem';
    note.style.color = 'var(--muted)';
    note.style.marginTop = '4px';
    note.style.textAlign = 'center';
    note.textContent = '[Animated sticker]';
    container.appendChild(note);
  } else {
    // Unknown format
    const text = document.createElement('div');
    text.textContent = '[Sticker] ' + (message.emoji || '');
    container.appendChild(text);
  }
}

/**
 * Render chat list
 */
export function renderChatList(chats, activeChatId, emptyNoticeEl, chatListEl, onChatClick, onDeleteChat) {
  chatListEl.innerHTML = '';

  const items = Array.from(chats.values()).sort((a, b) => (b.lastDate || 0) - (a.lastDate || 0));

  if (!items.length) {
    if (emptyNoticeEl) {
      chatListEl.appendChild(emptyNoticeEl);
      emptyNoticeEl.style.display = 'block';
    }
    return;
  }

  if (emptyNoticeEl) {
    emptyNoticeEl.style.display = 'none';
  }

  for (const c of items) {
    const el = document.createElement('div');
    el.className = 'chat-item' + (c.id === activeChatId ? ' active' : '');
    el.dataset.chatId = c.id;
    el.innerHTML = `
      <div class="avatar">${c.avatarText}</div>
      <div class="info">
        <div class="name">${c.title}</div>
        <div class="last">${c.lastText ? snippet(c.lastText) : '—'}</div>
      </div>
      <div class="badge${c.unread ? '' : ' hidden'}">${c.unread || ''}</div>
      <button class="delete-chat-btn" title="Xóa chat">🗑️</button>
    `;
    
    // Chat click handler
    el.querySelector('.info, .avatar').addEventListener('click', () => onChatClick(c.id));
    
    // Delete chat button handler
    el.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (onDeleteChat && confirm(`Xóa chat "${c.title}"?`)) {
        onDeleteChat(c.id);
      }
    });
    
    chatListEl.appendChild(el);
  }
}

/**
 * Render all messages for current chat
 */
export function renderChatMessages(chat, messagesEl, onDeleteClick, options = {}) {
  messagesEl.innerHTML = '';
  if (!chat || !chat.messages) return;

  for (const m of chat.messages) {
    renderMessage(m, messagesEl, onDeleteClick, options);
  }
}

/**
 * Clear messages view
 */
export function clearMessagesView(messagesEl) {
  if (messagesEl) {
    messagesEl.innerHTML = '';
  }
}

/**
 * Update header for active chat
 */
export function updateChatHeader(chat, headerTitleEl, activeAvatarEl) {
  if (headerTitleEl) {
    headerTitleEl.textContent = chat?.title || 'Chưa chọn cuộc trò chuyện';
  }

  if (activeAvatarEl) {
    if (chat) {
      activeAvatarEl.textContent = chat.avatarText || '?';
      activeAvatarEl.style.display = 'grid';
    } else {
      activeAvatarEl.style.display = 'none';
    }
  }
}

/**
 * Toggle members button
 */
export function updateMembersButton(chat, membersBtnEl) {
  if (!membersBtnEl) return;

  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    membersBtnEl.style.display = 'block';
  } else {
    membersBtnEl.style.display = 'none';
  }
}

/**
 * Show/hide new messages button
 */
export function maybeShowNewMsgBtn(newMsgBtn, messagesEl) {
  if (!newMsgBtn || !messagesEl) return;

  const atBottom = (messagesEl.scrollTop + messagesEl.clientHeight) >= (messagesEl.scrollHeight - 20);
  if (!atBottom) {
    newMsgBtn.style.display = 'block';
  }
}

/**
 * Render sticker panel
 */
export function renderStickerPanel(stickers, containerEl, onStickerClick) {
  if (!containerEl) return;

  containerEl.innerHTML = '';

  if (!stickers || stickers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'stickers-empty';
    empty.textContent = 'Chưa có sticker nào';
    containerEl.appendChild(empty);
    return;
  }

  stickers.forEach(sticker => {
    const item = document.createElement('div');
    item.className = 'sticker-item';
    item.title = sticker.emoji || 'Sticker';
    
    if (sticker.file_id && sticker.url) {
      if (sticker.is_animated) {
        // Animated sticker placeholder
        item.innerHTML = `<div class="sticker-thumb">${sticker.emoji || '✨'}</div>`;
      } else if (sticker.is_video) {
        const video = document.createElement('video');
        video.src = sticker.url;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.className = 'sticker-thumb';
        item.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = sticker.url;
        img.alt = sticker.emoji || 'Sticker';
        img.className = 'sticker-thumb';
        item.appendChild(img);
      }
    } else {
      item.innerHTML = `<div class="sticker-thumb">${sticker.emoji || '❓'}</div>`;
    }

    item.addEventListener('click', () => {
      if (onStickerClick) onStickerClick(sticker);
    });

    containerEl.appendChild(item);
  });
}
