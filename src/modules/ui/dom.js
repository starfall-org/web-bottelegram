/**
 * DOM element cache
 */

// Chat list
export const chatListEl = () => document.getElementById('chatList');
export const emptyNoticeEl = () => document.getElementById('emptyNotice');

// Messages
export const messagesEl = () => document.getElementById('messages');
export const newMsgBtn = () => document.getElementById('newMsgBtn');

// Input/Composer
export const inputEl = () => document.getElementById('input');
export const sendBtn = () => document.getElementById('sendBtn');
export const attachBtn = () => document.getElementById('attachBtn');
export const fileInputEl = () => document.getElementById('fileInput');
export const replyContext = () => document.getElementById('replyContext');
export const replyText = () => document.getElementById('replyText');
export const cancelReply = () => document.getElementById('cancelReply');

// Header
export const statusEl = () => document.getElementById('status');
export const botInfoEl = () => document.getElementById('botInfo');
export const headerTitleEl = () => document.getElementById('headerTitle');
export const activeAvatarEl = () => document.getElementById('activeAvatar');

// Sidebar
export const sidebarEl = () => document.getElementById('sidebar');
export const menuToggleEl = () => document.getElementById('menuToggle');

// Search
export const searchInputEl = () => document.getElementById('searchInput');
export const searchBtnEl = () => document.getElementById('searchBtn');

// Members
export const membersBtnEl = () => document.getElementById('membersBtn');
export const membersOverlayEl = () => document.getElementById('membersOverlay');
export const membersListEl = () => document.getElementById('membersList');
export const closeMembersBtn = () => document.getElementById('closeMembersBtn');
export const groupInfoEl = () => document.getElementById('groupInfo');
export const membersHintEl = () => document.getElementById('membersHint');

// Settings
export const overlayEl = () => document.getElementById('overlay');
export const settingsBtn = () => document.getElementById('settingsBtn');
export const saveBtn = () => document.getElementById('saveBtn');
export const cancelBtn = () => document.getElementById('cancelBtn');
export const tokenInputEl = () => document.getElementById('tokenInput');
export const proxyInputEl = () => document.getElementById('proxyInput');
export const testBtn = () => document.getElementById('testBtn');
export const deleteWebhookBtn = () => document.getElementById('deleteWebhookBtn');
export const settingsHintEl = () => document.getElementById('settingsHint');
export const notifBtn = () => document.getElementById('notifBtn');

// Toasts
export const toastsEl = () => document.getElementById('toasts');

/**
 * Utility to get all DOM elements at once
 */
export function getCachedElements() {
  return {
    chatListEl: chatListEl(),
    emptyNoticeEl: emptyNoticeEl(),
    messagesEl: messagesEl(),
    newMsgBtn: newMsgBtn(),
    inputEl: inputEl(),
    sendBtn: sendBtn(),
    attachBtn: attachBtn(),
    fileInputEl: fileInputEl(),
    replyContext: replyContext(),
    replyText: replyText(),
    cancelReply: cancelReply(),
    statusEl: statusEl(),
    botInfoEl: botInfoEl(),
    headerTitleEl: headerTitleEl(),
    activeAvatarEl: activeAvatarEl(),
    sidebarEl: sidebarEl(),
    menuToggleEl: menuToggleEl(),
    searchInputEl: searchInputEl(),
    searchBtnEl: searchBtnEl(),
    membersBtnEl: membersBtnEl(),
    membersOverlayEl: membersOverlayEl(),
    membersListEl: membersListEl(),
    closeMembersBtn: closeMembersBtn(),
    groupInfoEl: groupInfoEl(),
    membersHintEl: membersHintEl(),
    overlayEl: overlayEl(),
    settingsBtn: settingsBtn(),
    saveBtn: saveBtn(),
    cancelBtn: cancelBtn(),
    tokenInputEl: tokenInputEl(),
    proxyInputEl: proxyInputEl(),
    testBtn: testBtn(),
    deleteWebhookBtn: deleteWebhookBtn(),
    settingsHintEl: settingsHintEl(),
    notifBtn: notifBtn(),
    toastsEl: toastsEl()
  };
}
