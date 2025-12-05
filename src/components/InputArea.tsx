import React, { useState, useRef, useEffect } from "react";
import { useBotStore } from "@/store/botStore";
import { botService } from "@/services/botService";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Smile, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StickerPanel } from "@/components/input/StickerPanel";
import { useSendFiles } from "@/components/input/useSendFiles";
import { useSendSticker } from "@/components/input/useSendSticker";

interface InputAreaProps {
    className?: string;
}

// Helper to check if file is image
const isImageFile = (file: File) => {
    return file.type.startsWith("image/");
};

// Helper to create object URL for preview
const getFilePreviewUrl = (file: File): string | null => {
    if (isImageFile(file)) {
        return URL.createObjectURL(file);
    }
    return null;
};

export function InputArea({ className }: InputAreaProps) {
    const [message, setMessage] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const chatActionTimer = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const stickerPanelRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    const {
        getCurrentActiveChatId,
        getCurrentChats,
        replyTo,
        setReplyTo,
        editingMessageId,
        setEditingMessageId,
        isConnected,
        addMessage,
        updateMessage,
    } = useBotStore();

    const activeChatId = getCurrentActiveChatId();
    const chats = getCurrentChats();
    const activeChat = activeChatId ? chats?.get(activeChatId) : null;

    const replyMessage =
        replyTo && activeChat
            ? activeChat.messages.find((m: any) => m.id.toString() === replyTo)
            : null;

    const editingMsg =
        editingMessageId && activeChat
            ? activeChat.messages.find(
                  (m: any) => m.id.toString() === editingMessageId,
              )
            : null;

    // File sending hook
    const {
        selectedFiles,
        setSelectedFiles,
        isSendingFiles,
        sendSelectedFiles,
    } = useSendFiles({
        activeChatId,
        isConnected,
        replyTo,
        replyMessage,
        setReplyTo,
        message,
        setMessage,
    });

    // Sticker sending hook
    const {
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
    } = useSendSticker({
        activeChatId,
        isConnected,
        replyTo,
        replyMessage,
        setReplyTo,
    });

    // Set message when editing
    useEffect(() => {
        if (editingMsg && editingMsg.text != null) {
            setMessage(editingMsg.text);
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height =
                    Math.min(textareaRef.current.scrollHeight, 120) + "px";
                textareaRef.current.focus();
            }
            setIsFocused(true);
        }
    }, [editingMessageId]);

    // Sync Telegram chat action "typing" while input is focused
    useEffect(() => {
        if (!isConnected || !activeChatId) return;

        if (chatActionTimer.current) {
            clearInterval(chatActionTimer.current);
            chatActionTimer.current = null;
        }

        if (isFocused) {
            const send = () => {
                botService.sendChatAction(activeChatId, "typing");
            };
            send();
            chatActionTimer.current = window.setInterval(send, 4000);
        }

        return () => {
            if (chatActionTimer.current) {
                clearInterval(chatActionTimer.current);
                chatActionTimer.current = null;
            }
        };
    }, [isFocused, isConnected, activeChatId]);

    // Close sticker panel on outside click
    useEffect(() => {
        const onDocMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideSticker =
                stickerPanelRef.current?.contains(target) ?? false;
            if (!insideSticker && showStickerPanel) {
                setShowStickerPanel(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [showStickerPanel]);

    // Handle paste for clipboard images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }

        if (files.length > 0) {
            e.preventDefault();
            setSelectedFiles((prev) => [...prev, ...files]);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);
        }
    };

    const handleSend = async () => {
        // If there are files, send files with caption
        if (selectedFiles.length > 0) {
            await sendSelectedFiles();
            return;
        }

        const textToSend = message.trim();
        if (!textToSend || !activeChatId || !isConnected) return;

        // If editing
        if (editingMessageId) {
            const msgId = parseInt(editingMessageId);
            const response = await botService.editMessageText(
                activeChatId,
                msgId,
                textToSend,
            );

            if (response.ok) {
                updateMessage(activeChatId, msgId, { text: textToSend });
            }
            setEditingMessageId(null);
            setMessage("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
            return;
        }

        // Clear input immediately
        setMessage("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        const replyToId = replyTo ? parseInt(replyTo) : undefined;

        try {
            const response = await botService.sendMessage(
                activeChatId,
                textToSend,
                {
                    reply_to_message_id: replyToId,
                },
            );

            if (response.ok && response.result) {
                const sentMessage = response.result;
                const newMessage = {
                    id: sentMessage.message_id,
                    type: "text" as const,
                    side: "right" as const,
                    text: sentMessage.text,
                    date: sentMessage.date * 1000,
                    fromId: sentMessage.from?.id,
                    fromName: sentMessage.from?.first_name || t("chat.you"),
                    reply_to: replyToId,
                    reply_preview: replyMessage?.text?.substring(0, 50),
                };
                addMessage(activeChatId, newMessage);
                setReplyTo(null);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setMessage(e.target.value);

        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    };

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const selected = Array.from(files);
        setSelectedFiles((prev) => [...prev, ...selected]);
        // Reset input so selecting the same file again still triggers change
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const clearSelectedFiles = () => {
        setSelectedFiles([]);
    };

    const cancelReply = () => {
        setReplyTo(null);
    };

    return (
        <div
            className={cn(
                "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative",
                className,
                isDragging && "ring-2 ring-primary ring-inset",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg">
                    <div className="text-center">
                        <Paperclip className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium text-primary">
                            Thả file vào đây để gửi
                        </p>
                    </div>
                </div>
            )}

            {/* Reply Context */}
            {replyTo && replyMessage && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                            {t("chat.replyingTo")}
                        </p>
                        <p className="text-sm truncate">{replyMessage.text}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelReply}
                        className="h-6 w-6 p-0"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Editing Context */}
            {editingMessageId && editingMsg && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                            {t("chat.editing")}
                        </p>
                        <p className="text-sm truncate">{editingMsg.text}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMessageId(null)}
                        className="h-6 w-6 p-0"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* File Preview Area - Integrated into input */}
            {selectedFiles.length > 0 && (
                <div className="px-3 pt-3 border-b bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                            {selectedFiles.length} tệp đã chọn
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleFileSelect}
                                className="h-7 px-2 text-xs"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Thêm
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSelectedFiles}
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                                Xóa hết
                            </Button>
                        </div>
                    </div>

                    {/* File thumbnails */}
                    <div className="flex gap-2 pb-3 overflow-x-auto">
                        {selectedFiles.map((file, idx) => {
                            const isImage = isImageFile(file);
                            const previewUrl = isImage
                                ? getFilePreviewUrl(file)
                                : null;

                            return (
                                <div
                                    key={`${file.name}-${idx}`}
                                    className="relative group flex-shrink-0"
                                >
                                    {isImage && previewUrl ? (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
                                            <img
                                                src={previewUrl}
                                                alt={file.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg border bg-muted flex flex-col items-center justify-center p-1">
                                            <span className="text-lg">📄</span>
                                            <p className="text-[10px] text-center truncate w-full">
                                                {file.name.length > 8
                                                    ? file.name.substring(
                                                          0,
                                                          8,
                                                      ) + "..."
                                                    : file.name}
                                            </p>
                                        </div>
                                    )}
                                    {/* Remove button */}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeSelectedFile(idx)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Typing Indicator */}
            {isFocused &&
                isConnected &&
                activeChatId &&
                !selectedFiles.length && (
                    <div className="px-4 py-1 border-b">
                        <p className="text-xs text-muted-foreground">
                            {t("chat.composing")}
                        </p>
                    </div>
                )}

            <div className="relative flex items-end gap-2 p-3 md:p-4">
                <div
                    className={cn(
                        "flex items-end gap-2 w-full bg-card/60 border rounded-2xl px-2 py-2 shadow-sm transition-all",
                        isFocused
                            ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                            : "hover:shadow-md",
                    )}
                >
                    {/* Attach Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFileSelect}
                        disabled={!isConnected || !activeChatId}
                        className="shrink-0"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>

                    {/* Message Input */}
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onPaste={handlePaste}
                            placeholder={
                                selectedFiles.length > 0
                                    ? "Thêm chú thích (tùy chọn)..."
                                    : editingMessageId
                                      ? t("chat.editing")
                                      : !isConnected
                                        ? t("chat.disconnected")
                                        : !activeChatId
                                          ? t("chat.selectChat")
                                          : t("chat.typeMessage")
                            }
                            disabled={!isConnected || !activeChatId}
                            className={cn(
                                "w-full min-h-[40px] max-h-[120px] px-0 py-1 bg-transparent text-sm",
                                "placeholder:text-muted-foreground",
                                "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                                "resize-none",
                            )}
                            rows={1}
                        />
                    </div>

                    {/* Sticker/Emoji Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isConnected || !activeChatId}
                        className="shrink-0"
                        onClick={toggleStickerPanel}
                        aria-pressed={showStickerPanel}
                        aria-label="Sticker"
                    >
                        <Smile className="h-4 w-4" />
                    </Button>

                    {/* Send Button */}
                    <Button
                        onClick={handleSend}
                        disabled={
                            (!message.trim() && selectedFiles.length === 0) ||
                            !isConnected ||
                            !activeChatId ||
                            isSendingFiles
                        }
                        size="icon"
                        className="shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                {/* Sticker Panel */}
                {showStickerPanel && (
                    <div ref={stickerPanelRef}>
                        <StickerPanel
                            recentStickers={recentStickers}
                            favoriteStickers={favoriteStickers}
                            stickerFileId={stickerFileId}
                            setStickerFileId={setStickerFileId}
                            isSendingSticker={isSendingSticker}
                            isConnected={isConnected}
                            activeChatId={activeChatId}
                            onSendSticker={handleSendStickerFromRecent}
                            onSendStickerById={handleSendStickerById}
                            onToggleFavorite={toggleFavoriteSticker}
                            isStickerFavorite={isStickerFavorite}
                        />
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*,video/*,audio/*,document/*"
            />
        </div>
    );
}
