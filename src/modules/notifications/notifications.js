/**
 * Notifications module
 */

import { playBeep, snippet } from '../utils/helpers.js';

let swRegistration = null;
let swRegistrationPromise = null;

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

export function toastsShow(title, body, toastsEl) {
  if (!toastsEl) return;

  const t = document.createElement('div');
  t.className = 'toast';

  const ttl = document.createElement('div');
  ttl.className = 'title';
  ttl.textContent = title;

  const bd = document.createElement('div');
  bd.className = 'body';
  bd.textContent = body;

  t.appendChild(ttl);
  t.appendChild(bd);
  toastsEl.appendChild(t);

  setTimeout(() => t.remove(), 4000);
}

export async function notifyNewMessage(chat, message, toastsEl, options = {}) {
  const body = chat.lastText || snippet(message.text || message.caption || '[' + (message.type || 'tin nhắn') + ']');
  toastsShow(chat.title, body, toastsEl);
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
