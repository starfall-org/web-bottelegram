import { useState } from "react";
import { botService } from "@/services/botService";
import { useBotStore } from "@/store/botStore";
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

    const clearSelectedFiles = () => {
        setSelectedFiles([]);
    };

    const sendSelectedFiles = async () => {
        if (!activeChatId || !isConnected || selectedFiles.length === 0) return;
        setIsSendingFiles(true);
        const replyToId = replyTo ? parseInt(replyTo) : undefined;

        console.log(
            "[useSendFiles] Starting to send files:",
            selectedFiles.length,
        );

        try {
            for (const file of selectedFiles) {
                const mime = file.type || "";
                const lowerName = file.name.toLowerCase();

                console.log(
                    "[useSendFiles] Sending file:",
                    file.name,
                    "mime:",
                    mime,
                    "size:",
                    file.size,
                );

                let response: any;

                // Only add caption to the first file (use main message input as caption)
                const caption =
                    selectedFiles.indexOf(file) === 0
                        ? message.trim()
                        : undefined;

                if (mime.startsWith("image/")) {
                    console.log("[useSendFiles] Sending as photo");
                    response = await botService.sendPhoto(activeChatId, file, {
                        caption,
                        reply_to_message_id: replyToId,
                    });
                } else if (mime.startsWith("video/")) {
                    response = await botService.sendVideo(activeChatId, file, {
                        caption,
                        reply_to_message_id: replyToId,
                    });
                } else if (mime.startsWith("audio/")) {
                    response = await botService.sendAudio(activeChatId, file, {
                        caption,
                        reply_to_message_id: replyToId,
                    });
                } else if (lowerName.endsWith(".webm")) {
                    response = await botService.sendVideo(activeChatId, file, {
                        caption,
                        reply_to_message_id: replyToId,
                    });
                } else if (
                    lowerName.endsWith(".mp3") ||
                    lowerName.endsWith(".wav") ||
                    lowerName.endsWith(".ogg")
                ) {
                    response = await botService.sendAudio(activeChatId, file, {
                        caption,
                        reply_to_message_id: replyToId,
                    });
                } else {
                    response = await botService.sendDocument(
                        activeChatId,
                        file,
                        {
                            caption,
                            reply_to_message_id: replyToId,
                        },
                    );
                }

                console.log("[useSendFiles] Response:", response);

                if (response.ok && response.result) {
                    const sent: any = response.result;
                    console.log("[useSendFiles] Sent result:", sent);

                    let newMsg: any = {
                        id: sent.message_id,
                        side: "right" as const,
                        date: sent.date * 1000,
                        fromId: sent.from?.id,
                        fromName: sent.from?.first_name || t("chat.you"),
                        reply_to: replyToId,
                        reply_preview: replyMessage?.text?.substring(0, 50),
                    };

                    if (sent.photo) {
                        const photo = sent.photo[sent.photo.length - 1];
                        console.log(
                            "[useSendFiles] Photo file_id:",
                            photo.file_id,
                        );
                        let mediaUrl: string | undefined;
                        try {
                            const fileInfo = await botService.getFile(
                                photo.file_id,
                            );
                            console.log("[useSendFiles] File info:", fileInfo);
                            if (fileInfo.ok && fileInfo.result?.file_path) {
                                mediaUrl = botService.getFileUrl(
                                    fileInfo.result.file_path,
                                );
                                console.log(
                                    "[useSendFiles] Media URL:",
                                    mediaUrl,
                                );
                            }
                        } catch (e) {
                            console.error(
                                "[useSendFiles] Error getting file:",
                                e,
                            );
                        }
                        newMsg = {
                            ...newMsg,
                            type: "photo" as const,
                            mediaUrl,
                        };
                    } else if (sent.video) {
                        let mediaUrl: string | undefined;
                        try {
                            const fileInfo = await botService.getFile(
                                sent.video.file_id,
                            );
                            if (fileInfo.ok && fileInfo.result?.file_path) {
                                mediaUrl = botService.getFileUrl(
                                    fileInfo.result.file_path,
                                );
                            }
                        } catch {}
                        newMsg = {
                            ...newMsg,
                            type: "video" as const,
                            mediaUrl,
                            fileName: sent.video.file_name,
                        };
                    } else if (sent.audio) {
                        let mediaUrl: string | undefined;
                        try {
                            const fileInfo = await botService.getFile(
                                sent.audio.file_id,
                            );
                            if (fileInfo.ok && fileInfo.result?.file_path) {
                                mediaUrl = botService.getFileUrl(
                                    fileInfo.result.file_path,
                                );
                            }
                        } catch {}
                        newMsg = {
                            ...newMsg,
                            type: "audio" as const,
                            mediaUrl,
                            fileName: sent.audio.file_name,
                        };
                    } else if (sent.document) {
                        let mediaUrl: string | undefined;
                        try {
                            const fileInfo = await botService.getFile(
                                sent.document.file_id,
                            );
                            if (fileInfo.ok && fileInfo.result?.file_path) {
                                mediaUrl = botService.getFileUrl(
                                    fileInfo.result.file_path,
                                );
                            }
                        } catch {}
                        newMsg = {
                            ...newMsg,
                            type: "document" as const,
                            mediaUrl,
                            fileName: sent.document.file_name,
                        };
                    }

                    addMessage(String(activeChatId), newMsg);
                } else {
                    console.error(
                        "[useSendFiles] Failed to send file:",
                        response.description,
                    );
                    alert(
                        `Gửi file thất bại: ${response.description || "Unknown error"}`,
                    );
                }
            }
            clearSelectedFiles();
            setMessage(""); // Clear message input after sending
            setReplyTo(null);
        } catch (err: any) {
            console.error("[useSendFiles] Error sending files:", err);
            alert(`Có lỗi khi gửi tệp: ${err?.message || err}`);
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
