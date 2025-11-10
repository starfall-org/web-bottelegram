export interface Message {
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  date: number;
  text: string;
  sent_by_me?: boolean;
  notification?: boolean;
}

// Rich message types based on telegram.html structure
export interface BaseMessage {
  id: number;
  chatId: number;
  side: "left" | "right";
  date: number; // timestamp in ms
  fromName: string;
  reply_to?: number;
  reply_preview?: string;
}

export interface TextMessage extends BaseMessage {
  type: "text";
  text: string;
}

export interface PhotoMessage extends BaseMessage {
  type: "photo";
  mediaUrl: string;
  caption?: string;
}

export interface VideoMessage extends BaseMessage {
  type: "video";
  mediaUrl: string;
  caption?: string;
}

export interface AudioMessage extends BaseMessage {
  type: "audio";
  mediaUrl: string;
  caption?: string;
}

export interface VoiceMessage extends BaseMessage {
  type: "voice";
  mediaUrl: string;
  caption?: string;
}

export interface DocumentMessage extends BaseMessage {
  type: "document";
  mediaUrl: string;
  caption?: string;
  fileName?: string;
}

export interface StickerMessage extends BaseMessage {
  type: "sticker";
  mediaUrl: string;
  stickerFormat: "webp" | "webm" | "tgs";
  emoji?: string;
}

export type RichMessage =
  | TextMessage
  | PhotoMessage
  | VideoMessage
  | AudioMessage
  | VoiceMessage
  | DocumentMessage
  | StickerMessage;

export interface Messages {
  [key: string]: Message[];
}

export interface Chat {
  id: string;
  name: string;
  avatarText?: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unread?: number;
  hasNotification?: boolean;
}

// Rich chat type based on telegram.html structure
export interface RichChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title: string;
  avatarText: string;
  messages: RichMessage[];
  messageIds: Set<number>;
  lastText: string;
  lastDate: number;
  unread: number;
}

// Toast notification type
export interface Toast {
  id: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  duration?: number; // Auto-dismiss duration in ms, defaults to 5000
}

export interface BotData {
  messages: Messages;
  chats: Chat[];
  currentChat: string;
}

// Bot and member types
export interface BotInfo {
  id: number;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
}

export interface ChatMember {
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  status:
    | "creator"
    | "administrator"
    | "member"
    | "restricted"
    | "left"
    | "kicked";
  can_be_edited?: boolean;
  is_member?: boolean;
  can_send_messages?: boolean;
  can_send_media_messages?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_manage_voice_chats?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
}

export interface RenderedMember {
  id: number;
  name: string;
  username?: string;
  status: ChatMember["status"];
  badge: string;
}

// New Telegram store state interfaces
export interface TelegramState {
  token: string;
  proxyBase: string;
  chats: Map<string, RichChat>;
  currentChatId: string | null;
  replyTo: number | null;
  cachedFileUrls: Map<string, string>;
  toastQueue: Toast[];
  botInfo: BotInfo | null;
  isConnected: boolean;
  hasNewerMessages: boolean;
  showSidebar: boolean;
  showSettings: boolean;
  chatAdminStatus: Map<string, boolean>;
}

export interface TelegramActions {
  initializeBot: () => Promise<void>;
  selectChat: (chatId: number) => void;
  markRead: (chatId: number) => void;
  saveState: () => void;
  loadState: () => void;
  setHasNewerMessages: (value: boolean) => void;
  enqueueToast: (
    title: string,
    body: string,
    type?: Toast["type"],
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  sendText: (chatId: number, text: string, replyTo?: number) => Promise<void>;
  sendMedia: (
    chatId: number,
    files: FileList,
    caption?: string,
    replyTo?: number
  ) => Promise<void>;
  sendChatAction: (chatId: number, action: string) => Promise<void>;
  deleteMessage: (chatId: number, messageId: number) => Promise<void>;
  getChat: (chatId: number) => Promise<any>;
  searchChat: (query: string) => Promise<string | null>;
  getChatAdministrators: (chatId: string) => Promise<ChatMember[]>;
  getFileUrl: (fileId: string) => Promise<string>;
  clearReplyContext: () => void;
  setReplyContext: (messageId: number, preview: string) => void;
  setToken: (token: string) => void;
  getTokenPrompt: () => string;
  fetchChatAdministrators: (chatId: string) => Promise<RenderedMember[]>;
  kickMember: (
    chatId: string,
    userId: number,
    userName: string
  ) => Promise<void>;
  toggleAdminStatus: (
    chatId: string,
    userId: number,
    promote: boolean,
    userName: string
  ) => Promise<void>;
  setProxyBase: (proxyBase: string) => void;
  testConnection: () => Promise<string>;
  deleteWebhook: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
  clearChatHistoryForToken: () => void;
}
