/**
 * Notifications module
 */

import { playBeep, snippet } from '../utils/helpers.js';

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

export function notifyNewMessage(chat, message, toastsEl) {
  const body = chat.lastText || snippet(message.text || message.caption || '[' + (message.type || 'tin nhắn') + ']');
  toastsShow(chat.title, body, toastsEl);
  playBeep();

  if (Notification.permission === 'granted') {
    try {
      new Notification(chat.title, { body });
    } catch {}
  }
}

export function requestNotifications() {
  return Notification.requestPermission();
}

export async function showMessage(title, body) {
  return new Promise((resolve) => {
    alert(`${title}\n${body}`);
    resolve();
  });
}
