/**
 * Telegram Bot API module
 */

let token = '';
let proxyPrefix = '';

export function setToken(newToken) {
  token = newToken;
}

export function setProxy(proxy) {
  proxyPrefix = proxy;
}

function baseUrl() {
  return 'https://api.telegram.org';
}

function fullUrl(method) {
  const u = `${baseUrl()}/bot${token}/${method}`;
  const p = proxyPrefix.trim();
  return p ? p.replace(/\/+$/, '') + '/' + u : u;
}

export function fullFileUrl(filePath) {
  const u = `${baseUrl()}/file/bot${token}/${filePath}`;
  const p = proxyPrefix.trim();
  return p ? p.replace(/\/+$/, '') + '/' + u : u;
}

export async function botGet(method, params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(fullUrl(method) + q);
  return res.json();
}

export async function botPost(method, body) {
  const res = await fetch(fullUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

export async function botForm(method, formData) {
  const res = await fetch(fullUrl(method), {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function getMe() {
  return botGet('getMe');
}

export async function getUpdates(offset, timeout = 0, allowedUpdates = ['message', 'edited_message', 'channel_post', 'edited_channel_post']) {
  return botPost('getUpdates', {
    offset,
    timeout,
    allowed_updates: allowedUpdates
  });
}

export async function sendMessage(chatId, text, replyToMessageId = null) {
  const body = { chat_id: chatId, text };
  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }
  return botPost('sendMessage', body);
}

export async function sendChatAction(chatId, action = 'typing') {
  return botPost('sendChatAction', { chat_id: chatId, action });
}

export async function sendSticker(chatId, stickerFileId) {
  return botPost('sendSticker', { 
    chat_id: chatId, 
    sticker: stickerFileId 
  });
}

export async function deleteMessage(chatId, messageId) {
  return botPost('deleteMessage', {
    chat_id: chatId,
    message_id: parseInt(messageId, 10)
  });
}

export async function getFile(fileId) {
  return botGet('getFile', { file_id: fileId });
}

export async function getChat(chatId) {
  return botPost('getChat', { chat_id: chatId });
}

export async function getChatAdministrators(chatId) {
  return botPost('getChatAdministrators', { chat_id: chatId });
}

export async function banChatMember(chatId, userId, untilDate) {
  const body = {
    chat_id: chatId,
    user_id: userId
  };
  if (untilDate) {
    body.until_date = untilDate;
  }
  return botPost('banChatMember', body);
}

export async function promoteChatMember(chatId, userId, permissions = {}) {
  return botPost('promoteChatMember', {
    chat_id: chatId,
    user_id: userId,
    can_manage_chat: permissions.can_manage_chat !== false,
    can_delete_messages: permissions.can_delete_messages !== false,
    can_manage_video_chats: permissions.can_manage_video_chats !== false,
    can_restrict_members: permissions.can_restrict_members !== false,
    can_promote_members: permissions.can_promote_members || false,
    can_change_info: permissions.can_change_info !== false,
    can_invite_users: permissions.can_invite_users !== false,
    can_pin_messages: permissions.can_pin_messages !== false,
    is_anonymous: permissions.is_anonymous || false
  });
}

export async function restrictChatMember(chatId, userId, permissions = {}, untilDate) {
  const body = {
    chat_id: chatId,
    user_id: userId,
    permissions
  };
  if (untilDate) {
    body.until_date = untilDate;
  }
  return botPost('restrictChatMember', body);
}

export async function getChatMember(chatId, userId) {
  return botPost('getChatMember', { chat_id: chatId, user_id: userId });
}

export async function setChatTitle(chatId, title) {
  return botPost('setChatTitle', { chat_id: chatId, title });
}

export async function setChatDescription(chatId, description) {
  return botPost('setChatDescription', { chat_id: chatId, description });
}

export async function setChatPhoto(chatId, file) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', file);
  return botForm('setChatPhoto', formData);
}

export async function deleteWebhook(dropPendingUpdates = false) {
  return botPost('deleteWebhook', { drop_pending_updates: dropPendingUpdates });
}

export async function getMyCommands(scope, languageCode) {
  const body = {};
  if (scope) body.scope = scope;
  if (languageCode) body.language_code = languageCode;
  return botPost('getMyCommands', body);
}

export async function getMyDescription(languageCode) {
  const body = {};
  if (languageCode) body.language_code = languageCode;
  return botPost('getMyDescription', body);
}

export async function getMyShortDescription(languageCode) {
  const body = {};
  if (languageCode) body.language_code = languageCode;
  return botPost('getMyShortDescription', body);
}
