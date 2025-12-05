import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star } from "lucide-react";

interface Sticker {
    file_id: string;
    url?: string;
    emoji?: string;
    format?: string;
    addedAt?: number;
    favorite?: boolean;
}

interface StickerPanelProps {
    recentStickers: Sticker[];
    favoriteStickers: Sticker[];
    stickerFileId: string;
    setStickerFileId: (id: string) => void;
    isSendingSticker: boolean;
    isConnected: boolean;
    activeChatId: number | string | null;
    onSendSticker: (fileId: string) => Promise<void>;
    onSendStickerById: () => Promise<void>;
    onToggleFavorite: (sticker: Sticker) => void;
    isStickerFavorite: (fileId: string) => boolean;
}

export function StickerPanel({
    recentStickers,
    favoriteStickers,
    stickerFileId,
    setStickerFileId,
    isSendingSticker,
    isConnected,
    activeChatId,
    onSendSticker,
    onSendStickerById,
    onToggleFavorite,
    isStickerFavorite,
}: StickerPanelProps) {
    const stickerFileInputRef = useRef<HTMLInputElement>(null);

    const handleStickerFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !activeChatId || !isConnected)
            return;

        // Direct sticker file upload not supported - only file_id works
        alert(
            "Hiện chưa hỗ trợ tải lên sticker trực tiếp. Vui lòng dùng file_id từ tab 'File ID'.",
        );
        // Reset input
        if (stickerFileInputRef.current) {
            stickerFileInputRef.current.value = "";
        }
    };

    const renderStickerButton = (s: Sticker, showFavoriteToggle: boolean) => {
        const isFav = isStickerFavorite(s.file_id);

        return (
            <div key={s.file_id} className="relative">
                <button
                    className="border rounded-lg p-1 flex items-center justify-center hover:bg-muted/80 transition-colors h-16 w-full"
                    onClick={() => onSendSticker(s.file_id)}
                    disabled={isSendingSticker || !isConnected || !activeChatId}
                    title={s.emoji || ""}
                >
                    {s.format === "static" && s.url ? (
                        <img
                            src={s.url}
                            alt={s.emoji || "sticker"}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : s.format === "video" && s.url ? (
                        <video
                            src={s.url}
                            autoPlay
                            loop
                            muted
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <span className="text-3xl">{s.emoji || "✨"}</span>
                    )}
                </button>
                {showFavoriteToggle && (
                    <button
                        className="absolute top-1 right-1 p-1 rounded bg-background/80 border hover:bg-background"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite({ ...s });
                        }}
                        title={isFav ? "Bỏ ưa thích" : "Thêm vào ưa thích"}
                    >
                        <span className="sr-only">Favorite</span>
                        <Star
                            className={`h-4 w-4 ${isFav ? "text-yellow-500" : "opacity-50"}`}
                        />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="absolute bottom-16 right-4 z-20 w-80 rounded-2xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-xl p-3 animate-slideIn">
            <Tabs defaultValue="recent" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="recent">Gần đây</TabsTrigger>
                    <TabsTrigger value="favorite">Ưa thích</TabsTrigger>
                    <TabsTrigger value="id">File ID</TabsTrigger>
                    <TabsTrigger value="upload">Tải lên</TabsTrigger>
                </TabsList>

                <TabsContent value="recent" className="mt-3">
                    {recentStickers && recentStickers.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {recentStickers.map((s) =>
                                renderStickerButton(s, true),
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Chưa có sticker gần đây. Hãy gửi một sticker để lưu
                            lại.
                        </p>
                    )}
                </TabsContent>

                <TabsContent value="favorite" className="mt-3">
                    {favoriteStickers && favoriteStickers.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {favoriteStickers.map((s) => (
                                <div key={s.file_id} className="relative">
                                    <button
                                        className="border rounded-lg p-1 flex items-center justify-center hover:bg-muted/80 transition-colors h-16 w-full"
                                        onClick={() => onSendSticker(s.file_id)}
                                        disabled={
                                            isSendingSticker ||
                                            !isConnected ||
                                            !activeChatId
                                        }
                                        title={s.emoji || ""}
                                    >
                                        {s.format === "static" && s.url ? (
                                            <img
                                                src={s.url}
                                                alt={s.emoji || "sticker"}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        ) : s.format === "video" && s.url ? (
                                            <video
                                                src={s.url}
                                                autoPlay
                                                loop
                                                muted
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        ) : (
                                            <span className="text-3xl">
                                                {s.emoji || "✨"}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        className="absolute top-1 right-1 p-1 rounded bg-background/80 border hover:bg-background"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleFavorite(s);
                                        }}
                                        title="Bỏ ưa thích"
                                    >
                                        <span className="sr-only">
                                            Unfavorite
                                        </span>
                                        <Star className="h-4 w-4 text-yellow-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Chưa có sticker ưa thích.
                        </p>
                    )}
                </TabsContent>

                <TabsContent value="id" className="mt-3 space-y-2">
                    <Label htmlFor="sticker-id-input" className="text-xs">
                        Nhập file_id sticker
                    </Label>
                    <Input
                        id="sticker-id-input"
                        placeholder="Ví dụ: CAACAgIAAxkBA..."
                        value={stickerFileId}
                        onChange={(e) => setStickerFileId(e.target.value)}
                        disabled={
                            !isConnected || !activeChatId || isSendingSticker
                        }
                    />
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={onSendStickerById}
                            disabled={
                                !stickerFileId.trim() ||
                                !isConnected ||
                                !activeChatId ||
                                isSendingSticker
                            }
                        >
                            {isSendingSticker ? "Đang gửi..." : "Gửi sticker"}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-3 space-y-2">
                    <Label className="text-xs">
                        Chọn file .webp, .webm, .tgs
                    </Label>
                    <input
                        ref={stickerFileInputRef}
                        type="file"
                        accept=".webp,.webm,image/webp,video/webm,.tgs,application/x-tgsticker"
                        onChange={handleStickerFileChange}
                        disabled={
                            !isConnected || !activeChatId || isSendingSticker
                        }
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Hỗ trợ: static (.webp), video (.webm), animated (.tgs).
                        Sticker không hiển thị sẽ dùng emoji thay thế.
                    </p>
                </TabsContent>
            </Tabs>
        </div>
    );
}
