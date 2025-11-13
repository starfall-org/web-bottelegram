/**
 * Translation strings for English and Vietnamese
 */

export const translations = {
  en: {
    // App title and general
    appTitle: 'Telegram Bot',
    loading: 'Loading...',
    saving: 'Saving...',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    refresh: 'Refresh',
    search: 'Search',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    you: 'You',
    user: 'User',
    
    // Connection status
    statusDisconnected: 'Not connected (missing token)',
    statusConnecting: 'Connecting...',
    statusConnected: 'Receiving updates...',
    statusError: 'Error: {error}',
    
    // Chat list
    noChatSelected: 'No chat selected',
    noConversations: 'No conversations yet. When messages arrive, they will appear here.',
    enterChatId: 'Enter chat ID or @username',
    openChat: 'Open chat',
    
    // Message composer
    enterMessage: 'Type a message...',
    noConversationSelected: 'No conversation selected',
    send: 'Send',
    attach: 'Attach',
    sticker: 'Sticker',
    replyingTo: 'Replying to:',
    cancelReply: 'Cancel reply',
    newMessage: '↓ New message',
    
    // Messages
    deleteMessage: 'Delete message',
    confirmDelete: 'Are you sure you want to delete this message?',
    messageDeleted: 'Message deleted',
    messageSendFailed: 'Send failed: {error}',
    networkError: 'Network error: {error}',
    photo: 'Photo',
    file: 'File',
    unsupportedContent: '[Cannot display this content type]',
    animatedSticker: '[Animated sticker]',
    
    // Settings dialog
    settingsTitle: 'Settings',
    botConnection: 'Bot Connection',
    botToken: 'Bot Token (botXXXXXXXX:YYYYYYYYYYYYYYYY)',
    corsProxy: 'CORS proxy prefix (optional, e.g.: https://cors.isomorphic-git.org/)',
    testConnection: 'Test',
    deleteWebhook: 'Delete webhook',
    enableNotifications: 'Enable notifications',
    saveAndConnect: 'Save & Connect',
    settingsHint: 'If you get a 409 error while polling, delete the webhook. If you have CORS issues, add a proxy prefix.',
    enterToken: '❌ Enter Bot Token!',
    tokenMissing: 'Token not found.',
    connectionOk: '✅ OK: @{username} • id={id}',
    connectionNoUsername: '(no username)',
    connectionFailed: '❌ getMe error: {error}',
    connectionNetworkError: '❌ CORS or network error: {error}',
    webhookDeleted: '✅ Webhook deleted.',
    webhookDeleteFailed: '❌ Could not delete: {error}',
    webhookDeleteNetworkError: '❌ Network error deleting webhook: {error}',
    notificationsGranted: '✅ Notifications: permission granted.',
    notificationsDenied: '❌ Notifications: denied or not granted.',
    unknownError: 'Unknown error',
    
    // Theme
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    changeTheme: 'Change theme',
    
    // Language
    language: 'Language',
    languageEnglish: 'English',
    languageVietnamese: 'Tiếng Việt',
    
    // Bot info
    botInfo: 'Bot Information',
    botName: 'Name:',
    botUsername: 'Username:',
    botId: 'Bot ID:',
    botDescription: 'Description:',
    botShortDescription: 'Short description:',
    botCommands: 'Command list',
    botFeatures: 'Supported features',
    noData: '—',
    
    // Features
    featureThemes: 'Light / dark / system theme',
    featurePushNotifications: 'Push notifications for new messages',
    featureChatHistory: 'Save chat history in browser',
    featureMemberManagement: 'Member management & permissions',
    featureSendMessages: 'Send text and media messages',
    
    // Preferences
    preferences: 'Preferences',
    prefAutoScroll: 'Auto-scroll to new messages',
    prefSound: 'Notification sound',
    prefPush: 'Push notifications when tab is inactive',
    
    // Members & Groups
    manageMembers: 'Manage members',
    groupManagement: 'Group Management',
    members: 'Members',
    groupInfo: 'Group Info',
    groupName: 'Group name',
    groupDescription: 'Description',
    groupPhoto: 'Profile picture',
    saveChanges: 'Save changes',
    loadingMembers: 'Loading...',
    memberCount: '{count} members',
    memberInfo: 'Member Information',
    memberName: 'Name',
    memberUsername: 'Username',
    memberId: 'ID',
    memberStatus: 'Status',
    memberJoined: 'Joined',
    memberActions: 'Member Actions',
    
    // Member statuses
    statusCreator: 'Creator',
    statusAdministrator: 'Administrator',
    statusModerator: 'Moderator',
    statusMember: 'Member',
    statusRestricted: 'Restricted',
    statusLeft: 'Left',
    statusKicked: 'Kicked',
    
    // Member actions
    promoteAdmin: '⭐ Promote to admin',
    promoteModerator: '🛡️ Moderator',
    demoteToMember: '👤 Member',
    kickUser: '🚫 Kick',
    copyId: '📋 Copy ID',
    copyUsername: '📋 Copy username',
    restrictUser: '🔒 Restrict permissions',
    userActions: 'User Actions',
    
    // Notifications and toasts
    success: '✅ Success',
    error: '❌ Error',
    warning: '⚠️ Warning',
    info: 'ℹ️ Info',
    searching: '🔍 Searching...',
    found: '✅ Found',
    notFound: '❌ Not found',
    
    // Specific notifications
    pleaseSelectChat: 'Please select a chat first.',
    needToken: 'You need to enter a token.',
    pleaseSelectConversation: 'Please select a conversation.',
    enterChatIdOrUsername: 'Please enter chat ID or username',
    searchingForUser: 'Searching for @{username}',
    chatNotFound: 'Chat does not exist or bot does not have access',
    searchError: 'Error during search: {error}',
    idCopied: 'ID copied to clipboard',
    usernameCopied: 'Username copied to clipboard',
    memberKicked: 'Member kicked',
    memberPromoted: 'Member promoted',
    memberDemoted: 'Member demoted',
    permissionDenied: 'Permission denied',
    cannotDeleteMessage: 'Cannot delete message (check bot permissions)',
    
    // Webhook errors
    webhookActive: 'Webhook is active. Delete webhook in Settings.',
    getUpdatesError: 'getUpdates error: {error}',
    corsError: 'CORS or network error during getUpdates',
    
    // Chat actions
    chatAction: 'typing...',
    
    // Group settings
    groupSettingsSaved: 'Group settings saved',
    groupSettingsFailed: 'Failed to save group settings: {error}',
    
    // File selection
    selectFile: 'No file or chat selected.',
    fileSendFailed: 'File send failed: {error}',
    
    // Admin actions
    kickConfirm: 'Are you sure you want to kick {name}?',
    promoteConfirm: 'Promote {name} to administrator?',
    demoteConfirm: 'Demote {name} to regular member?',
    
    // Sticker panel
    closeStickerPanel: 'Close',
    noStickers: 'No stickers yet. Received stickers will appear here.',
    
    // Errors
    errorUnknown: 'Unknown error',
    errorNetwork: 'Network error',
    errorPermission: 'Permission error',
    errorNotFound: 'Not found',
  },
  
  vi: {
    // App title and general
    appTitle: 'Telegram Bot',
    loading: 'Đang tải...',
    saving: 'Đang lưu...',
    save: 'Lưu',
    cancel: 'Hủy',
    close: 'Đóng',
    delete: 'Xóa',
    refresh: 'Làm mới',
    search: 'Tìm kiếm',
    ok: 'OK',
    yes: 'Có',
    no: 'Không',
    you: 'Bạn',
    user: 'Người dùng',
    
    // Connection status
    statusDisconnected: 'Chưa kết nối (thiếu token)',
    statusConnecting: 'Đang kết nối...',
    statusConnected: 'Đang nhận cập nhật...',
    statusError: 'Lỗi: {error}',
    
    // Chat list
    noChatSelected: 'Chưa chọn cuộc trò chuyện',
    noConversations: 'Chưa có cuộc trò chuyện. Khi có tin nhắn đến, mục sẽ hiện ở đây.',
    enterChatId: 'Nhập chat ID hoặc @username',
    openChat: 'Mở chat',
    
    // Message composer
    enterMessage: 'Nhập tin nhắn...',
    noConversationSelected: 'Chưa chọn cuộc trò chuyện',
    send: 'Gửi',
    attach: 'Đính kèm',
    sticker: 'Sticker',
    replyingTo: 'Đang trả lời:',
    cancelReply: 'Hủy trả lời',
    newMessage: '↓ Tin mới',
    
    // Messages
    deleteMessage: 'Xóa tin nhắn',
    confirmDelete: 'Bạn có chắc muốn xóa tin nhắn này?',
    messageDeleted: 'Đã xóa tin nhắn',
    messageSendFailed: 'Gửi thất bại: {error}',
    networkError: 'Lỗi mạng: {error}',
    photo: 'Ảnh',
    file: 'Tệp',
    unsupportedContent: '[Không hiển thị loại nội dung này]',
    animatedSticker: '[Sticker động]',
    
    // Settings dialog
    settingsTitle: 'Trung tâm cài đặt',
    botConnection: 'Kết nối bot',
    botToken: 'Bot Token (botXXXXXXXX:YYYYYYYYYYYYYYYY)',
    corsProxy: 'CORS proxy prefix (tuỳ chọn, vd: https://cors.isomorphic-git.org/)',
    testConnection: 'Kiểm tra',
    deleteWebhook: 'Xóa webhook',
    enableNotifications: 'Bật thông báo',
    saveAndConnect: 'Lưu & Kết nối',
    settingsHint: 'Nếu nhận lỗi 409 khi polling, hãy xóa webhook. Nếu bị CORS, thêm proxy prefix.',
    enterToken: '❌ Nhập Bot Token!',
    tokenMissing: 'Chưa có token.',
    connectionOk: '✅ OK: @{username} • id={id}',
    connectionNoUsername: '(không tên)',
    connectionFailed: '❌ Lỗi getMe: {error}',
    connectionNetworkError: '❌ CORS hoặc mạng lỗi: {error}',
    webhookDeleted: '✅ Đã xóa webhook.',
    webhookDeleteFailed: '❌ Không xóa được: {error}',
    webhookDeleteNetworkError: '❌ Lỗi mạng khi xóa webhook: {error}',
    notificationsGranted: '✅ Thông báo: đã cấp quyền.',
    notificationsDenied: '❌ Thông báo: bị từ chối hoặc chưa cấp.',
    unknownError: 'Không rõ',
    
    // Theme
    theme: 'Giao diện',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeSystem: 'Hệ thống',
    changeTheme: 'Đổi giao diện',
    
    // Language
    language: 'Ngôn ngữ',
    languageEnglish: 'English',
    languageVietnamese: 'Tiếng Việt',
    
    // Bot info
    botInfo: 'Thông tin bot',
    botName: 'Tên:',
    botUsername: 'Username:',
    botId: 'Bot ID:',
    botDescription: 'Mô tả:',
    botShortDescription: 'Mô tả ngắn:',
    botCommands: 'Danh sách lệnh',
    botFeatures: 'Tính năng hỗ trợ',
    noData: '—',
    
    // Features
    featureThemes: 'Giao diện sáng / tối / hệ thống',
    featurePushNotifications: 'Thông báo đẩy khi có tin nhắn mới',
    featureChatHistory: 'Lưu lịch sử hội thoại trong trình duyệt',
    featureMemberManagement: 'Quản lý thành viên & chỉnh sửa quyền',
    featureSendMessages: 'Gửi tin nhắn văn bản và media',
    
    // Preferences
    preferences: 'Tùy chọn',
    prefAutoScroll: 'Tự động cuộn đến tin mới',
    prefSound: 'Âm báo thông báo',
    prefPush: 'Thông báo đẩy khi tab không hoạt động',
    
    // Members & Groups
    manageMembers: 'Quản lý thành viên',
    groupManagement: 'Quản lý nhóm',
    members: 'Thành viên',
    groupInfo: 'Thông tin nhóm',
    groupName: 'Tên nhóm',
    groupDescription: 'Mô tả',
    groupPhoto: 'Ảnh đại diện',
    saveChanges: 'Lưu thay đổi',
    loadingMembers: 'Đang tải...',
    memberCount: '{count} thành viên',
    memberInfo: 'Thông tin thành viên',
    memberName: 'Tên',
    memberUsername: 'Username',
    memberId: 'ID',
    memberStatus: 'Trạng thái',
    memberJoined: 'Tham gia',
    memberActions: 'Tác vụ',
    
    // Member statuses
    statusCreator: 'Chủ nhóm',
    statusAdministrator: 'Quản trị viên',
    statusModerator: 'Người kiểm duyệt',
    statusMember: 'Thành viên',
    statusRestricted: 'Bị hạn chế',
    statusLeft: 'Đã rời',
    statusKicked: 'Đã bị kick',
    
    // Member actions
    promoteAdmin: '⭐ Thăng admin',
    promoteModerator: '🛡️ Moderator',
    demoteToMember: '👤 Thành viên',
    kickUser: '🚫 Kick',
    copyId: '📋 Copy ID',
    copyUsername: '📋 Copy username',
    restrictUser: '🔒 Hạn chế quyền',
    userActions: 'Tác vụ với người dùng',
    
    // Notifications and toasts
    success: '✅ Thành công',
    error: '❌ Lỗi',
    warning: '⚠️ Chú ý',
    info: 'ℹ️ Thông tin',
    searching: '🔍 Đang tìm...',
    found: '✅ Tìm thấy',
    notFound: '❌ Không tìm thấy',
    
    // Specific notifications
    pleaseSelectChat: 'Chọn chat trước.',
    needToken: 'Bạn cần nhập token.',
    pleaseSelectConversation: 'Hãy chọn cuộc trò chuyện.',
    enterChatIdOrUsername: 'Vui lòng nhập chat ID hoặc username',
    searchingForUser: 'Đang tìm @{username}',
    chatNotFound: 'Chat không tồn tại hoặc bot chưa có quyền truy cập',
    searchError: 'Lỗi khi tìm kiếm: {error}',
    idCopied: 'Đã copy ID',
    usernameCopied: 'Đã copy username',
    memberKicked: 'Đã kick thành viên',
    memberPromoted: 'Đã thăng chức',
    memberDemoted: 'Đã hạ chức',
    permissionDenied: 'Không đủ quyền',
    cannotDeleteMessage: 'Không thể xóa tin nhắn (kiểm tra quyền của bot)',
    
    // Webhook errors
    webhookActive: 'Webhook đang hoạt động. Xóa webhook trong Cài đặt.',
    getUpdatesError: 'Lỗi getUpdates: {error}',
    corsError: 'CORS hoặc mạng lỗi khi getUpdates',
    
    // Chat actions
    chatAction: 'đang nhập...',
    
    // Group settings
    groupSettingsSaved: 'Đã lưu cài đặt nhóm',
    groupSettingsFailed: 'Không thể lưu cài đặt nhóm: {error}',
    
    // File selection
    selectFile: 'Chưa chọn chat hoặc tệp.',
    fileSendFailed: 'Gửi file thất bại: {error}',
    
    // Admin actions
    kickConfirm: 'Bạn có chắc muốn kick {name}?',
    promoteConfirm: 'Thăng {name} lên quản trị viên?',
    demoteConfirm: 'Hạ {name} xuống thành viên thường?',
    
    // Sticker panel
    closeStickerPanel: 'Đóng',
    noStickers: 'Chưa có sticker. Sticker nhận được sẽ hiện ở đây.',
    
    // Errors
    errorUnknown: 'Lỗi không xác định',
    errorNetwork: 'Lỗi mạng',
    errorPermission: 'Lỗi quyền',
    errorNotFound: 'Không tìm thấy',
  }
};
