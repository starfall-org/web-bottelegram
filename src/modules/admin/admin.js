/**
 * Group administration helpers
 */

import * as botAPI from '../api/bot.js';

const ADMIN_PERMISSIONS = {
  can_manage_chat: true,
  can_delete_messages: true,
  can_manage_video_chats: true,
  can_restrict_members: true,
  can_promote_members: true,
  can_change_info: true,
  can_invite_users: true,
  can_pin_messages: true,
  is_anonymous: false
};

const MODERATOR_PERMISSIONS = {
  can_manage_chat: true,
  can_delete_messages: true,
  can_manage_video_chats: true,
  can_restrict_members: true,
  can_promote_members: false,
  can_change_info: true,
  can_invite_users: true,
  can_pin_messages: true,
  is_anonymous: false
};

const DEMOTE_PERMISSIONS = {
  can_manage_chat: false,
  can_delete_messages: false,
  can_manage_video_chats: false,
  can_restrict_members: false,
  can_promote_members: false,
  can_change_info: false,
  can_invite_users: true,
  can_pin_messages: false,
  is_anonymous: false
};

const MEMBER_CHAT_PERMISSIONS = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_change_info: false,
  can_invite_users: true,
  can_pin_messages: false,
  can_manage_topics: false
};

export async function fetchAdministrators(chatId) {
  const res = await botAPI.getChatAdministrators(chatId);
  if (!res.ok) {
    throw new Error(res.description || 'Không thể tải danh sách quản trị viên');
  }
  return res.result || [];
}

export async function fetchMemberDetails(chatId, userId) {
  const res = await botAPI.getChatMember(chatId, userId);
  if (!res.ok) {
    throw new Error(res.description || 'Không thể lấy thông tin thành viên');
  }
  return res.result;
}

export async function applyRole(chatId, userId, role) {
  const targetRole = (role || '').toLowerCase();

  if (targetRole === 'admin' || targetRole === 'administrator') {
    return botAPI.promoteChatMember(chatId, userId, ADMIN_PERMISSIONS);
  }

  if (targetRole === 'moderator') {
    return botAPI.promoteChatMember(chatId, userId, MODERATOR_PERMISSIONS);
  }

  if (targetRole === 'member') {
    await botAPI.promoteChatMember(chatId, userId, DEMOTE_PERMISSIONS);
    return botAPI.restrictChatMember(chatId, userId, MEMBER_CHAT_PERMISSIONS);
  }

  throw new Error('Vai trò không hợp lệ: ' + role);
}

export async function kickMember(chatId, userId, untilDate) {
  return botAPI.banChatMember(chatId, userId, untilDate);
}

export async function updateGroupTitle(chatId, title) {
  return botAPI.setChatTitle(chatId, title);
}

export async function updateGroupDescription(chatId, description) {
  return botAPI.setChatDescription(chatId, description);
}

export async function updateGroupPhoto(chatId, file) {
  return botAPI.setChatPhoto(chatId, file);
}

export function roleLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'creator':
      return '👑 Chủ nhóm';
    case 'administrator':
      return '⭐ Quản trị viên';
    case 'moderator':
      return '🛡️ Điều hành';
    default:
      return '👤 Thành viên';
  }
}

export function isElevated(status) {
  return ['creator', 'administrator', 'moderator'].includes((status || '').toLowerCase());
}
