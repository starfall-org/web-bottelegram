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
    const { addMessage } = useBotStore();
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

    const resolveSentUrl = async (sent: any, kind: SentFileKind, file: File) => {
        const localUrl = URL.createObjectURL(file);
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
    ) => {
        if (sent?.message_id == null) return;
        const mediaUrl = await resolveSentUrl(sent, kind, file);
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
        await addSingleSentMessage(response.result, file, kind, caption, replyToId);
    };

    const sendGroup = async (
        files: File[],
        caption: string | undefined,
        replyToId: number | undefined,
    ) => {
        const response = await botService.sendMediaGroup(activeChatId!, files, {
            caption,
            reply_to_message_id: replyToId,
        });
        if (!response?.ok || !Array.isArray(response.result)) {
            throw new Error(response?.description || "Không thể gửi media group");
        }

        const sentMessages: any[] = response.result;
        const groupId = String(
            sentMessages[0]?.media_group_id ||
            `out-${sentMessages[0]?.message_id || Date.now()}`,
        );

        for (let index = 0; index < sentMessages.length; index++) {
            const sent = sentMessages[index];
            const file = files[index];
            if (!file || sent?.message_id == null) continue;
            const kind = getFileKind(file);
            const mediaUrl = await resolveSentUrl(sent, kind, file);
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
        setIsSendingFiles(true);
        const replyToId = replyTo ? parseInt(replyTo, 10) : undefined;
        const caption = message.trim() || undefined;

        try {
            if (canUseMediaGroup(selectedFiles)) {
                // Telegram accepts at most 10 items in one media group.
                for (let offset = 0; offset < selectedFiles.length; offset += 10) {
                    const chunk = selectedFiles.slice(offset, offset + 10);
                    const chunkCaption = offset === 0 ? caption : undefined;
                    if (chunk.length > 1) {
                        await sendGroup(chunk, chunkCaption, replyToId);
                    } else {
                        await sendSingleFile(chunk[0], chunkCaption, replyToId);
                    }
                }
            } else {
                for (let index = 0; index < selectedFiles.length; index++) {
                    await sendSingleFile(
                        selectedFiles[index],
                        index === 0 ? caption : undefined,
                        replyToId,
                    );
                }
            }

            clearSelectedFiles();
            setMessage("");
            setReplyTo(null);
        } catch (error) {
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
