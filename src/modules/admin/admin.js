/**
 * Admin actions module
 */

import * as botAPI from '../api/bot.js';
import { toastsShow } from '../notifications/notifications.js';

/**
 * Show members dialog
 */
export async function showMembers(activeChatId, chat, membersOverlayEl, groupInfoEl, membersListEl, membersHintEl, toastsEl, onKickMember, onToggleAdmin) {
  if (!activeChatId) return;

  if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
    toastsShow('⚠️ Chú ý', 'Chỉ áp dụng cho nhóm', toastsEl);
    return;
  }

  if (membersOverlayEl) {
    membersOverlayEl.classList.remove('hidden');
  }

  if (groupInfoEl) {
    groupInfoEl.textContent = `Nhóm: ${chat.title}`;
  }

  if (membersListEl) {
    membersListEl.innerHTML = '<div style="padding:20px;text-align:center;">Đang tải...</div>';
  }

  if (membersHintEl) {
    membersHintEl.textContent = '';
  }

  try {
    const admins = await botAPI.getChatAdministrators(activeChatId);

    if (admins.ok) {
      if (membersListEl) {
        membersListEl.innerHTML = '';

        if (admins.result.length === 0) {
          membersListEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">Không có thành viên</div>';
          return;
        }

        for (const member of admins.result) {
          const item = document.createElement('div');
          item.className = 'member-item';

          const info = document.createElement('div');
          info.className = 'member-info';

          const name = document.createElement('div');
          name.className = 'member-name';
          name.textContent = [member.user.first_name, member.user.last_name].filter(Boolean).join(' ') || member.user.username || 'User';

          const status = document.createElement('div');
          status.className = 'member-status';
          status.textContent = member.status === 'creator' ? '👑 Chủ nhóm' : member.status === 'administrator' ? '⭐ Quản trị viên' : member.status;

          info.appendChild(name);
          info.appendChild(status);

          const actions = document.createElement('div');
          actions.className = 'member-actions';

          if (member.status !== 'creator') {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'btn danger';
            kickBtn.style.fontSize = '0.75rem';
            kickBtn.style.padding = '4px 8px';
            kickBtn.textContent = 'Kick';
            kickBtn.addEventListener('click', () => {
              if (onKickMember) {
                onKickMember(member.user.id, name.textContent);
              }
            });

            const promoteBtn = document.createElement('button');
            promoteBtn.className = 'btn secondary';
            promoteBtn.style.fontSize = '0.75rem';
            promoteBtn.style.padding = '4px 8px';
            promoteBtn.textContent = member.status === 'administrator' ? 'Hạ quyền' : 'Thăng quyền';
            promoteBtn.addEventListener('click', () => {
              if (onToggleAdmin) {
                onToggleAdmin(member.user.id, member.status !== 'administrator', name.textContent);
              }
            });

            actions.appendChild(promoteBtn);
            actions.appendChild(kickBtn);
          }

          item.appendChild(info);
          item.appendChild(actions);
          membersListEl.appendChild(item);
        }

        if (membersHintEl) {
          membersHintEl.textContent = `${admins.result.length} quản trị viên`;
        }
      }
    } else {
      if (membersListEl) {
        membersListEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger);">Lỗi: ${admins.description || 'Không thể tải thành viên'}</div>`;
      }
      if (membersHintEl) {
        membersHintEl.textContent = 'Bot cần là quản trị viên để xem danh sách';
      }
    }
  } catch (e) {
    if (membersListEl) {
      membersListEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger);">Lỗi mạng: ${e.message}</div>`;
    }
  }
}

/**
 * Kick member from group
 */
export async function kickMember(activeChatId, userId, userName, toastsEl, onRefresh) {
  if (!confirm(`Kick ${userName} khỏi nhóm?`)) return;

  try {
    const res = await botAPI.banChatMember(activeChatId, userId);

    if (res.ok) {
      toastsShow('✅ Thành công', `Đã kick ${userName}`, toastsEl);
      if (onRefresh) {
        onRefresh();
      }
    } else {
      toastsShow('❌ Lỗi', res.description || 'Không thể kick thành viên', toastsEl);
    }
  } catch (e) {
    toastsShow('❌ Lỗi', 'Lỗi mạng: ' + e.message, toastsEl);
  }
}

/**
 * Toggle admin status
 */
export async function toggleAdmin(activeChatId, userId, promote, userName, toastsEl, onRefresh) {
  try {
    const res = await botAPI.promoteChatMember(activeChatId, userId, {
      can_manage_chat: promote,
      can_delete_messages: promote,
      can_manage_video_chats: promote,
      can_restrict_members: promote,
      can_promote_members: false,
      can_change_info: promote,
      can_invite_users: promote,
      can_pin_messages: promote
    });

    if (res.ok) {
      toastsShow('✅ Thành công', `Đã ${promote ? 'thăng' : 'hạ'} quyền ${userName}`, toastsEl);
      if (onRefresh) {
        onRefresh();
      }
    } else {
      toastsShow('❌ Lỗi', res.description || 'Không thể thay đổi quyền', toastsEl);
    }
  } catch (e) {
    toastsShow('❌ Lỗi', 'Lỗi mạng: ' + e.message, toastsEl);
  }
}
