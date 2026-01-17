import { useEffect } from "react";
import { useBotStore, type BotState, type Message } from "@/store/botStore";
import { botService, type TelegramUpdate } from "@/services/botService";

export function useBotConnection() {
    const {
        token,
        setConnected,
        setPolling,
        setPollingStatus,
        setLastError,
        setBotInfo,
        addMessage,
        updateMessage,
        getOrCreateChat,
        addRecentSticker,
    } = useBotStore();

    useEffect(() => {
        if (!token) {
            // Stop bot if no token
            botService.stop();
            setConnected(false);
            setPolling(false);
            return;
        }

        const initializeBot = async () => {
            try {
                // Configure bot service
                const proxyPrefix =
                    localStorage.getItem("cors_proxy") || undefined;
                botService.setConfig({ token, proxyPrefix });

                // Test connection by getting bot info
                const response = await botService.getMe();

                if (response.ok && response.result) {
                    const botInfo = response.result;
                    setBotInfo({
                        id: botInfo.id,
                        username: botInfo.username || null,
                        name: botInfo.first_name || null,
                        description: null,
                        shortDescription: null,
                        commands: [],
                    });

                    // Try to get commands + profile (description, short description)
                    try {
                        const [commandsResponse, descRes, shortDescRes] =
                            await Promise.all([
                                botService.getMyCommands(),
                                botService.getMyDescription(),
                                botService.getMyShortDescription(),
                            ]);

                        if (commandsResponse.ok && commandsResponse.result) {
                            setBotInfo({
                                commands: commandsResponse.result.map(
                                    (cmd: any) => ({
                                        command: cmd.command,
                                        description: cmd.description,
                                    }),
                                ),
                            });
                        }

                        if (
                            descRes.ok &&
                            (descRes as any).result?.description !== undefined
                        ) {
                            setBotInfo({
                                description:
                                    (descRes as any).result.description || null,
                            });
                        }

                        if (
                            shortDescRes.ok &&
                            (shortDescRes as any).result?.short_description !==
                                undefined
                        ) {
                            setBotInfo({
                                shortDescription:
                                    (shortDescRes as any).result
                                        .short_description || null,
                            });
                        }
                    } catch (error) {
                        console.warn("Failed to load bot profile:", error);
                    }

                    setConnected(true);

                    // Start bot using grammy's built-in polling
                    await botService.start(handleUpdates, (status, error) => {
                        setPollingStatus(status);
                        if (error) setLastError(error);
                    });
                    setPolling(true);
                } else {
                    console.error(
                        "Failed to connect to bot:",
                        response.description,
                    );
                    setConnected(false);
                    setPolling(false);
                }
            } catch (error) {
                console.error("Bot initialization error:", error);
                setConnected(false);
                setPolling(false);
            }
        };

        const handleUpdates = (updates: TelegramUpdate[]) => {
            updates.forEach((update) => {
                // Process different types of updates
                if (update.message) {
                    processMessage(update.message);
                } else if (update.edited_message) {
                    processMessage(update.edited_message, true);
                } else if (update.channel_post) {
                    processMessage(update.channel_post);
                } else if (update.edited_channel_post) {
                    processMessage(update.edited_channel_post, true);
                } else if (update.callback_query) {
                    processCallbackQuery(update.callback_query);
                }
            });
        };

        const processCallbackQuery = async (callbackQuery: any) => {
            console.log("[useBotConnection] Callback query received:", callbackQuery);
            
            const chatId = callbackQuery.message?.chat?.id?.toString();
            const messageId = callbackQuery.message?.message_id;
            const callbackData = callbackQuery.callback_data;
            const callbackId = callbackQuery.id;

            // Answer the callback query to remove loading state
            try {
                await botService.answerCallbackQuery(callbackId, {
                    text: `Received: ${callbackData}`,
                    show_alert: false,
                });
            } catch (e) {
                console.warn("Failed to answer callback query:", e);
            }

            // You can add custom logic here to handle different callback data
            // For example, update the message or perform actions based on callback_data
            console.log(`Callback from chat ${chatId}, message ${messageId}: ${callbackData}`);
        };

        const processMessage = async (message: any, isEdited = false) => {
            const chatId = message.chat.id.toString();

            // Handle /start command - auto reply
            if (message.text && message.text.startsWith("/start")) {
                try {
                    await botService.sendMessage(
                        chatId,
                        "Attention! This bot is logging in Bottlegram service. Your messages will be watched by human.",
                    );
                } catch (e) {
                    console.warn("Failed to send /start reply:", e);
                }
            }

            // Get or create chat
            const chatData = {
                type: message.chat.type,
                title:
                    message.chat.title ||
                    `${message.chat.first_name || ""} ${message.chat.last_name || ""}`.trim() ||
                    "Private Chat",
                avatarText: message.chat.title
                    ? message.chat.title.charAt(0).toUpperCase()
                    : (message.chat.first_name || message.chat.username || "U")
                          .charAt(0)
                          .toUpperCase(),
            };

            getOrCreateChat(chatId, chatData);

            // Process message content
            let messageType:
                | "text"
                | "photo"
                | "video"
                | "audio"
                | "voice"
                | "document"
                | "sticker" = "text";
            let text = message.text || message.caption || "";
            let mediaUrl = "";
            let fileName = "";
            let stickerFormat: "static" | "video" | "animated" | undefined =
                undefined;
            let stickerEmoji: string | undefined = undefined;

            if (message.photo) {
                messageType = "photo";
                // Get largest photo
                const photo = message.photo[message.photo.length - 1];
                // Resolve file URL
                try {
                    const fileRes = await botService.getFile(photo.file_id);
                    if (fileRes.ok && fileRes.result?.file_path) {
                        mediaUrl = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                    }
                } catch (e) {
                    console.warn("Failed to get photo URL:", e);
                }
            } else if (message.video) {
                messageType = "video";
                fileName = message.video.file_name || "video";
                // Resolve file URL
                try {
                    const fileRes = await botService.getFile(
                        message.video.file_id,
                    );
                    if (fileRes.ok && fileRes.result?.file_path) {
                        mediaUrl = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                    }
                } catch (e) {
                    console.warn("Failed to get video URL:", e);
                }
            } else if (message.audio) {
                messageType = "audio";
                fileName = message.audio.file_name || "audio";
                // Resolve file URL
                try {
                    const fileRes = await botService.getFile(
                        message.audio.file_id,
                    );
                    if (fileRes.ok && fileRes.result?.file_path) {
                        mediaUrl = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                    }
                } catch (e) {
                    console.warn("Failed to get audio URL:", e);
                }
            } else if (message.voice) {
                messageType = "voice";
                // Resolve file URL
                try {
                    const fileRes = await botService.getFile(
                        message.voice.file_id,
                    );
                    if (fileRes.ok && fileRes.result?.file_path) {
                        mediaUrl = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                    }
                } catch (e) {
                    console.warn("Failed to get voice URL:", e);
                }
            } else if (message.document) {
                messageType = "document";
                fileName = message.document.file_name || "document";
                // Resolve file URL
                try {
                    const fileRes = await botService.getFile(
                        message.document.file_id,
                    );
                    if (fileRes.ok && fileRes.result?.file_path) {
                        mediaUrl = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                    }
                } catch (e) {
                    console.warn("Failed to get document URL:", e);
                }
            } else if (message.sticker) {
                messageType = "sticker";
                mediaUrl = message.sticker.file_id;
                stickerEmoji = message.sticker.emoji;

                // Try resolve file url to display and detect format
                try {
                    const fileRes = await botService.getFile(
                        message.sticker.file_id,
                    );
                    if (fileRes.ok && fileRes.result?.file_path) {
                        const url = botService.getFileUrl(
                            fileRes.result.file_path,
                        );
                        mediaUrl = url;
                        const fp = fileRes.result.file_path.toLowerCase();
                        if (fp.endsWith(".webm")) stickerFormat = "video";
                        else if (fp.endsWith(".webp")) stickerFormat = "static";
                        else if (fp.endsWith(".tgs"))
                            stickerFormat = "animated";
                        // Save to recent stickers
                        addRecentSticker({
                            file_id: message.sticker.file_id,
                            url,
                            emoji: stickerEmoji,
                            format: stickerFormat || "unknown",
                            addedAt: Date.now(),
                        });
                    }
                } catch (e) {
                    // ignore
                }
            }

            // Create message object
            const newMessage: Message = {
                id: message.message_id,
                type: messageType,
                side: "left" as const,
                text,
                mediaUrl,
                fileName,
                ...(messageType === "sticker"
                    ? { stickerFormat, emoji: stickerEmoji }
                    : {}),
                date: message.date * 1000, // Convert to milliseconds
                fromId: message.from?.id,
                fromName:
                    message.from?.first_name ||
                    message.from?.username ||
                    "Unknown",
                fromUsername: message.from?.username,
                reply_to: message.reply_to_message?.message_id,
                reply_preview: message.reply_to_message?.text?.substring(0, 50),
                reply_markup: message.reply_markup?.inline_keyboard || undefined,
            };

            // Add or update message to store
            if (isEdited) {
                const patch: Partial<Message> = {
                    type: messageType,
                    text,
                    mediaUrl,
                    fileName,
                    ...(messageType === "sticker"
                        ? { stickerFormat, emoji: stickerEmoji }
                        : {}),
                };
                // If reply info is present in the edited payload, keep it in sync
                if (message.reply_to_message) {
                    patch.reply_to = message.reply_to_message.message_id;
                    patch.reply_preview =
                        message.reply_to_message.text?.substring(0, 50);
                }
                const ok = updateMessage(chatId, message.message_id, patch);
                if (!ok) {
                    // Fallback: in case original message wasn't in local state (e.g. reload), add it
                    addMessage(chatId, newMessage);
                }
            } else {
                addMessage(chatId, newMessage);
            }
        };

        // Initialize bot connection
        initializeBot();

        // Cleanup on unmount or token change
        return () => {
            botService.stop();
            setPolling(false);
        };
    }, [token]); // Re-run when token changes

    return {
        isConnected: useBotStore((state: BotState) => state.isConnected),
        isPolling: useBotStore((state: BotState) => state.isPolling),
        pollingStatus: useBotStore((state: BotState) => state.pollingStatus),
        lastError: useBotStore((state: BotState) => state.lastError),
        botInfo: useBotStore((state: BotState) => state.getCurrentBotInfo()),
    };
}
