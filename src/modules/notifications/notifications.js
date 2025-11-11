/**
 * Notifications module
 */

import { playBeep, snippet } from '../utils/helpers.js';

let swRegistration = null;
let swRegistrationPromise = null;
let notificationHistory = [];
let currentToast = null;
let maxHistorySize = 50;

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistration) {
    return swRegistration;
  }

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register('/sw.js').then((registration) => {
      swRegistration = registration;
      return registration;
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
      swRegistration = null;
      return null;
    });
  }

  return swRegistrationPromise;
}

export function toastsShow(title, body, toastsEl, options = {}) {
  if (!toastsEl) return;

  // Add to history
  const notification = {
    id: Date.now(),
    title,
    body,
    timestamp: new Date(),
    chatId: options.chatId,
    messageId: options.messageId
  };
  
  notificationHistory.unshift(notification);
  if (notificationHistory.length > maxHistorySize) {
    notificationHistory = notificationHistory.slice(0, maxHistorySize);
  }

  // Remove current toast if exists
  if (currentToast) {
    currentToast.remove();
  }

  const t = document.createElement('div');
  t.className = 'toast compact';
  currentToast = t;

  const content = document.createElement('div');
  content.className = 'toast-content';
  
  const ttl = document.createElement('div');
  ttl.className = 'toast-title';
  ttl.textContent = title;

  const bd = document.createElement('div');
  bd.className = 'toast-body';
  bd.textContent = body;

  content.appendChild(ttl);
  content.appendChild(bd);
  t.appendChild(content);

  // Add history button
  const historyBtn = document.createElement('button');
  historyBtn.className = 'toast-history-btn';
  historyBtn.textContent = '📋';
  historyBtn.title = 'Xem lịch sử thông báo';
  historyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showNotificationHistory(toastsEl);
  });
  t.appendChild(historyBtn);

  // Make clickable if chat info is available
  if (options.chatId) {
    t.style.cursor = 'pointer';
    t.addEventListener('click', () => {
      if (options.scrollToMessage && typeof options.scrollToMessage === 'function') {
        options.scrollToMessage(options.chatId, options.messageId);
      }
    });
  }

  toastsEl.appendChild(t);

  // Auto-hide after 4 seconds
  setTimeout(() => {
    if (currentToast === t) {
      t.remove();
      currentToast = null;
    }
  }, 4000);
}

export async function notifyNewMessage(chat, message, toastsEl, options = {}) {
  const body = chat.lastText || snippet(message.text || message.caption || '[' + (message.type || 'tin nhắn') + ']');
  
  toastsShow(chat.title, body, toastsEl, {
    chatId: chat.id,
    messageId: message.id,
    scrollToMessage: options.scrollToMessage
  });
  
  if (options.playSound !== false) {
    playBeep();
  }

  if (!canUseNotifications()) {
    return;
  }

  if (options.push !== false && document.hidden && Notification.permission === 'granted') {
    try {
      const notificationOptions = {
        body,
        tag: `chat-${chat.id}`,
        data: {
          chatId: chat.id,
          messageId: message.id,
          url: window?.location?.href || ''
        }
      };

      const registration = await ensureServiceWorker();
      if (registration && registration.showNotification) {
        registration.showNotification(chat.title, notificationOptions);
      } else {
        new Notification(chat.title, notificationOptions);
      }
    } catch (err) {
      console.warn('Không thể hiển thị thông báo đẩy:', err);
    }
  }
}

export async function requestNotifications() {
  if (!canUseNotifications()) {
    throw new Error('Trình duyệt không hỗ trợ Web Notifications');
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await ensureServiceWorker();
  }
  return permission;
}

export async function initNotifications() {
  if (!canUseNotifications()) return null;
  return ensureServiceWorker();
}

export async function showMessage(title, body) {
  return new Promise((resolve) => {
    alert(`${title}\n${body}`);
    resolve();
  });
}

/**
 * Show notification history modal
 */
export function showNotificationHistory(toastsEl) {
  if (!toastsEl) return;

  // Remove existing history modal if any
  const existingModal = document.getElementById('notificationHistoryModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'notificationHistoryModal';
  modal.className = 'overlay';
  modal.innerHTML = `
    <div class="dialog dialog-large">
      <div class="dialog-header">
        <h3>Lịch sử thông báo</h3>
        <button class="icon-btn close-history" title="Đóng">✕</button>
      </div>
      <div class="notification-history">
        ${notificationHistory.length === 0 ? '<p class="empty-history">Chưa có thông báo nào</p>' : ''}
        ${notificationHistory.map(notif => `
          <div class="history-item ${notif.chatId ? 'clickable' : ''}" data-chat-id="${notif.chatId || ''}" data-message-id="${notif.messageId || ''}">
            <div class="history-header">
              <div class="history-title">${notif.title}</div>
              <div class="history-time">${formatTime(notif.timestamp)}</div>
            </div>
            <div class="history-body">${notif.body}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add click handlers
  modal.querySelector('.close-history').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Add click handlers for history items
  modal.querySelectorAll('.history-item.clickable').forEach(item => {
    item.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      const messageId = item.dataset.messageId;
      if (chatId && typeof window.scrollToMessage === 'function') {
        window.scrollToMessage(chatId, messageId);
        modal.remove();
      }
    });
  });

  document.body.appendChild(modal);
}

/**
 * Format time for notification history
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString('vi-VN');
}

/**
 * Get notification history
 */
export function getNotificationHistory() {
  return [...notificationHistory];
}

/**
 * Clear notification history
 */
export function clearNotificationHistory() {
  notificationHistory = [];
}
