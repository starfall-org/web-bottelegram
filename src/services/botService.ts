import { Bot, GrammyError, HttpError, InputFile } from "grammy";
import { mtProtoGateway } from "./mtprotoGateway";

export type GatewayMode = "bot" | "mtproto";

export interface BotConfig {
    token: string;
    proxyPrefix?: string;
    // MTProto gateway settings
    apiId?: number;
    apiHash?: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: any;
    edited_message?: any;
    channel_post?: any;
    edited_channel_post?: any;
    callback_query?: any;
}

export class BotService {
    private bot: Bot | null = null;
    private config: BotConfig | null = null;
    private mode: GatewayMode = "bot";
    private latestUpdateCallback: ((updates: TelegramUpdate[]) => void) | null = null;
    private latestStatusCallback:
        | ((status: "idle" | "polling" | "error", error?: string | null) => void)
        | null = null;
    private isRunning = false;
    private updateCallback: ((updates: TelegramUpdate[]) => void) | null = null;
    private statusCallback:
        | ((
              status: "idle" | "polling" | "error",
              error?: string | null,
          ) => void)
        | null = null;

    constructor() {}

    setGatewayMode(mode: GatewayMode) {
        if (mode === this.mode) return;
        const wasRunning = this.isRunning;
        if (wasRunning) {
            void this.stop();
        }
        this.mode = mode;
        if (this.config && wasRunning) {
            void this.start(this.latestUpdateCallback || undefined, this.latestStatusCallback || undefined);
        }
    }

    getGatewayMode(): GatewayMode {
        return this.mode;
    }

    setConfig(config: BotConfig) {
        this.config = config;
        if (this.bot) {
            this.stop();
        }
        if (this.mode === "mtproto") {
            mtProtoGateway
                .configure({
                    apiId: config.apiId || 0,
                    apiHash: config.apiHash || "",
                    botToken: config.token,
                })
                .catch((error) => {
                    console.error("[BotService] MTProto configure failed:", error);
                    if (this.statusCallback) {
                        this.statusCallback("error", error?.message || "MTProto configure failed");
                    }
                });
            return;
        }

        // Create bot with custom API root for CORS proxy support
        const botOptions: any = {};

        if (config.proxyPrefix) {
            // Format: proxy should forward to https://api.telegram.org
            // e.g., proxyPrefix = "https://cors-proxy.example.com"
            // will call: https://cors-proxy.example.com/bot{token}/method
            const apiRoot = config.proxyPrefix.replace(/\/+$/, "");
            botOptions.client = {
                apiRoot: apiRoot,
            };
            console.debug("[BotService] Using proxy apiRoot:", apiRoot);
        }

        this.bot = new Bot(config.token, botOptions);
        this.setupBot();
    }

    private setupBot() {
        if (!this.bot) return;

        // Handle all updates via middleware
        this.bot.on("message", (ctx) => {
            if (this.updateCallback) {
                const update: TelegramUpdate = {
                    update_id: ctx.update.update_id,
                    message: ctx.update.message,
                };
                this.updateCallback([update]);
            }
        });

        this.bot.on("edited_message", (ctx) => {
            if (this.updateCallback) {
                const update: TelegramUpdate = {
                    update_id: ctx.update.update_id,
                    edited_message: ctx.update.edited_message,
                };
                this.updateCallback([update]);
            }
        });

        this.bot.on("channel_post", (ctx) => {
            if (this.updateCallback) {
                const update: TelegramUpdate = {
                    update_id: ctx.update.update_id,
                    channel_post: ctx.update.channel_post,
                };
                this.updateCallback([update]);
            }
        });

        this.bot.on("edited_channel_post", (ctx) => {
            if (this.updateCallback) {
                const update: TelegramUpdate = {
                    update_id: ctx.update.update_id,
                    edited_channel_post: ctx.update.edited_channel_post,
                };
                this.updateCallback([update]);
            }
        });

        this.bot.on("callback_query", (ctx) => {
            if (this.updateCallback) {
                const update: TelegramUpdate = {
                    update_id: ctx.update.update_id,
                    callback_query: ctx.update.callback_query,
                };
                this.updateCallback([update]);
            }
        });

        // Error handler
        this.bot.catch((err) => {
            const ctx = err.ctx;
            console.error(
                `[BotService] Error while handling update ${ctx.update.update_id}:`,
            );
            const e = err.error;
            if (e instanceof GrammyError) {
                console.error("[BotService] Grammy error:", e.description);
                if (this.statusCallback) {
                    this.statusCallback("error", e.description);
                }
            } else if (e instanceof HttpError) {
                console.error("[BotService] HTTP error:", e);
                if (this.statusCallback) {
                    this.statusCallback("error", e.message);
                }
            } else {
                console.error("[BotService] Unknown error:", e);
                if (this.statusCallback) {
                    this.statusCallback("error", String(e));
                }
            }
        });
    }

    async getUpdates(
        offset?: number,
        timeout = 30,
    ): Promise<{
        ok: boolean;
        result?: TelegramUpdate[];
        description?: string;
        error_code?: number;
    }> {
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const updates = await this.bot.api.getUpdates({
                offset,
                timeout,
                allowed_updates: [
                    "message",
                    "edited_message",
                    "channel_post",
                    "edited_channel_post",
                ],
            });
            return { ok: true, result: updates };
        } catch (error: any) {
            return {
                ok: false,
                description:
                    error.description || error.message || "Unknown error",
                error_code: error.error_code || 0,
            };
        }
    }

    async getMe() {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getMe();
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const me = await this.bot.api.getMe();
            return { ok: true, result: me };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendMessage(
        chatId: number | string,
        text: string,
        options?: {
            parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
            reply_to_message_id?: number;
            reply_markup?: {
                inline_keyboard: Array<Array<{
                    text: string;
                    callback_data?: string;
                    url?: string;
                    web_app?: { url: string };
                }>>;
            };
        },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendMessage(chatId, text, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const message = await this.bot.api.sendMessage(chatId, text, {
                parse_mode: options?.parse_mode,
                reply_parameters: options?.reply_to_message_id
                    ? { message_id: options.reply_to_message_id }
                    : undefined,
                reply_markup: options?.reply_markup as any,
            });
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendPhoto(
        chatId: number | string,
        photo: string | File,
        options?: { caption?: string; reply_to_message_id?: number },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendPhoto(chatId, photo, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            let input;
            if (typeof photo === "string") {
                input = photo;
            } else {
                // Use File object directly for browser compatibility
                
                
                input = new InputFile(photo, photo.name || "photo.jpg");
            }
            const message = await this.bot.api.sendPhoto(chatId, input, {
                caption: options?.caption,
                reply_parameters: options?.reply_to_message_id
                    ? { message_id: options.reply_to_message_id }
                    : undefined,
            });
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendVideo(
        chatId: number | string,
        video: string | File,
        options?: { caption?: string; reply_to_message_id?: number },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendVideo(chatId, video, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            let input;
            if (typeof video === "string") {
                input = video;
            } else {
                
                
                input = new InputFile(video, video.name || "video.mp4");
            }
            const message = await this.bot.api.sendVideo(chatId, input, {
                caption: options?.caption,
                reply_parameters: options?.reply_to_message_id
                    ? { message_id: options.reply_to_message_id }
                    : undefined,
            });
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendAudio(
        chatId: number | string,
        audio: string | File,
        options?: { caption?: string; reply_to_message_id?: number },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendAudio(chatId, audio, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            let input;
            if (typeof audio === "string") {
                input = audio;
            } else {
                
                
                input = new InputFile(audio, audio.name || "audio.mp3");
            }
            const message = await this.bot.api.sendAudio(chatId, input, {
                caption: options?.caption,
                reply_parameters: options?.reply_to_message_id
                    ? { message_id: options.reply_to_message_id }
                    : undefined,
            });
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendDocument(
        chatId: number | string,
        document: string | File,
        options?: { caption?: string; reply_to_message_id?: number },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendDocument(chatId, document, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            let input;
            if (typeof document === "string") {
                input = document;
            } else {
                
                
                input = new InputFile(document, document.name || "document");
            }
            const message = await this.bot.api.sendDocument(chatId, input, {
                caption: options?.caption,
                reply_parameters: options?.reply_to_message_id
                    ? { message_id: options.reply_to_message_id }
                    : undefined,
            });
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async editMessageText(
        chatId: number | string,
        messageId: number,
        text: string,
        options?: {
            parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
            reply_markup?: {
                inline_keyboard: Array<Array<{
                    text: string;
                    callback_data?: string;
                    url?: string;
                    web_app?: { url: string };
                }>>;
            };
        },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.editMessageText(chatId, messageId, text, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.editMessageText(
                chatId,
                messageId,
                text,
                {
                    parse_mode: options?.parse_mode,
                    reply_markup: options?.reply_markup as any,
                },
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendSticker(chatId: number | string, sticker: string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendSticker(chatId, sticker);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const message = await this.bot.api.sendSticker(chatId, sticker);
            return { ok: true, result: message };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async deleteMessage(chatId: number | string, messageId: number) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.deleteMessage(chatId, messageId);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.deleteMessage(chatId, messageId);
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async sendChatAction(
        chatId: number | string,
        action:
            | "typing"
            | "upload_photo"
            | "upload_video"
            | "upload_voice"
            | "upload_document",
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.sendChatAction(chatId, action);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.sendChatAction(chatId, action);
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    private async callMultipartApi(method: string, formData: FormData) {
        if (!this.config) throw new Error("Bot not configured");

        const apiRoot = this.config.proxyPrefix
            ? this.config.proxyPrefix.replace(/\/+$/, "")
            : "https://api.telegram.org";
        const response = await fetch(
            `${apiRoot}/bot${this.config.token}/${method}`,
            { method: "POST", body: formData },
        );
        return response.json() as Promise<{
            ok: boolean;
            result?: boolean;
            description?: string;
        }>;
    }

    async getUserProfilePhotos(userId: number, limit = 1) {
        if (this.mode === "mtproto") {
            return {
                ok: false,
                description: "Profile photos are currently available through the Bot API gateway only",
            };
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const photos = await this.bot.api.getUserProfilePhotos(userId, {
                limit,
            });
            return { ok: true, result: photos };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getChatMember(chatId: number | string, userId: number) {
        if (this.mode === "mtproto") {
            return {
                ok: false,
                description: "Chat permissions are currently available through the Bot API gateway only",
            };
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const member = await this.bot.api.getChatMember(chatId, userId);
            return { ok: true, result: member };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setMyProfilePhoto(photo: File) {
        if (this.mode === "mtproto") {
            return {
                ok: false,
                description: "Changing the bot profile photo is currently available through the Bot API gateway only",
            };
        }
        if (photo.type !== "image/jpeg") {
            return {
                ok: false,
                description: "Telegram requires a JPG image for a bot profile photo",
            };
        }

        try {
            const formData = new FormData();
            formData.append(
                "photo",
                JSON.stringify({ type: "static", photo: "attach://avatar" }),
            );
            formData.append("avatar", photo, photo.name || "bot-avatar.jpg");
            return await this.callMultipartApi("setMyProfilePhoto", formData);
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setChatPhoto(chatId: number | string, photo: File) {
        if (this.mode === "mtproto") {
            return {
                ok: false,
                description: "Changing chat photos is currently available through the Bot API gateway only",
            };
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.setChatPhoto(
                chatId,
                new InputFile(photo, photo.name || "chat-avatar.jpg"),
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getFile(fileId: string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getFile(fileId);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const file = await this.bot.api.getFile(fileId);
            return { ok: true, result: file };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getChat(chatId: number | string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getChat(chatId);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const chat = await this.bot.api.getChat(chatId);
            return { ok: true, result: chat };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getChatAdministrators(chatId: number | string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getChatAdministrators(chatId);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const admins = await this.bot.api.getChatAdministrators(chatId);
            return { ok: true, result: admins };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async banChatMember(
        chatId: number | string,
        userId: number,
        untilDate?: number,
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.banChatMember(chatId, userId, untilDate);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.banChatMember(chatId, userId, {
                until_date: untilDate,
            });
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async promoteChatMember(
        chatId: number | string,
        userId: number,
        isAdmin: boolean,
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.promoteChatMember(chatId, userId, isAdmin);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.promoteChatMember(
                chatId,
                userId,
                {
                    can_manage_chat: isAdmin,
                    can_delete_messages: isAdmin,
                    can_manage_video_chats: isAdmin,
                    can_restrict_members: isAdmin,
                    can_promote_members: false,
                    can_change_info: isAdmin,
                    can_invite_users: isAdmin,
                    can_pin_messages: isAdmin,
                    is_anonymous: false,
                },
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async deleteWebhook(dropPendingUpdates = false) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.deleteWebhook();
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.deleteWebhook({
                drop_pending_updates: dropPendingUpdates,
            });
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getMyCommands() {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getMyCommands();
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const commands = await this.bot.api.getMyCommands();
            return { ok: true, result: commands };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setMyCommands(
        commands: Array<{ command: string; description: string }>,
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.setMyCommands(commands);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.setMyCommands(commands);
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setMyName(name?: string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.setMyName(name);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.setMyName(name || "");
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setMyDescription(description?: string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.setMyDescription(description);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.setMyDescription(
                description || "",
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async setMyShortDescription(shortDescription?: string) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.setMyShortDescription(shortDescription);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.setMyShortDescription(
                shortDescription || "",
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getMyDescription() {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getMyDescription();
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.getMyDescription();
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async getMyShortDescription() {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getMyShortDescription();
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.getMyShortDescription();
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async answerCallbackQuery(
        callbackQueryId: string,
        options?: {
            text?: string;
            show_alert?: boolean;
            url?: string;
            cache_time?: number;
        },
    ) {
        if (this.mode === "mtproto") {
            return mtProtoGateway.answerCallbackQuery(callbackQueryId, options);
        }
        if (!this.bot) throw new Error("Bot not initialized");

        try {
            const result = await this.bot.api.answerCallbackQuery(
                callbackQueryId,
                options,
            );
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                description:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    getFileUrl(filePath: string): string {
        if (this.mode === "mtproto") {
            return mtProtoGateway.getFileUrl(filePath);
        }
        if (!this.config) throw new Error("Bot not configured");

        // Use proxy if configured, otherwise direct Telegram URL
        if (this.config.proxyPrefix) {
            const proxyBase = this.config.proxyPrefix.replace(/\/+$/, "");
            return `${proxyBase}/file/bot${this.config.token}/${filePath}`;
        }

        const baseUrl = `https://api.telegram.org/file/bot${this.config.token}`;
        return `${baseUrl}/${filePath}`;
    }

    /**
     * Start polling for updates using grammy's built-in bot.start()
     */
    async start(
        updateCallback?: (updates: TelegramUpdate[]) => void,
        statusCallback?: (
            status: "idle" | "polling" | "error",
            error?: string | null,
        ) => void,
    ) {
        this.updateCallback = updateCallback || null;
        this.statusCallback = statusCallback || null;
        this.latestUpdateCallback = this.updateCallback;
        this.latestStatusCallback = this.statusCallback;

        if (this.mode === "mtproto") {
            if (!this.config) throw new Error("Bot not configured");
            this.isRunning = true;
            if (statusCallback) statusCallback("polling");
            try {
                await mtProtoGateway.start((updates) => {
                    if (this.updateCallback) this.updateCallback(updates);
                });
                console.debug("[BotService] MTProto gateway started");
            } catch (error: any) {
                console.error("[BotService] MTProto start failed:", error);
                this.isRunning = false;
                if (statusCallback) statusCallback("error", error?.message || "MTProto failed");
            }
            return;
        }

        if (!this.bot) throw new Error("Bot not initialized");
        if (this.isRunning) {
            console.debug("[BotService] Bot is already running");
            return;
        }

        this.isRunning = true;

        console.debug(
            "[BotService] Starting grammy polling with bot.start()...",
        );

        if (statusCallback) statusCallback("polling");

        // Start grammy's built-in polling (non-blocking)
        this.bot.start({
            allowed_updates: [
                "message",
                "edited_message",
                "channel_post",
                "edited_channel_post",
                "callback_query",
            ],
            onStart: (botInfo) => {
                console.debug("[BotService] Bot started:", botInfo.username);
            },
        });
    }

    /**
     * Stop the bot gracefully
     */
    async stop() {
        if (!this.isRunning) return;

        console.debug("[BotService] Stopping bot...");
        this.isRunning = false;

        if (this.mode === "mtproto") {
            try {
                await mtProtoGateway.stop();
            } catch (error) {
                console.error("[BotService] Error stopping MTProto gateway:", error);
            }
            if (this.statusCallback) this.statusCallback("idle");
            return;
        }

        if (this.bot) {
            try {
                await this.bot.stop();
                console.debug("[BotService] Bot stopped successfully");
            } catch (error) {
                console.error("[BotService] Error stopping bot:", error);
            }
        }

        if (this.statusCallback) {
            this.statusCallback("idle");
        }
    }

    /**
     * Check if the bot is currently running
     */
    isPolling(): boolean {
        return this.isRunning;
    }

    /**
     * Alias for isPolling for backward compatibility
     */
    isActive(): boolean {
        return this.isRunning;
    }
}

// Global instance
export const botService = new BotService();
