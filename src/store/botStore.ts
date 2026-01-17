import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    BotState,
    BotInfo,
    BotData,
    Chat,
    ChatMember,
    Message,
    StickerEntry,
} from "./types";
import {
    createDefaultBotData,
    createDefaultBotInfo,
    createDefaultChat,
} from "./defaults";
import { partializeState, rehydrateState } from "./persistence";

const DEFAULT_BOT_INFO: BotInfo = createDefaultBotInfo();

// Re-export types for convenience
export type {
    Message,
    Member,
    ChatMember,
    Chat,
    BotCommand,
    BotInfo,
    StickerEntry,
    BotData,
    BotState,
} from "./types";

export const useBotStore = create<BotState>()(
    persist(
        (set: any, get: any): BotState => ({
            // Initial state
            token: "",
            isConnected: false,
            isPolling: false,
            pollingStatus: "idle",
            lastError: null,
            botDataMap: new Map(),
            replyTo: null,
            editingMessageId: null,
            theme: "system",
            language: "vi",
            preferences: {
                autoScroll: true,
                sound: true,
                push: true,
                parseMode: 'MarkdownV2',
            },

            // Actions
            setToken: (token: string) => {
                set({ token });
                // Ensure bot data exists for this token
                if (token) {
                    const state = get();
                    if (!state.botDataMap || !state.botDataMap.has(token)) {
                        set((state: BotState) => ({
                            botDataMap: new Map(
                                state.botDataMap || new Map(),
                            ).set(token, createDefaultBotData()),
                        }));
                    }
                }
            },

            setConnected: (isConnected: boolean) => set({ isConnected }),
            setPolling: (isPolling: boolean) => set({ isPolling }),
            setPollingStatus: (pollingStatus: "idle" | "polling" | "error") =>
                set({ pollingStatus }),
            setLastError: (lastError: string | null) => set({ lastError }),

            setBotInfo: (info: Partial<BotInfo>) => {
                const state = get();
                if (!state.token) return;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const updatedBotData = {
                    ...currentBotData,
                    botInfo: { ...currentBotData.botInfo, ...info },
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            setActiveChatId: (activeChatId: string | null) => {
                const state = get();
                if (!state.token) return;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const updatedBotData = {
                    ...currentBotData,
                    activeChatId,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            setReplyTo: (replyTo: string | null) => set({ replyTo }),
            setEditingMessageId: (editingMessageId: string | null) =>
                set({ editingMessageId }),
            setTheme: (theme: "light" | "dark" | "system") => set({ theme }),
            setLanguage: (language: "vi" | "en") => set({ language }),
            updatePreferences: (prefs: Partial<BotState["preferences"]>) =>
                set((state: BotState) => ({
                    preferences: { ...state.preferences, ...prefs },
                })),

            setLastUpdateId: (lastUpdateId: number) => {
                const state = get();
                if (!state.token) return;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const updatedBotData = {
                    ...currentBotData,
                    lastUpdateId,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            // Chat actions
            getOrCreateChat: (
                chatId: string,
                initialData: Partial<Chat> = {},
            ) => {
                const state = get();
                if (!state.token) return createDefaultChat(chatId, initialData);

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                let chat = currentBotData.chats.get(chatId);

                if (!chat) {
                    chat = createDefaultChat(chatId, initialData);
                    const updatedChats = new Map(currentBotData.chats).set(
                        chatId,
                        chat,
                    );
                    const updatedBotData = {
                        ...currentBotData,
                        chats: updatedChats,
                    };

                    set((state: BotState) => ({
                        botDataMap: new Map(state.botDataMap).set(
                            state.token,
                            updatedBotData,
                        ),
                    }));
                }

                return chat;
            },

            addMessage: (chatId: string, message: Message) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return false;

                if (chat.messageIds.has(message.id)) {
                    return false; // Already exists
                }

                const updatedChat = {
                    ...chat,
                    messages: [...chat.messages, message],
                    messageIds: new Set([...chat.messageIds, message.id]),
                    lastText:
                        message.type === "text"
                            ? message.text || ""
                            : message.caption ||
                              message.text ||
                              `[${message.type}]`,
                    lastDate: message.date,
                };

                const updatedChats = new Map(currentBotData.chats).set(
                    chatId,
                    updatedChat,
                );
                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return true;
            },

            removeMessage: (chatId: string, messageId: number | string) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return false;

                const messageIndex = chat.messages.findIndex(
                    (m: Message) => m.id === messageId,
                );
                if (messageIndex === -1) return false;

                const updatedMessages = [...chat.messages];
                updatedMessages.splice(messageIndex, 1);

                const updatedMessageIds = new Set(chat.messageIds);
                updatedMessageIds.delete(messageId);

                const updatedChat = {
                    ...chat,
                    messages: updatedMessages,
                    messageIds: updatedMessageIds,
                };

                const updatedChats = new Map(currentBotData.chats).set(
                    chatId,
                    updatedChat,
                );
                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return true;
            },

            updateMessage: (
                chatId: string,
                messageId: number | string,
                patch: Partial<Message>,
            ) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return false;

                const idx = chat.messages.findIndex(
                    (m: Message) => m.id === messageId,
                );
                if (idx === -1) return false;

                const updatedMessages = [...chat.messages];
                const updatedMessage = { ...updatedMessages[idx], ...patch };
                updatedMessages[idx] = updatedMessage;

                const isLast = idx === chat.messages.length - 1;
                const updatedChat = {
                    ...chat,
                    messages: updatedMessages,
                    ...(isLast
                        ? {
                              lastText:
                                  updatedMessage.type === "text"
                                      ? updatedMessage.text || ""
                                      : updatedMessage.caption ||
                                        updatedMessage.text ||
                                        `[${updatedMessage.type}]`,
                              lastDate: updatedMessage.date || chat.lastDate,
                          }
                        : {}),
                };

                const updatedChats = new Map(currentBotData.chats).set(
                    chatId,
                    updatedChat,
                );
                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return true;
            },

            upsertMember: (
                chatId: string,
                memberData: Partial<ChatMember> & { id: string },
            ) => {
                const state = get();
                if (!state.token) return null;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return null;

                const existing = chat.members.get(memberData.id) || {};
                const updated: ChatMember = {
                    ...existing,
                    displayName:
                        memberData.displayName || existing.displayName || "",
                    avatarText:
                        memberData.avatarText || existing.avatarText || "?",
                    status: memberData.status || existing.status || "member",
                    isAdmin: memberData.isAdmin ?? existing.isAdmin ?? false,
                    isCreator:
                        memberData.isCreator ?? existing.isCreator ?? false,
                    isBot: memberData.isBot ?? existing.isBot ?? false,
                    lastSeen:
                        memberData.lastSeen || existing.lastSeen || Date.now(),
                    ...memberData,
                };

                const updatedMembers = new Map(chat.members);
                updatedMembers.set(memberData.id, updated);

                const updatedChat = { ...chat, members: updatedMembers };
                const updatedChats = new Map(currentBotData.chats).set(
                    chatId,
                    updatedChat,
                );
                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return updated;
            },

            removeMember: (chatId: string, userId: string) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return false;

                const updatedMembers = new Map(chat.members);
                const result = updatedMembers.delete(userId);

                if (result) {
                    const updatedChat = { ...chat, members: updatedMembers };
                    const updatedChats = new Map(currentBotData.chats).set(
                        chatId,
                        updatedChat,
                    );
                    const updatedBotData = {
                        ...currentBotData,
                        chats: updatedChats,
                    };

                    set((state: BotState) => ({
                        botDataMap: new Map(state.botDataMap).set(
                            state.token,
                            updatedBotData,
                        ),
                    }));
                }

                return result;
            },

            clearChatHistory: (chatId: string) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const chat = currentBotData.chats.get(chatId);
                if (!chat) return false;

                const updatedChat: Chat = {
                    ...chat,
                    messages: [],
                    messageIds: new Set(),
                    lastText: "",
                    lastDate: 0,
                    unread: 0,
                };

                const updatedChats = new Map(currentBotData.chats).set(
                    chatId,
                    updatedChat,
                );
                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return true;
            },

            deleteChat: (chatId: string) => {
                const state = get();
                if (!state.token) return false;

                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();

                const updatedChats = new Map(currentBotData.chats);
                const existed = updatedChats.delete(chatId);

                if (!existed) return false;

                let nextActiveChatId = currentBotData.activeChatId;
                if (nextActiveChatId === chatId) {
                    const remaining = Array.from(
                        updatedChats.values() as Iterable<Chat>,
                    ).sort(
                        (a: Chat, b: Chat) =>
                            (b.lastDate || 0) - (a.lastDate || 0),
                    );
                    nextActiveChatId =
                        remaining.length > 0 ? remaining[0].id : null;
                }

                const updatedBotData = {
                    ...currentBotData,
                    chats: updatedChats,
                    activeChatId: nextActiveChatId,
                };

                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));

                return true;
            },

            // Sticker actions
            addRecentSticker: (sticker: StickerEntry) => {
                const state = get();
                if (!state.token) return;
                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const existing = currentBotData.recentStickers || [];
                const filtered = existing.filter(
                    (s: StickerEntry) => s.file_id !== sticker.file_id,
                );
                const normalized = {
                    ...sticker,
                    addedAt: sticker.addedAt || Date.now(),
                };
                const updated = [normalized, ...filtered].slice(0, 50);
                const updatedBotData = {
                    ...currentBotData,
                    recentStickers: updated,
                };
                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            getRecentStickers: () => {
                const state = get();
                const data = state.getCurrentBotData();
                return data?.recentStickers || [];
            },

            addFavoriteSticker: (sticker: StickerEntry) => {
                const state = get();
                if (!state.token) return;
                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const existing = currentBotData.favoriteStickers || [];
                const filtered = existing.filter(
                    (s: StickerEntry) => s.file_id !== sticker.file_id,
                );
                const normalized = {
                    ...sticker,
                    addedAt: sticker.addedAt || Date.now(),
                    favorite: true,
                };
                const updated = [normalized, ...filtered].slice(0, 100);
                const updatedBotData = {
                    ...currentBotData,
                    favoriteStickers: updated,
                };
                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            removeFavoriteSticker: (file_id: string) => {
                const state = get();
                if (!state.token) return;
                const currentBotData =
                    state.botDataMap.get(state.token) || createDefaultBotData();
                const existing = currentBotData.favoriteStickers || [];
                const updated = existing.filter(
                    (s: StickerEntry) => s.file_id !== file_id,
                );
                const updatedBotData = {
                    ...currentBotData,
                    favoriteStickers: updated,
                };
                set((state: BotState) => ({
                    botDataMap: new Map(state.botDataMap).set(
                        state.token,
                        updatedBotData,
                    ),
                }));
            },

            getFavoriteStickers: () => {
                const state = get();
                const data = state.getCurrentBotData();
                return data?.favoriteStickers || [];
            },

            // Utility actions
            clearAllData: () =>
                set({
                    botDataMap: new Map(),
                    replyTo: null,
                }),

            clearBotData: (botToken: string) => {
                set((state: BotState) => {
                    const newBotDataMap = new Map(state.botDataMap);
                    newBotDataMap.delete(botToken);
                    return { botDataMap: newBotDataMap };
                });
            },

            getSortedChats: (): Chat[] => {
                const state = get();
                const currentBotData = state.getCurrentBotData();
                if (!currentBotData) return [];

                return (
                    Array.from(currentBotData.chats.values()) as Chat[]
                ).sort(
                    (a: Chat, b: Chat) => (b.lastDate || 0) - (a.lastDate || 0),
                );
            },

            // Current bot getters
            getCurrentBotData: (): BotData | undefined => {
                const state = get();
                if (!state.token || !state.botDataMap) return undefined;
                return state.botDataMap.get(state.token);
            },

            getCurrentBotInfo: (): BotInfo => {
                const state = get();
                const botData = state.getCurrentBotData();
                return botData?.botInfo || DEFAULT_BOT_INFO;
            },

            getCurrentChats: (): Map<string, Chat> => {
                const state = get();
                const botData = state.getCurrentBotData();
                return botData?.chats || new Map();
            },

            getCurrentActiveChatId: (): string | null => {
                const state = get();
                const botData = state.getCurrentBotData();
                return botData?.activeChatId || null;
            },

            getCurrentLastUpdateId: (): number => {
                const state = get();
                const botData = state.getCurrentBotData();
                return botData?.lastUpdateId || 0;
            },
        }),
        {
            name: "telegram-bot-store",
            partialize: partializeState,
            onRehydrateStorage: () => rehydrateState,
        },
    ),
);
