import { useState } from "react";
import { botService } from "@/services/botService";
import { useBotStore } from "@/store/botStore";
import { useTranslation } from "@/i18n/useTranslation";

interface UseSendStickerOptions {
    activeChatId: number | string | null;
    isConnected: boolean;
    replyTo: string | null;
    replyMessage: any;
    setReplyTo: (id: string | null) => void;
}

export function useSendSticker({
    activeChatId,
    isConnected,
    replyTo,
    replyMessage,
    setReplyTo,
}: UseSendStickerOptions) {
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [stickerFileId, setStickerFileId] = useState("");
    const [isSendingSticker, setIsSendingSticker] = useState(false);

    const {
        addMessage,
        addRecentSticker,
        addFavoriteSticker,
        removeFavoriteSticker,
    } = useBotStore();
    const { t } = useTranslation();

    const recentStickers = useBotStore((s: any) => s.getRecentStickers());
    const favoriteStickers = useBotStore((s: any) => s.getFavoriteStickers());

    const isStickerFavorite = (fileId: string) =>
        Array.isArray(favoriteStickers) &&
        favoriteStickers.some((s: any) => s.file_id === fileId);

    const toggleFavoriteSticker = (sticker: any) => {
        if (!sticker?.file_id) return;
        if (isStickerFavorite(sticker.file_id)) {
            removeFavoriteSticker(sticker.file_id);
        } else {
            addFavoriteSticker({
                file_id: sticker.file_id,
                url: sticker.url,
                emoji: sticker.emoji,
                format: sticker.format || "unknown",
                addedAt: Date.now(),
                favorite: true,
            } as any);
        }
    };

    const handleSendStickerCore = async (fileId: string) => {
        if (!fileId || !activeChatId || !isConnected) return;
        setIsSendingSticker(true);
        try {
            const response = await botService.sendSticker(activeChatId, fileId);

            if (response.ok && response.result) {
                const sentMessage = response.result;
                let mediaUrl: string | undefined;
                let stickerFormat: string | undefined;

                try {
                    if (sentMessage.sticker?.file_id) {
                        const fileInfo = await botService.getFile(
                            sentMessage.sticker.file_id,
                        );
                        if (fileInfo.ok && fileInfo.result?.file_path) {
                            mediaUrl = botService.getFileUrl(
                                fileInfo.result.file_path,
                            );
                            const fp = fileInfo.result.file_path.toLowerCase();
                            if (fp.endsWith(".webm")) stickerFormat = "video";
                            else if (fp.endsWith(".webp"))
                                stickerFormat = "static";
                            else if (fp.endsWith(".tgs"))
                                stickerFormat = "animated";
                        }
                    }
                } catch {}

                // Save to recent stickers for reuse
                if (sentMessage.sticker?.file_id) {
                    addRecentSticker({
                        file_id: sentMessage.sticker.file_id,
                        url: mediaUrl,
                        emoji: sentMessage.sticker?.emoji,
                        format: (stickerFormat as any) || "unknown",
                        addedAt: Date.now(),
                    });
                }

                const newMessage = {
                    id: sentMessage.message_id,
                    type: "sticker" as const,
                    side: "right" as const,
                    mediaUrl,
                    stickerFormat,
                    emoji: sentMessage.sticker?.emoji,
                    date: sentMessage.date * 1000,
                    fromId: sentMessage.from?.id,
                    fromName: sentMessage.from?.first_name || t("chat.you"),
                    reply_to: replyTo ? parseInt(replyTo) : undefined,
                    reply_preview: replyMessage?.text?.substring(0, 50),
                };
                addMessage(String(activeChatId), newMessage);
                setReplyTo(null);
                setShowStickerPanel(false);
                setStickerFileId("");
            } else {
                console.error("Failed to send sticker:", response.description);
                alert(response.description || "Gửi sticker thất bại");
            }
        } catch (error) {
            console.error("Error sending sticker:", error);
            alert("Có lỗi khi gửi sticker");
        } finally {
            setIsSendingSticker(false);
        }
    };

    const handleSendStickerById = async () => {
        const id = stickerFileId.trim();
        if (!id) return;
        await handleSendStickerCore(id);
    };

    const handleSendStickerFromRecent = async (fileId: string) => {
        await handleSendStickerCore(fileId);
    };

    const toggleStickerPanel = () => {
        if (!isConnected || !activeChatId) return;
        setShowStickerPanel((prev) => !prev);
    };

    return {
        showStickerPanel,
        setShowStickerPanel,
        stickerFileId,
        setStickerFileId,
        isSendingSticker,
        recentStickers,
        favoriteStickers,
        isStickerFavorite,
        toggleFavoriteSticker,
        handleSendStickerById,
        handleSendStickerFromRecent,
        toggleStickerPanel,
    };
}
