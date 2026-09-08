import { useEffect } from "react";
import {
    useBotStore,
    type BotState,
    type MediaGroupItem,
    type Message,
} from "@/store/botStore";
import { botService, type TelegramUpdate } from "@/services/botService";
import { getChatAvatarUrl, getUserAvatarUrl } from "@/lib/telegramAvatar";
import { DEFAULT_START_RESPONSE } from "@/store/defaults";
import {
    commandButtonsToReplyMarkup,
    parseBotCommand,
} from "@/services/customCommandUtils";

export function useBotConnection() {
    const {
        token,
        gateway,
        mtproto,
        setConnected,
        setPolling,
        setPollingStatus,
        setLastError,
        setBotInfo,
        setLastUpdateId,
        getCurrentLastUpdateId,
        addMessage,
        updateMessage,
        getOrCreateChat,
        upsertMember,
        addRecentSticker,
    } = useBotStore();

    useEffect(() => {
        if (!token) {
            void botService.stop();
            setConnected(false);
            setPolling(false);
            return;
        }

        let cancelled = false;
        const profileLoads = new Set<string>();
        const memberProfileLoads = new Set<string>();

        const refreshChatProfile = async (chatId: string) => {
            if (profileLoads.has(chatId)) return;
            profileLoads.add(chatId);
            try {
                const response = await botService.getChat(chatId);
                if (!response.ok || !response.result) return;

                const info: any = response.result;
                const title =
                    info.title ||
                    `${info.first_name || ""} ${info.last_name || ""}`.trim() ||
                    info.username ||
                    `Chat ${chatId}`;
                const patch: any = {
                    type: info.type || "private",
                    title,
                    avatarText: title.charAt(0).toUpperCase(),
                    username: info.username || undefined,
                    description: info.description || info.bio || undefined,
                };

                const avatarUrl = await getChatAvatarUrl(info);
                if (avatarUrl) patch.avatarUrl = avatarUrl;

                if (info.type === "group" || info.type === "supergroup" || info.type === "channel") {
                    const countResponse = await botService.getChatMemberCount(chatId);
                    if (countResponse.ok && typeof countResponse.result === "number") {
                        patch.memberCount = countResponse.result;
                    }
                }

                if (!cancelled) getOrCreateChat(chatId, patch);
            } catch (error) {
                console.warn("Failed to load chat profile:", error);
            } finally {
                // Keep the chat marked for this page lifetime so every new
                // message does not trigger another getChat/member-count call.
            }
        };

        const refreshMemberProfile = async (chatId: string, userId: number) => {
            const key = `${chatId}:${userId}`;
            if (memberProfileLoads.has(key)) return;

            const member = useBotStore
                .getState()
                .getCurrentChats()
                .get(chatId)
                ?.members.get(String(userId));
            if (member?.avatarUrl) return;

            memberProfileLoads.add(key);
            try {
                const photosResponse = await botService.getBotApiUserProfilePhotos(userId, 1);
                const sizes = photosResponse.ok
                    ? photosResponse.result?.photos?.[0]
                    : undefined;
                const photo = sizes?.[sizes.length - 1];
                if (!photo?.file_id) return;

                const fileResponse = await botService.getBotApiFile(photo.file_id);
                if (!fileResponse.ok || !fileResponse.result?.file_path) return;
                const avatarUrl = botService.getBotApiFileUrl(fileResponse.result.file_path);
                if (!cancelled) {
                    upsertMember(chatId, { id: String(userId), avatarUrl });
                }
            } catch (error) {
                console.warn("Failed to load member profile photo:", error);
            }
        };

        const resolveFileUrl = async (fileId?: string, forceBotApi = false) => {
            if (!fileId) return "";
            try {
                const fileRes = forceBotApi
                    ? await botService.getBotApiFile(fileId)
                    : await botService.getFile(fileId);
                if (fileRes.ok && fileRes.result?.file_path) {
                    return forceBotApi
                        ? botService.getBotApiFileUrl(fileRes.result.file_path)
                        : botService.getFileUrl(fileRes.result.file_path);
                }
            } catch (error) {
                console.warn("Failed to resolve Telegram file:", error);
            }
            return "";
        };

        const processCallbackQuery = (callbackQuery: any) => {
            const chatId = callbackQuery.message?.chat?.id?.toString();
            const customEvent = new CustomEvent("telegram-callback-query", {
                detail: {
                    callbackId: callbackQuery.id,
                    callbackData: callbackQuery.data ?? callbackQuery.callback_data,
                    chatId,
                    messageId: callbackQuery.message?.message_id,
                    from: callbackQuery.from,
                    timestamp: Date.now(),
                },
            });
            window.dispatchEvent(customEvent);
        };

        const processMessage = async (
            message: any,
            isEdited = false,
            forceBotApiFiles = false,
        ) => {
            if (!message?.chat?.id || message.message_id == null) return;
            const chatId = String(message.chat.id);

            // Drop duplicate non-edit updates before doing any expensive file
            // lookup or side effect (notably the automatic /start response).
            // This is what lets Bot API catch-up safely coexist with MTProto.
            const existingChat = useBotStore.getState().getCurrentChats().get(chatId);
            if (!isEdited && existingChat?.messageIds.has(message.message_id)) {
                return;
            }

            if (typeof message.text === "string" && message.text.startsWith("/")) {
                const parsed = parseBotCommand(
                    message.text,
                    useBotStore.getState().getCurrentBotInfo().username,
                );
                if (parsed) {
                    const command = useBotStore
                        .getState()
                        .getCustomCommands()
                        .find(
                            (item) =>
                                item.enabled &&
                                item.command.toLowerCase() === parsed.command,
                        );
                    if (command) {
                        const responseText =
                            command.response.trim() ||
                            (command.builtin === "start"
                                ? DEFAULT_START_RESPONSE
                                : "");
                        const replyMarkup = commandButtonsToReplyMarkup(command.buttons);

                        if (responseText || replyMarkup) {
                            try {
                                await botService.sendMessage(
                                    chatId,
                                    responseText || "​",
                                    {
                                        reply_to_message_id: message.message_id,
                                        reply_markup: replyMarkup
                                            ? { inline_keyboard: replyMarkup }
                                            : undefined,
                                    },
                                );
                            } catch (error) {
                                console.warn(
                                    `Failed to reply to /${command.command}:`,
                                    error,
                                );
                            }
                        }
                    }
                }
            }

            const title =
                message.chat.title ||
                `${message.chat.first_name || ""} ${message.chat.last_name || ""}`.trim() ||
                message.chat.username ||
                "Private Chat";
            getOrCreateChat(chatId, {
                type: message.chat.type || "private",
                title,
                avatarText: title.charAt(0).toUpperCase(),
                username: message.chat.username || undefined,
            });
            void refreshChatProfile(chatId);

            if (message.from?.id) {
                const displayName =
                    `${message.from.first_name || ""} ${message.from.last_name || ""}`.trim() ||
                    message.from.username ||
                    String(message.from.id);
                upsertMember(chatId, {
                    id: String(message.from.id),
                    firstName: message.from.first_name,
                    lastName: message.from.last_name,
                    username: message.from.username,
                    displayName,
                    avatarText: displayName.charAt(0).toUpperCase(),
                    status: "member",
                    isAdmin: false,
                    isCreator: false,
                    isBot: Boolean(message.from.is_bot),
                    lastSeen: Date.now(),
                });

                if (message.chat.type === "group" || message.chat.type === "supergroup") {
                    void refreshMemberProfile(chatId, Number(message.from.id));
                }
            }

            let messageType: Message["type"] = "text";
            let text = message.text || "";
            let caption = message.caption || undefined;
            let mediaUrl = "";
            let fileName = "";
            let stickerFormat: "static" | "video" | "animated" | undefined;
            let stickerEmoji: string | undefined;
            let mediaGroupItem: MediaGroupItem | undefined;

            if (message.photo?.length) {
                const photo = message.photo[message.photo.length - 1];
                mediaUrl = await resolveFileUrl(photo.file_id, forceBotApiFiles);
                if (message.media_group_id) {
                    messageType = "media_group";
                    mediaGroupItem = {
                        id: message.message_id,
                        type: "photo",
                        mediaUrl,
                        caption,
                        date: message.date * 1000,
                    };
                } else {
                    messageType = "photo";
                }
            } else if (message.video) {
                fileName = message.video.file_name || "video";
                mediaUrl = await resolveFileUrl(message.video.file_id, forceBotApiFiles);
                if (message.media_group_id) {
                    messageType = "media_group";
                    mediaGroupItem = {
                        id: message.message_id,
                        type: "video",
                        mediaUrl,
                        caption,
                        fileName,
                        mimeType: message.video.mime_type,
                        date: message.date * 1000,
                    };
                } else {
                    messageType = "video";
                }
            } else if (message.audio) {
                fileName = message.audio.file_name || "audio";
                mediaUrl = await resolveFileUrl(message.audio.file_id, forceBotApiFiles);
                if (message.media_group_id) {
                    messageType = "media_group";
                    mediaGroupItem = {
                        id: message.message_id,
                        type: "audio",
                        mediaUrl,
                        caption,
                        fileName,
                        mimeType: message.audio.mime_type,
                        date: message.date * 1000,
                    };
                } else {
                    messageType = "audio";
                }
            } else if (message.voice) {
                messageType = "voice";
                mediaUrl = await resolveFileUrl(message.voice.file_id, forceBotApiFiles);
            } else if (message.document) {
                fileName = message.document.file_name || "document";
                mediaUrl = await resolveFileUrl(message.document.file_id, forceBotApiFiles);
                if (message.media_group_id) {
                    messageType = "media_group";
                    mediaGroupItem = {
                        id: message.message_id,
                        type: "document",
                        mediaUrl,
                        caption,
                        fileName,
                        mimeType: message.document.mime_type,
                        date: message.date * 1000,
                    };
                } else {
                    messageType = "document";
                }
            } else if (message.sticker) {
                messageType = "sticker";
                stickerEmoji = message.sticker.emoji;
                mediaUrl = await resolveFileUrl(message.sticker.file_id, forceBotApiFiles);
                const path = mediaUrl.toLowerCase();
                if (path.includes(".webm")) stickerFormat = "video";
                else if (path.includes(".webp")) stickerFormat = "static";
                else if (path.includes(".tgs")) stickerFormat = "animated";
                addRecentSticker({
                    file_id: message.sticker.file_id,
                    url: mediaUrl || undefined,
                    emoji: stickerEmoji,
                    format: stickerFormat || "unknown",
                    addedAt: Date.now(),
                });
            }

            // Captions belong to media, not the text body.
            if (messageType !== "text") text = "";

            const newMessage: Message = {
                id: message.message_id,
                type: messageType,
                side: "left",
                text,
                caption,
                mediaUrl,
                fileName,
                mediaGroupId: message.media_group_id
                    ? String(message.media_group_id)
                    : undefined,
                mediaGroupItems: mediaGroupItem ? [mediaGroupItem] : undefined,
                ...(messageType === "sticker"
                    ? { stickerFormat, emoji: stickerEmoji }
                    : {}),
                date: (message.date || Math.floor(Date.now() / 1000)) * 1000,
                fromId: message.from?.id,
                fromName:
                    message.from?.first_name ||
                    message.from?.username ||
                    message.chat.title ||
                    "Unknown",
                fromUsername: message.from?.username,
                reply_to: message.reply_to_message?.message_id,
                reply_preview:
                    message.reply_to_message?.text?.substring(0, 50) ||
                    message.reply_to_message?.caption?.substring(0, 50),
                reply_markup: message.reply_markup?.inline_keyboard || undefined,
            };

            if (isEdited) {
                const patch: Partial<Message> = {
                    type: messageType,
                    text,
                    caption,
                    mediaUrl,
                    fileName,
                    mediaGroupId: newMessage.mediaGroupId,
                    mediaGroupItems: newMessage.mediaGroupItems,
                    reply_markup: newMessage.reply_markup,
                    ...(messageType === "sticker"
                        ? { stickerFormat, emoji: stickerEmoji }
                        : {}),
                };
                if (message.reply_to_message) {
                    patch.reply_to = message.reply_to_message.message_id;
                    patch.reply_preview = newMessage.reply_preview;
                }
                if (!updateMessage(chatId, message.message_id, patch)) {
                    addMessage(chatId, newMessage);
                }
            } else {
                addMessage(chatId, newMessage);
            }
        };

        const handleUpdates = async (
            updates: TelegramUpdate[],
            persistBotApiOffset: boolean,
        ) => {
            let maxUpdateId = 0;
            for (const update of updates) {
                if (cancelled) return;
                if (update.message) await processMessage(update.message, false, persistBotApiOffset);
                else if (update.edited_message) await processMessage(update.edited_message, true, persistBotApiOffset);
                else if (update.channel_post) await processMessage(update.channel_post, false, persistBotApiOffset);
                else if (update.edited_channel_post) await processMessage(update.edited_channel_post, true, persistBotApiOffset);
                else if (update.callback_query) processCallbackQuery(update.callback_query);

                if (persistBotApiOffset && update.update_id > maxUpdateId) {
                    maxUpdateId = update.update_id;
                }
            }
            if (persistBotApiOffset && maxUpdateId > 0) {
                setLastUpdateId(maxUpdateId);
            }
        };

        const catchUpMissedBotApiUpdates = async (
            firstResponse?: Awaited<ReturnType<typeof botService.getBotApiUpdates>>,
        ) => {
            let offset = Math.max(0, getCurrentLastUpdateId()) + 1;
            let response = firstResponse;

            // Keep requesting until Telegram returns an empty page. The empty
            // request also confirms the last processed batch on getUpdates.
            for (let page = 0; page < 50 && !cancelled; page++) {
                if (!response) {
                    response = await botService.getBotApiUpdates(offset, 100);
                }
                if (!response.ok) {
                    console.warn(
                        "Failed to fetch missed Bot API updates:",
                        response.description,
                    );
                    return;
                }
                const updates = response.result || [];
                if (updates.length === 0) return;

                await handleUpdates(updates, true);
                const maxId = Math.max(...updates.map((update) => update.update_id));
                offset = maxId + 1;
                response = await botService.getBotApiUpdates(offset, 100);
            }
        };

        const initializeBot = async () => {
            try {
                const proxyPrefix = localStorage.getItem("cors_proxy") || undefined;
                botService.setGatewayMode(gateway);
                botService.setConfig({
                    token,
                    proxyPrefix,
                    apiId: mtproto.apiId || 4,
                    apiHash: mtproto.apiHash || undefined,
                });

                // Requirement: every page load must hit Bot API getUpdates,
                // even if MTProto is the selected realtime gateway. Fetch the
                // first page before gateway login; if login fails, Telegram has
                // not yet been advanced past these returned updates.
                const bootstrapOffset = Math.max(0, getCurrentLastUpdateId()) + 1;
                const firstMissedUpdates = await botService.getBotApiUpdates(
                    bootstrapOffset,
                    100,
                );

                const response = await botService.getMe();
                if (!response.ok || !response.result) {
                    setConnected(false);
                    setPolling(false);
                    setLastError(response.description || "Failed to connect to bot");
                    return;
                }

                const botInfo = response.result;
                setBotInfo({
                    id: botInfo.id,
                    username: botInfo.username || null,
                    name: botInfo.first_name || null,
                    description: null,
                    shortDescription: null,
                    commands: [],
                });
                setConnected(true);

                // Always recover Bot API updates first, even when MTProto is the
                // selected realtime transport. This runs on every page load.
                await catchUpMissedBotApiUpdates(firstMissedUpdates);

                void getUserAvatarUrl(botInfo.id)
                    .then((avatarUrl) => avatarUrl && setBotInfo({ avatarUrl }))
                    .catch(() => undefined);

                try {
                    const [commandsResponse, descRes, shortDescRes] = await Promise.all([
                        botService.getMyCommands(),
                        botService.getMyDescription(),
                        botService.getMyShortDescription(),
                    ]);
                    if (commandsResponse.ok && commandsResponse.result) {
                        setBotInfo({ commands: commandsResponse.result });
                    }
                    if (descRes.ok && (descRes as any).result?.description !== undefined) {
                        setBotInfo({ description: (descRes as any).result.description || null });
                    }
                    if (shortDescRes.ok && (shortDescRes as any).result?.short_description !== undefined) {
                        setBotInfo({
                            shortDescription:
                                (shortDescRes as any).result.short_description || null,
                        });
                    }
                } catch (error) {
                    console.warn("Failed to load bot profile:", error);
                }

                await botService.start(
                    (updates) => {
                        void handleUpdates(updates, gateway === "bot");
                    },
                    (status, error) => {
                        setPollingStatus(status);
                        if (error) setLastError(error);
                    },
                );
                if (!cancelled) setPolling(true);
            } catch (error) {
                console.error("Bot initialization error:", error);
                setConnected(false);
                setPolling(false);
                setLastError(error instanceof Error ? error.message : String(error));
            }
        };

        void initializeBot();

        return () => {
            cancelled = true;
            void botService.stop();
            setPolling(false);
        };
    }, [token, gateway, mtproto.apiId, mtproto.apiHash]);

    return {
        isConnected: useBotStore((state: BotState) => state.isConnected),
        isPolling: useBotStore((state: BotState) => state.isPolling),
        pollingStatus: useBotStore((state: BotState) => state.pollingStatus),
        lastError: useBotStore((state: BotState) => state.lastError),
        botInfo: useBotStore((state: BotState) => state.getCurrentBotInfo()),
    };
}
