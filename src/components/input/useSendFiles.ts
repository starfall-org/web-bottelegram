import { useState } from "react";
import { botService } from "@/services/botService";
import { useBotStore, type MediaGroupItem } from "@/store/botStore";
import { useTranslation } from "@/i18n/useTranslation";

interface UseSendFilesOptions {
    activeChatId: number | string | null;
    isConnected: boolean;
    replyTo: string | null;
    replyMessage: any;
    setReplyTo: (id: string | null) => void;
    message: string;
    setMessage: (msg: string) => void;
}

type SentFileKind = "photo" | "video" | "audio" | "document";

const getFileKind = (file: File): SentFileKind => {
    const mime = file.type || "";
    const name = file.name.toLowerCase();
    if (mime.startsWith("image/")) return "photo";
    if (mime.startsWith("video/") || name.endsWith(".webm")) return "video";
    if (
        mime.startsWith("audio/") ||
        name.endsWith(".mp3") ||
        name.endsWith(".wav") ||
        name.endsWith(".ogg")
    ) return "audio";
    return "document";
};

const canUseMediaGroup = (files: File[]) => {
    if (files.length < 2) return false;
    const kinds = files.map(getFileKind);
    const photoVideoOnly = kinds.every((kind) => kind === "photo" || kind === "video");
    const audioOnly = kinds.every((kind) => kind === "audio");
    const documentOnly = kinds.every((kind) => kind === "document");
    return photoVideoOnly || audioOnly || documentOnly;
};

export function useSendFiles({
    activeChatId,
    isConnected,
    replyTo,
    replyMessage,
    setReplyTo,
    message,
    setMessage,
}: UseSendFilesOptions) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isSendingFiles, setIsSendingFiles] = useState(false);
    const { addMessage, removeMessage } = useBotStore();
    const { t } = useTranslation();

    const clearSelectedFiles = () => setSelectedFiles([]);

    const getSentFileId = (sent: any, kind: SentFileKind): string | undefined => {
        if (kind === "photo") {
            const sizes = sent.photo;
            return Array.isArray(sizes) && sizes.length > 0
                ? sizes[sizes.length - 1]?.file_id
                : undefined;
        }
        return sent[kind]?.file_id;
    };

    const resolveSentUrl = async (
        sent: any,
        kind: SentFileKind,
        file: File,
        existingLocalUrl?: string,
    ) => {
        const localUrl = existingLocalUrl || URL.createObjectURL(file);
        const fileId = getSentFileId(sent, kind);
        if (!fileId) return localUrl;

        try {
            const fileInfo = await botService.getFile(fileId);
            if (fileInfo.ok && fileInfo.result?.file_path) {
                const remoteUrl = botService.getFileUrl(fileInfo.result.file_path);
                if (remoteUrl) {
                    URL.revokeObjectURL(localUrl);
                    return remoteUrl;
                }
            }
        } catch (error) {
            console.warn("[useSendFiles] Could not resolve remote media URL:", error);
        }
        return localUrl;
    };

    const addSingleSentMessage = async (
        sent: any,
        file: File,
        kind: SentFileKind,
        caption: string | undefined,
        replyToId: number | undefined,
        localUrl?: string,
    ) => {
        if (sent?.message_id == null) return;
        const mediaUrl = await resolveSentUrl(sent, kind, file, localUrl);
        addMessage(String(activeChatId), {
            id: sent.message_id,
            type: kind,
            side: "right",
            caption: sent.caption || caption,
            mediaUrl,
            fileName:
                kind === "photo" ? undefined : sent[kind]?.file_name || file.name,
            date: typeof sent.date === "number" ? sent.date * 1000 : Date.now(),
            fromId: sent.from?.id,
            fromName: sent.from?.first_name || t("chat.you"),
            reply_to: replyToId,
            reply_preview:
                replyMessage?.text?.substring(0, 50) ||
                replyMessage?.caption?.substring(0, 50),
        });
    };

    const sendSingleFile = async (
        file: File,
        caption: string | undefined,
        replyToId: number | undefined,
        optimisticId: string,
        localUrl: string,
    ) => {
        const kind = getFileKind(file);
        const options = { caption, reply_to_message_id: replyToId };
        const response = kind === "photo"
            ? await botService.sendPhoto(activeChatId!, file, options)
            : kind === "video"
              ? await botService.sendVideo(activeChatId!, file, options)
              : kind === "audio"
                ? await botService.sendAudio(activeChatId!, file, options)
                : await botService.sendDocument(activeChatId!, file, options);

        if (!response?.ok || !response.result) {
            throw new Error(response?.description || `Không thể gửi ${file.name}`);
        }
        removeMessage(String(activeChatId), optimisticId);
        await addSingleSentMessage(
            response.result,
            file,
            kind,
            caption,
            replyToId,
            localUrl,
        );
    };

    const sendGroup = async (
        files: File[],
        caption: string | undefined,
        replyToId: number | undefined,
        optimisticId: string,
        localUrls: string[],
    ) => {
        const response = await botService.sendMediaGroup(activeChatId!, files, {
            caption,
            reply_to_message_id: replyToId,
        });
        if (!response?.ok || !Array.isArray(response.result)) {
            throw new Error(response?.description || "Không thể gửi media group");
        }

        const sentMessages: any[] = response.result;
        removeMessage(String(activeChatId), optimisticId);
        const groupId = String(
            sentMessages[0]?.media_group_id ||
            `out-${sentMessages[0]?.message_id || Date.now()}`,
        );

        for (let index = 0; index < sentMessages.length; index++) {
            const sent = sentMessages[index];
            const file = files[index];
            if (!file || sent?.message_id == null) continue;
            const kind = getFileKind(file);
            const mediaUrl = await resolveSentUrl(sent, kind, file, localUrls[index]);
            const item: MediaGroupItem = {
                id: sent.message_id,
                type: kind,
                mediaUrl,
                caption: sent.caption || (index === 0 ? caption : undefined),
                fileName: kind === "photo" ? undefined : sent[kind]?.file_name || file.name,
                mimeType: file.type || undefined,
                date: typeof sent.date === "number" ? sent.date * 1000 : Date.now(),
            };

            // addMessage merges messages that share mediaGroupId while still
            // recording every Telegram message_id for de-duplication.
            addMessage(String(activeChatId), {
                id: sent.message_id,
                type: "media_group",
                side: "right",
                caption: index === 0 ? sent.caption || caption : undefined,
                mediaGroupId: String(sent.media_group_id || groupId),
                mediaGroupItems: [item],
                date: item.date || Date.now(),
                fromId: sent.from?.id,
                fromName: sent.from?.first_name || t("chat.you"),
                reply_to: replyToId,
                reply_preview:
                    replyMessage?.text?.substring(0, 50) ||
                    replyMessage?.caption?.substring(0, 50),
            });
        }
    };

    const sendSelectedFiles = async () => {
        if (!activeChatId || !isConnected || selectedFiles.length === 0) return;

        const chatId = String(activeChatId);
        const filesToSend = [...selectedFiles];
        const replyToId = replyTo ? parseInt(replyTo, 10) : undefined;
        const caption = message.trim() || undefined;
        const replyPreview =
            replyMessage?.text?.substring(0, 50) ||
            replyMessage?.caption?.substring(0, 50);
        const pendingIds: string[] = [];
        const localUrls = new Map<File, string>();
        const getLocalUrl = (file: File) => {
            let url = localUrls.get(file);
            if (!url) {
                url = URL.createObjectURL(file);
                localUrls.set(file, url);
            }
            return url;
        };
        const makePendingId = (suffix: string) =>
            `pending-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 8)}`;

        // Optimistic UI: put the selected files in the conversation immediately
        // and clear the composer before any Telegram upload/network request waits.
        if (canUseMediaGroup(filesToSend)) {
            for (let offset = 0; offset < filesToSend.length; offset += 10) {
                const chunk = filesToSend.slice(offset, offset + 10);
                const chunkCaption = offset === 0 ? caption : undefined;
                if (chunk.length > 1) {
                    const pendingId = makePendingId(`group-${offset}`);
                    pendingIds.push(pendingId);
                    const now = Date.now();
                    addMessage(chatId, {
                        id: pendingId,
                        type: "media_group",
                        side: "right",
                        caption: chunkCaption,
                        mediaGroupId: pendingId,
                        mediaGroupItems: chunk.map((file, index) => ({
                            id: `${pendingId}-${index}`,
                            type: getFileKind(file),
                            mediaUrl: getLocalUrl(file),
                            caption: index === 0 ? chunkCaption : undefined,
                            fileName: getFileKind(file) === "photo" ? undefined : file.name,
                            mimeType: file.type || undefined,
                            date: now,
                        })),
                        date: now,
                        fromName: t("chat.you"),
                        reply_to: replyToId,
                        reply_preview: replyPreview,
                    });
                } else if (chunk[0]) {
                    const file = chunk[0];
                    const pendingId = makePendingId(`file-${offset}`);
                    pendingIds.push(pendingId);
                    const kind = getFileKind(file);
                    addMessage(chatId, {
                        id: pendingId,
                        type: kind,
                        side: "right",
                        caption: chunkCaption,
                        mediaUrl: getLocalUrl(file),
                        fileName: kind === "photo" ? undefined : file.name,
                        date: Date.now(),
                        fromName: t("chat.you"),
                        reply_to: replyToId,
                        reply_preview: replyPreview,
                    });
                }
            }
        } else {
            filesToSend.forEach((file, index) => {
                const pendingId = makePendingId(`file-${index}`);
                pendingIds.push(pendingId);
                const kind = getFileKind(file);
                addMessage(chatId, {
                    id: pendingId,
                    type: kind,
                    side: "right",
                    caption: index === 0 ? caption : undefined,
                    mediaUrl: getLocalUrl(file),
                    fileName: kind === "photo" ? undefined : file.name,
                    date: Date.now() + index,
                    fromName: t("chat.you"),
                    reply_to: replyToId,
                    reply_preview: replyPreview,
                });
            });
        }

        clearSelectedFiles();
        setMessage("");
        setReplyTo(null);
        setIsSendingFiles(true);

        try {
            let pendingIndex = 0;
            if (canUseMediaGroup(filesToSend)) {
                for (let offset = 0; offset < filesToSend.length; offset += 10) {
                    const chunk = filesToSend.slice(offset, offset + 10);
                    const chunkCaption = offset === 0 ? caption : undefined;
                    const pendingId = pendingIds[pendingIndex++];
                    if (chunk.length > 1) {
                        await sendGroup(
                            chunk,
                            chunkCaption,
                            replyToId,
                            pendingId,
                            chunk.map(getLocalUrl),
                        );
                    } else if (chunk[0]) {
                        await sendSingleFile(
                            chunk[0],
                            chunkCaption,
                            replyToId,
                            pendingId,
                            getLocalUrl(chunk[0]),
                        );
                    }
                }
            } else {
                for (let index = 0; index < filesToSend.length; index++) {
                    const file = filesToSend[index];
                    await sendSingleFile(
                        file,
                        index === 0 ? caption : undefined,
                        replyToId,
                        pendingIds[index],
                        getLocalUrl(file),
                    );
                }
            }
        } catch (error) {
            // Remove only still-pending placeholders. Successfully confirmed
            // messages have already replaced their corresponding placeholder.
            pendingIds.forEach((id) => removeMessage(chatId, id));
            console.error("[useSendFiles] Error sending files:", error);
            alert(
                `Có lỗi khi gửi tệp: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            setIsSendingFiles(false);
        }
    };

    return {
        selectedFiles,
        setSelectedFiles,
        isSendingFiles,
        clearSelectedFiles,
        sendSelectedFiles,
    };
}
