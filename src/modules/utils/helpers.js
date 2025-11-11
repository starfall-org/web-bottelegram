/**
 * Helper utilities
 */

export function fmtTime(tsMs) {
  const d = new Date(tsMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function initials(text) {
  const t = (text || '').trim();
  if (!t) return '?';
  const words = t.split(/\s+/).filter(Boolean);
  const a = words[0]?.[0] || '';
  const b = words[1]?.[0] || '';
  return (a + b).toUpperCase() || a.toUpperCase() || '?';
}

export function snippet(text) {
  return (text || '').replace(/\s+/g, ' ').slice(0, 60);
}

export function senderNameFromMsg(msg) {
  if (msg.from) {
    const n = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
    return n || msg.from.username || 'Người dùng';
  }
  if (msg.author_signature) return msg.author_signature;
  return 'Hệ thống';
}

/**
 * Play notification beep
 */
export function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 680;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 180);
  } catch {}
}

/**
 * Scroll messages to bottom
 */
export function scrollToBottom(messagesEl) {
  if (messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

/**
 * Check if scrolled to bottom
 */
export function isAtBottom(messagesEl) {
  if (!messagesEl) return true;
  return (messagesEl.scrollTop + messagesEl.clientHeight) >= (messagesEl.scrollHeight - 20);
}

/**
 * Create initials avatar
 */
export function createAvatar(text) {
  return initials(text);
}
