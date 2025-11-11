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
export const stickerBtn = () => document.getElementById('stickerBtn');
export const fileInputEl = () => document.getElementById('fileInput');
export const replyContext = () => document.getElementById('replyContext');
export const replyText = () => document.getElementById('replyText');
export const cancelReply = () => document.getElementById('cancelReply');

// Sticker Panel
export const stickerPanel = () => document.getElementById('stickerPanel');
export const closeStickerBtn = () => document.getElementById('closeStickerBtn');
export const stickerList = () => document.getElementById('stickerList');

// User Actions
export const userActionsMenu = () => document.getElementById('userActionsMenu');
export const userActionsTitle = () => document.getElementById('userActionsTitle');
export const closeUserActionsBtn = () => document.getElementById('closeUserActionsBtn');
export const kickUserBtn = () => document.getElementById('kickUserBtn');
export const promoteUserBtn = () => document.getElementById('promoteUserBtn');
export const moderateUserBtn = () => document.getElementById('moderateUserBtn');
export const demoteUserBtn = () => document.getElementById('demoteUserBtn');
export const restrictUserBtn = () => document.getElementById('restrictUserBtn');

// Header
export const statusEl = () => document.getElementById('status');
export const botInfoEl = () => document.getElementById('botInfo');
export const headerTitleEl = () => document.getElementById('headerTitle');
export const activeAvatarEl = () => document.getElementById('activeAvatar');
export const themeToggleBtn = () => document.getElementById('themeToggleBtn');

// Sidebar
export const sidebarEl = () => document.getElementById('sidebar');
export const menuToggleEl = () => document.getElementById('menuToggle');

// Open chat
export const openChatInputEl = () => document.getElementById('openChatInput');
export const openChatBtnEl = () => document.getElementById('openChatBtn');

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
export const themeOptionLight = () => document.getElementById('themeOptionLight');
export const themeOptionDark = () => document.getElementById('themeOptionDark');
export const themeOptionSystem = () => document.getElementById('themeOptionSystem');
export const botDetailNameEl = () => document.getElementById('botDetailName');
export const botDetailUsernameEl = () => document.getElementById('botDetailUsername');
export const botDetailIdEl = () => document.getElementById('botDetailId');
export const botDetailDescriptionEl = () => document.getElementById('botDetailDescription');
export const botDetailShortDescriptionEl = () => document.getElementById('botDetailShortDescription');
export const botCommandsListEl = () => document.getElementById('botCommandsList');
export const botFeatureListEl = () => document.getElementById('botFeatureList');
export const prefAutoScrollEl = () => document.getElementById('prefAutoScroll');
export const prefSoundEl = () => document.getElementById('prefSound');
export const prefPushEl = () => document.getElementById('prefPush');

// Group management
export const membersTabBtn = () => document.getElementById('membersTabBtn');
export const groupTabBtn = () => document.getElementById('groupTabBtn');
export const membersTabPanel = () => document.getElementById('membersTab');
export const groupSettingsTab = () => document.getElementById('groupSettingsTab');
export const refreshMembersBtn = () => document.getElementById('refreshMembersBtn');
export const groupNameInputEl = () => document.getElementById('groupNameInput');
export const groupDescriptionInputEl = () => document.getElementById('groupDescriptionInput');
export const groupPhotoInputEl = () => document.getElementById('groupPhotoInput');
export const saveGroupBtn = () => document.getElementById('saveGroupBtn');

// Member modal
export const memberModalEl = () => document.getElementById('memberModal');
export const memberModalAvatarEl = () => document.getElementById('memberModalAvatar');
export const memberModalNameEl = () => document.getElementById('memberModalName');
export const memberModalUsernameEl = () => document.getElementById('memberModalUsername');
export const memberModalIdEl = () => document.getElementById('memberModalId');
export const memberModalStatusEl = () => document.getElementById('memberModalStatus');
export const memberModalJoinedEl = () => document.getElementById('memberModalJoined');
export const memberPromoteBtn = () => document.getElementById('memberPromoteBtn');
export const memberModeratorBtn = () => document.getElementById('memberModeratorBtn');
export const memberDemoteBtn = () => document.getElementById('memberDemoteBtn');
export const memberKickBtn = () => document.getElementById('memberKickBtn');
export const closeMemberModalBtn = () => document.getElementById('closeMemberModalBtn');

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
    themeToggleBtn: themeToggleBtn(),
    sidebarEl: sidebarEl(),
    menuToggleEl: menuToggleEl(),
    openChatInputEl: openChatInputEl(),
    openChatBtnEl: openChatBtnEl(),
    membersBtnEl: membersBtnEl(),
    membersOverlayEl: membersOverlayEl(),
    membersListEl: membersListEl(),
    closeMembersBtn: closeMembersBtn(),
    groupInfoEl: groupInfoEl(),
    membersHintEl: membersHintEl(),
    membersTabBtn: membersTabBtn(),
    groupTabBtn: groupTabBtn(),
    membersTabPanel: membersTabPanel(),
    groupSettingsTab: groupSettingsTab(),
    refreshMembersBtn: refreshMembersBtn(),
    groupNameInputEl: groupNameInputEl(),
    groupDescriptionInputEl: groupDescriptionInputEl(),
    groupPhotoInputEl: groupPhotoInputEl(),
    saveGroupBtn: saveGroupBtn(),
    memberModalEl: memberModalEl(),
    memberModalAvatarEl: memberModalAvatarEl(),
    memberModalNameEl: memberModalNameEl(),
    memberModalUsernameEl: memberModalUsernameEl(),
    memberModalIdEl: memberModalIdEl(),
    memberModalStatusEl: memberModalStatusEl(),
    memberModalJoinedEl: memberModalJoinedEl(),
    memberPromoteBtn: memberPromoteBtn(),
    memberModeratorBtn: memberModeratorBtn(),
    memberDemoteBtn: memberDemoteBtn(),
    memberKickBtn: memberKickBtn(),
    closeMemberModalBtn: closeMemberModalBtn(),
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
    themeOptionLight: themeOptionLight(),
    themeOptionDark: themeOptionDark(),
    themeOptionSystem: themeOptionSystem(),
    botDetailNameEl: botDetailNameEl(),
    botDetailUsernameEl: botDetailUsernameEl(),
    botDetailIdEl: botDetailIdEl(),
    botDetailDescriptionEl: botDetailDescriptionEl(),
    botDetailShortDescriptionEl: botDetailShortDescriptionEl(),
    botCommandsListEl: botCommandsListEl(),
    botFeatureListEl: botFeatureListEl(),
    prefAutoScrollEl: prefAutoScrollEl(),
    prefSoundEl: prefSoundEl(),
    prefPushEl: prefPushEl(),
    toastsEl: toastsEl(),
    stickerBtn: stickerBtn(),
    stickerPanel: stickerPanel(),
    closeStickerBtn: closeStickerBtn(),
    stickerList: stickerList(),
    userActionsMenu: userActionsMenu(),
    userActionsTitle: userActionsTitle(),
    closeUserActionsBtn: closeUserActionsBtn(),
    kickUserBtn: kickUserBtn(),
    promoteUserBtn: promoteUserBtn(),
    moderateUserBtn: moderateUserBtn(),
    demoteUserBtn: demoteUserBtn(),
    restrictUserBtn: restrictUserBtn()
  };
}
