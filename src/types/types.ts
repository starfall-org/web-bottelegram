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
  chatId: string;
  side: 'left' | 'right';
  date: number; // timestamp in ms
  fromName: string;
  reply_to?: number;
  reply_preview?: string;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
}

export interface PhotoMessage extends BaseMessage {
  type: 'photo';
  mediaUrl: string;
  caption?: string;
}

export interface VideoMessage extends BaseMessage {
  type: 'video';
  mediaUrl: string;
  caption?: string;
}

export interface AudioMessage extends BaseMessage {
  type: 'audio';
  mediaUrl: string;
  caption?: string;
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  mediaUrl: string;
  caption?: string;
}

export interface DocumentMessage extends BaseMessage {
  type: 'document';
  mediaUrl: string;
  caption?: string;
  fileName?: string;
}

export interface StickerMessage extends BaseMessage {
  type: 'sticker';
  mediaUrl: string;
  stickerFormat: 'webp' | 'webm' | 'tgs';
  emoji?: string;
}

export type RichMessage = TextMessage | PhotoMessage | VideoMessage | AudioMessage | VoiceMessage | DocumentMessage | StickerMessage;

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
  id: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
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
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  duration?: number; // Auto-dismiss duration in ms, defaults to 5000
}

export interface BotData {
  messages: Messages;
  chats: Chat[];
  currentChat: string;
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
}

export interface TelegramActions {
  initializeBot: () => Promise<void>;
  selectChat: (chatId: string) => void;
  markRead: (chatId: string) => void;
  saveState: () => void;
  loadState: () => void;
  setHasNewerMessages: (value: boolean) => void;
  enqueueToast: (title: string, body: string, type?: Toast['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  sendText: (chatId: string, text: string, replyTo?: number) => Promise<void>;
  sendMedia: (chatId: string, files: FileList, caption?: string, replyTo?: number) => Promise<void>;
  sendChatAction: (chatId: string, action: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: number) => Promise<void>;
  getChat: (chatId: string) => Promise<any>;
  getChatAdministrators: (chatId: string) => Promise<any>;
  getFileUrl: (fileId: string) => Promise<string>;
  clearReplyContext: () => void;
  setReplyContext: (messageId: number, preview: string) => void;
  setToken: (token: string) => void;
  getTokenPrompt: () => string;
}

export interface BotInfo {
  id: number;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
} 