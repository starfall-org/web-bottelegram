/**
 * MTProto gateway based on @mtcute/web.
 * Mirrors the BotService async surface ({ ok, result } responses with
 * Bot-API-shaped results) so the rest of the app can switch between
 * Bot Gateway (grammy/HTTP) and MTProto Gateway transparently.
 */
import { TelegramClient } from "@mtcute/web";

export interface MtProtoConfig {
    apiId: number;
    apiHash: string;
    botToken: string;
}

export class MtProtoGateway {
    private client: any = null;
    private config: MtProtoConfig | null = null;
    private running = false;
    private signedIn = false;
    private handlersAttached = false;
    private updateCallback: ((updates: any[]) => void) | null = null;

    /**
     * mtcute treats string peers as usernames. Chat IDs are kept as strings in
     * the UI/store (so they can also represent @usernames), therefore turn a
     * numeric ID back into a number before handing it to mtcute.
     */
    private toPeerId(chatId: number | string): number | string {
        if (typeof chatId !== "string" || !/^-?\d+$/.test(chatId)) {
            return chatId;
        }

        const numericChatId = Number(chatId);
        return Number.isSafeInteger(numericChatId) ? numericChatId : chatId;
    }

    /**
     * Create (and swap in) the MTProto client synchronously so that
     * callers can use it right after configure() resolves; the old
     * client is disconnected in the background.
     */
    async configure(config: MtProtoConfig) {
        if (!config.apiId || !config.apiHash || !config.botToken) {
            throw new Error("MTProto requires API ID, API hash and bot token");
        }
        if (
            this.config &&
            this.client &&
            this.config.apiId === config.apiId &&
            this.config.apiHash === config.apiHash &&
            this.config.botToken === config.botToken
        ) {
            return; // same settings, keep existing client/session
        }
        this.config = config;
        const client = new TelegramClient({
            apiId: config.apiId,
            apiHash: config.apiHash,
            storage: `web-bottelegram-mtproto-${config.botToken}`,
        });
        const old = this.client;
        this.client = client;
        this.signedIn = false;
        this.handlersAttached = false;
        if (old) {
            void old.disconnect().catch(() => undefined);
        }
    }

    private async ensureConnected() {
        if (!this.client || !this.config) {
            throw new Error("MTProto is not configured (missing API ID/Hash?)");
        }
        if (!this.signedIn) {
            await this.client.start({ botToken: this.config.botToken });
            this.signedIn = true;
        }
    }

    async start(
        updateCallback: (updates: any[]) => void,
    ) {
        if (!this.client || !this.config) throw new Error("MTProto is not configured");

        this.updateCallback = updateCallback;

        if (!this.handlersAttached) {
            this.attachHandlers();
        }

        await this.ensureConnected();
        this.running = true;
    }

    private attachHandlers() {
        if (!this.client) return;
        this.handlersAttached = true;
        let updateId = Date.now() % 100000;

        this.client.onNewMessage.add((message: any) => {
            this.updateCallback?.([{ update_id: updateId++, message: this.toBotMessage(message) }]);
        });
        this.client.onEditMessage.add((message: any) => {
            this.updateCallback?.([{ update_id: updateId++, edited_message: this.toBotMessage(message) }]);
        });
        this.client.onCallbackQuery.add((query: any) => {
            this.updateCallback?.([{
                update_id: updateId++,
                callback_query: {
                    id: String(query.id),
                    from: {
                        id: query.user?.id,
                        first_name: query.user?.firstName,
                        username: query.user?.username,
                    },
                    data: query.dataStr || undefined,
                    message: query.message
                        ? {
                              message_id: query.message.id,
                              chat: { id: query.message.chat?.id },
                          }
                        : undefined,
                },
            }]);
        });
    }

    async stop() {
        this.running = false;
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch {
                /* already disconnected */
            }
            this.signedIn = false;
        }
    }

    isPolling() {
        return this.running;
    }

    async getMe() {
        try {
            await this.ensureConnected();
            const me = await this.client.getMe();
            return {
                ok: true,
                result: {
                    id: me.id,
                    is_bot: true,
                    first_name: me.firstName || me.displayName,
                    username: me.username || null,
                },
            };
        } catch (error: any) {
            return { ok: false, description: error?.message || "MTProto connection failed" };
        }
    }

    async getMyCommands() {
        try {
            const commands = await this.client.getMyCommands();
            return { ok: true, result: commands.map((c: any) => ({ command: c.command, description: c.description })) };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to get commands" };
        }
    }

    async setMyCommands(commands: Array<{ command: string; description: string }>) {
        try {
            await this.client.setMyCommands(commands);
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to set commands" };
        }
    }

    async getMyDescription() {
        try {
            const info = await this.client.getBotInfo({});
            return { ok: true, result: { description: info.description || "" } };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to get description" };
        }
    }

    async getMyShortDescription() {
        // MTProto bots have no separate short description; report empty
        return { ok: true, result: { short_description: "" } };
    }

    async setMyName(name?: string): Promise<{ ok: boolean; result?: boolean; description?: string }> {
        try {
            await this.client.setBotInfo({ name: name || "" });
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to set name" };
        }
    }

    async setMyDescription(description?: string): Promise<{ ok: boolean; result?: boolean; description?: string }> {
        try {
            await this.client.setBotInfo({ description: description || "" });
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to set description" };
        }
    }

    async setMyShortDescription(shortDescription?: string) {
        // Approximate: MTProto only exposes description/bio
        return this.setMyDescription(shortDescription);
    }

    async sendMessage(chatId: number | string, text: string, options?: any) {
        try {
            const result = await this.client.sendText(this.toPeerId(chatId), text, {
                replyTo: options?.reply_to_message_id,
                replyMarkup: options?.reply_markup?.inline_keyboard
                    ? this.toReplyMarkup(options.reply_markup)
                    : undefined,
            });
            return { ok: true, result: this.toBotMessage(result) };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to send message" };
        }
    }

    async editMessageText(chatId: number | string, messageId: number, text: string, options?: any) {
        try {
            const result = await this.client.editMessage({
                chatId: this.toPeerId(chatId),
                message: messageId,
                text,
                replyMarkup: options?.reply_markup?.inline_keyboard
                    ? this.toReplyMarkup(options.reply_markup)
                    : undefined,
            });
            return { ok: true, result: this.toBotMessage(result) };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to edit message" };
        }
    }

    async deleteMessage(chatId: number | string, messageId: number) {
        try {
            await this.client.deleteMessagesById(this.toPeerId(chatId), [messageId]);
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to delete message" };
        }
    }

    async sendChatAction(chatId: number | string, action?: string) {
        try {
            const statusMap: Record<string, string> = {
                typing: "typing",
                upload_photo: "upload_photo",
                upload_video: "upload_video",
                upload_voice: "upload_voice",
                upload_document: "upload_document",
            };
            await this.client.sendTyping(this.toPeerId(chatId), (action && statusMap[action]) || "typing");
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to send chat action" };
        }
    }

    async getChat(chatId: number | string) {
        try {
            const chat = await this.client.getChat(this.toPeerId(chatId));
            return {
                ok: true,
                result: {
                    id: chat.id,
                    type: chat.type === "user" ? "private" : chat.chatType || "group",
                    title: chat.title,
                    first_name: chat.firstName,
                    last_name: chat.lastName,
                    username: chat.username,
                    description: chat.description || chat.bio || "",
                },
            };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to get chat" };
        }
    }

    async getChatAdministrators(chatId: number | string) {
        try {
            const members = await this.client.getChatMembers(this.toPeerId(chatId), { type: "admins" });
            return {
                ok: true,
                result: members.map((m: any) => ({
                    user: {
                        id: m.user.id,
                        first_name: m.user.firstName,
                        username: m.user.username,
                        is_bot: m.user.isBot,
                    },
                    status: m.status === "creator" ? "creator" : m.status === "admin" ? "administrator" : m.status,
                })),
            };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to get administrators" };
        }
    }

    async banChatMember(chatId: number | string, userId: number, untilDate?: number) {
        try {
            await this.client.banChatMember({ chatId: this.toPeerId(chatId), participantId: userId, untilDate });
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to ban member" };
        }
    }

    async promoteChatMember(chatId: number | string, userId: number, isAdmin: boolean) {
        try {
            if (isAdmin) {
                await this.client.editAdminRights({ chatId: this.toPeerId(chatId), userId, rights: {
                    changeInfo: true,
                    deleteMessages: true,
                    manageVideoChats: true,
                    restrictMembers: true,
                    inviteUsers: true,
                    pinMessages: true,
                    addAdmins: false,
                    postMessages: true,
                    editMessages: true,
                } });
            } else {
                await this.client.editAdminRights({ chatId: this.toPeerId(chatId), userId, rights: {} });
            }
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to promote member" };
        }
    }

    async deleteWebhook(): Promise<{ ok: boolean; result?: boolean; description?: string }> {
        // No webhooks in MTProto; nothing to do
        return { ok: true, result: true };
    }

    async answerCallbackQuery(callbackQueryId: string, options?: any) {
        try {
            await this.client.answerCallbackQuery(callbackQueryId, {
                text: options?.text,
                alert: options?.show_alert,
            });
            return { ok: true, result: true };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to answer callback query" };
        }
    }

    async sendPhoto(chatId: number | string, photo: string | File, options?: any) {
        return this.sendMedia(chatId, photo, { caption: options?.caption, replyTo: options?.reply_to_message_id, type: "photo" });
    }

    async sendVideo(chatId: number | string, video: string | File, options?: any) {
        return this.sendMedia(chatId, video, { caption: options?.caption, replyTo: options?.reply_to_message_id, type: "video" });
    }

    async sendAudio(chatId: number | string, audio: string | File, options?: any) {
        return this.sendMedia(chatId, audio, { caption: options?.caption, replyTo: options?.reply_to_message_id, type: "audio" });
    }

    async sendDocument(chatId: number | string, document: string | File, options?: any) {
        return this.sendMedia(chatId, document, { caption: options?.caption, replyTo: options?.reply_to_message_id, type: "document" });
    }

    async sendSticker(chatId: number | string, sticker: string) {
        try {
            const result = await this.client.sendMedia(this.toPeerId(chatId), sticker, {});
            return { ok: true, result: this.toBotMessage(result) };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to send sticker" };
        }
    }

    private async sendMedia(chatId: number | string, media: string | File, options: any) {
        try {
            let input: any = media;
            if (typeof media !== "string" && media instanceof File) {
                input = new Uint8Array(await media.arrayBuffer());
                input.fileName = media.name || "file";
            }
            const result = await this.client.sendMedia(this.toPeerId(chatId), input, {
                caption: options.caption,
                replyTo: options.replyTo,
            });
            return { ok: true, result: this.toBotMessage(result) };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to send media" };
        }
    }

    /**
     * Bot-API shaped getFile: downloads via MTProto and returns an
     * object URL as `file_path` (which getFileUrl passes through).
     */
    async getFile(fileId: string) {
        try {
            const bytes = await this.client.downloadAsBuffer(fileId);
            const url = URL.createObjectURL(new Blob([bytes]));
            return { ok: true, result: { file_id: fileId, file_path: url } };
        } catch (error: any) {
            return { ok: false, description: error?.message || "Failed to get file" };
        }
    }

    getFileUrl(filePath: string): string {
        return filePath;
    }

    private toReplyMarkup(markup: any) {
        return markup.inline_keyboard.map((row: any[]) =>
            row.map((button: any) => {
                if (button.callback_data) {
                    return { type: "callback" as const, text: button.text, data: new TextEncoder().encode(button.callback_data) };
                }
                if (button.url) {
                    return { type: "url" as const, text: button.text, url: button.url };
                }
                if (button.web_app?.url) {
                    return { type: "webview" as const, text: button.text, url: button.web_app.url };
                }
                return { type: "text" as const, text: button.text };
            }),
        );
    }

    /** Convert an mtcute Message into a Bot-API-shaped message object */
    toBotMessage(message: any): any {
        const chat = message.chat || {};
        const sender = message.sender || {};
        const media = message.media;
        const result: any = {
            message_id: message.id,
            date: Math.floor((message.date instanceof Date ? message.date.getTime() : Date.now()) / 1000),
            text: message.text || undefined,
            chat: {
                id: chat.id,
                type: chat.type === "user" ? "private" : (chat.chatType || "group"),
                title: chat.title,
                first_name: chat.firstName,
                last_name: chat.lastName,
                username: chat.username,
            },
            from: {
                id: sender.id,
                first_name: sender.firstName,
                last_name: sender.lastName,
                username: sender.username,
                is_bot: sender.isBot,
            },
        };
        if (message.replyToMessage) {
            result.reply_to_message = {
                message_id: message.replyToMessage.id,
                text: message.replyToMessage.quoteText || undefined,
            };
        }
        if (message.markup?.type === "inline") {
            result.reply_markup = {
                inline_keyboard: message.markup.buttons.map((row: any[]) =>
                    row.map((b: any) => {
                        if (b.type === "callback" || b.data) {
                            const data = b.data instanceof Uint8Array
                                ? new TextDecoder().decode(b.data)
                                : String(b.data || "");
                            return { text: b.text, callback_data: data };
                        }
                        if (b.type === "url") return { text: b.text, url: b.url };
                        return { text: b.text };
                    }),
                ),
            };
        }
        if (media?.fileId) {
            switch (media.type) {
                case "photo":
                    result.photo = [{ file_id: media.fileId, file_unique_id: String(media.fileId) }];
                    break;
                case "video":
                    result.video = { file_id: media.fileId, file_name: media.fileName || "video", mime_type: media.mimeType };
                    break;
                case "audio":
                    result.audio = { file_id: media.fileId, file_name: media.fileName || "audio", mime_type: media.mimeType };
                    break;
                case "voice":
                    result.voice = { file_id: media.fileId, mime_type: media.mimeType };
                    break;
                case "sticker":
                    result.sticker = { file_id: media.fileId, emoji: media.emoji };
                    break;
                default:
                    result.document = { file_id: media.fileId, file_name: media.fileName || "document", mime_type: media.mimeType };
            }
            result.caption = message.text || undefined;
        }
        return result;
    }
}

export const mtProtoGateway = new MtProtoGateway();
