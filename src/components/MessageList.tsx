import { useState, useCallback } from "react";
import { useBotStore, Message } from "@/store/botStore";
import {
    Trash2,
    Reply,
    Copy,
    Forward,
    Pin,
    CheckCircle,
    Pencil,
    X,
    Check,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { UserInfoDialog } from "@/components/UserInfoDialog";
import { botService } from "@/services/botService";
import { InlineKeyboard } from "@/components/InlineKeyboard";
import { parseMarkdown } from "@/lib/markdown";

interface MessageListProps {
    chatId: string;
}

interface MessageItemProps {
    message: Message;
    chatId: string;
    onDelete?: (messageId: number | string, deleteForAll?: boolean) => void;
    onReply?: (messageId: number | string) => void;
    onScrollToMessage?: (messageId: number | string) => void;
    onSelect?: (messageId: number | string) => void;
    showSenderName?: boolean;
    replySenderName?: string;
    isSelectionMode?: boolean;
    isSelected?: boolean;
}

function MessageItem({
    message,
    chatId: _chatId,
    onDelete,
    onReply,
    onScrollToMessage,
    onSelect,
    showSenderName = false,
    replySenderName,
    isSelectionMode = false,
    isSelected = false,
}: MessageItemProps) {
    const isOwn = message.side === "right";
    const { t } = useTranslation();
    const { setEditingMessageId, setReplyTo, preferences } = useBotStore();

    const handleCallbackClick = async (callbackData: string) => {
        console.log("[MessageItem] Callback button clicked:", callbackData);
        // Note: In a real bot, the callback_query would be sent automatically by Telegram client
        // Here we just log it. The bot will receive callback_query updates when users click buttons
        // in the actual Telegram app
    };

    const handleDelete = (deleteForAll = false) => {
        if (onDelete) {
            onDelete(message.id, deleteForAll);
        }
    };

    const handleReply = () => {
        if (onReply) {
            onReply(message.id);
        }
    };

    const handleReplyClick = () => {
        if (message.reply_to && onScrollToMessage) {
            onScrollToMessage(message.reply_to);
        }
    };

    const handleClick = () => {
        if (isSelectionMode && onSelect) {
            onSelect(message.id);
        }
    };

    const renderContent = () => {
        switch (message.type) {
            case "photo":
                return (
                    <div>
                        {message.mediaUrl ? (
                            <img
                                src={message.mediaUrl}
                                alt={message.caption || "Photo"}
                                className="max-w-[280px] max-h-[320px] w-auto h-auto object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                loading="lazy"
                                onClick={() =>
                                    window.open(message.mediaUrl, "_blank")
                                }
                            />
                        ) : (
                            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">
                                    📷 Đang tải ảnh...
                                </span>
                            </div>
                        )}
                        {message.caption && (
                            <p className="mt-2 text-sm">{message.caption}</p>
                        )}
                    </div>
                );

            case "video":
                return (
                    <div>
                        {message.mediaUrl ? (
                            <video
                                src={message.mediaUrl}
                                controls
                                className="max-w-[320px] max-h-[240px] w-auto h-auto object-contain rounded-lg"
                                preload="metadata"
                            />
                        ) : (
                            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">
                                    🎬 Đang tải video...
                                </span>
                            </div>
                        )}
                        {message.caption && (
                            <p className="mt-2 text-sm">{message.caption}</p>
                        )}
                    </div>
                );

            case "audio":
            case "voice":
                return (
                    <div className="max-w-[280px]">
                        {message.mediaUrl ? (
                            <audio
                                src={message.mediaUrl}
                                controls
                                className="w-full"
                            />
                        ) : (
                            <div className="w-48 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">
                                    🎵 Đang tải audio...
                                </span>
                            </div>
                        )}
                        {message.caption && (
                            <p className="mt-2 text-sm">{message.caption}</p>
                        )}
                    </div>
                );

            case "document":
                return (
                    <div>
                        {message.mediaUrl ? (
                            <a
                                href={message.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 p-2 rounded bg-muted hover:bg-muted/80 transition-colors"
                            >
                                📄 {message.fileName || "Document"}
                            </a>
                        ) : (
                            <div className="inline-flex items-center gap-2 p-2 rounded bg-muted">
                                📄 {message.fileName || "Document"}
                                <span className="text-xs text-muted-foreground">
                                    (đang tải...)
                                </span>
                            </div>
                        )}
                        {message.caption && (
                            <p className="mt-2 text-sm">{message.caption}</p>
                        )}
                    </div>
                );

            case "sticker":
                return (
                    <div className="flex flex-col items-center">
                        {message.stickerFormat === "webp" ||
                        message.stickerFormat === "static" ? (
                            <img
                                src={message.mediaUrl}
                                alt={message.emoji || "Sticker"}
                                className="sticker-message"
                            />
                        ) : message.stickerFormat === "webm" ||
                          message.stickerFormat === "video" ? (
                            <video
                                src={message.mediaUrl}
                                autoPlay
                                loop
                                muted
                                className="sticker-message"
                            />
                        ) : (
                            <div className="text-4xl p-4">
                                {message.emoji || "✨"}
                                <div className="text-xs text-muted-foreground mt-1">
                                    Animated Sticker
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="whitespace-pre-wrap break-words">
                        {preferences.parseMode !== 'None' && message.text
                            ? parseMarkdown(message.text, preferences.parseMode)
                            : message.text
                        }
                    </div>
                );
        }
    };

    // Selection mode - simplified click behavior
    if (isSelectionMode) {
        return (
            <div
                id={`message-${message.id}`}
                className={cn(
                    "group flex gap-2 items-start",
                    isOwn ? "flex-row-reverse" : "flex-row",
                )}
            >
                {/* Checkbox */}
                <div
                    className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors mt-1",
                        isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/50 hover:border-primary",
                    )}
                    onClick={handleClick}
                >
                    {isSelected && <Check className="h-4 w-4" />}
                </div>

                {/* Message content */}
                <div
                    className={cn(
                        "flex flex-col gap-1 flex-1",
                        isOwn ? "items-end" : "items-start",
                    )}
                >
                    {showSenderName && message.fromId && (
                        <div
                            className={cn(
                                "text-xs font-medium px-2",
                                isOwn ? "text-right" : "text-left",
                            )}
                        >
                            <span className="text-muted-foreground">
                                {message.fromName}
                            </span>
                        </div>
                    )}

                    <div
                        className={cn(
                            "chat-message relative cursor-pointer",
                            isOwn ? "own" : "other",
                            isSelected && "ring-2 ring-primary ring-offset-2",
                            message.reply_to &&
                                "border-l-4 border-primary pl-3",
                        )}
                        onClick={handleClick}
                    >
                        {message.reply_preview && (
                            <div className="text-xs mb-2 p-2 bg-muted/50 rounded border-l-4 border-primary">
                                <div className="font-medium text-primary mb-0.5">
                                    {replySenderName || t("chat.you")}
                                </div>
                                <div className="text-muted-foreground truncate">
                                    {message.reply_preview}
                                </div>
                            </div>
                        )}

                        <div className="mb-2">{renderContent()}</div>

                        <InlineKeyboard
                            buttons={message.reply_markup || []}
                            onCallbackClick={handleCallbackClick}
                        />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatTime(message.date)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Normal mode with dropdown menu
    return (
        <div
            id={`message-${message.id}`}
            className={cn(
                "group flex flex-col gap-1 message-new",
                isOwn ? "items-end" : "items-start",
            )}
        >
            {showSenderName && message.fromId && (
                <div
                    className={cn(
                        "text-xs font-medium px-2",
                        isOwn ? "text-right" : "text-left",
                    )}
                >
                    {isOwn ? (
                        <span className="text-muted-foreground">
                            {message.fromName}
                        </span>
                    ) : (
                        <UserInfoDialog
                            userId={message.fromId}
                            userName={message.fromName || "Unknown"}
                            username={undefined}
                        >
                            <button className="text-primary hover:underline cursor-pointer">
                                {message.fromName}
                            </button>
                        </UserInfoDialog>
                    )}
                </div>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div
                        className={cn(
                            "chat-message relative cursor-pointer",
                            isOwn ? "own" : "other",
                            message.reply_to &&
                                "border-l-4 border-primary pl-3",
                        )}
                    >
                        {message.reply_preview && (
                            <div
                                className="text-xs mb-2 p-2 bg-muted/50 rounded border-l-4 border-primary cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReplyClick();
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <div className="font-medium text-primary mb-0.5">
                                    {replySenderName || t("chat.you")}
                                </div>
                                <div className="text-muted-foreground truncate">
                                    {message.reply_preview}
                                </div>
                            </div>
                        )}

                        <div className="mb-2">{renderContent()}</div>

                        <InlineKeyboard
                            buttons={message.reply_markup || []}
                            onCallbackClick={handleCallbackClick}
                        />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatTime(message.date)}</span>
                        </div>
                    </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                    {onReply && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReply();
                            }}
                        >
                            <Reply className="mr-2 h-4 w-4" />
                            <span>{t("chat.reply")}</span>
                        </DropdownMenuItem>
                    )}

                    {isOwn && message.type === "text" && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setReplyTo(null);
                                setEditingMessageId(message.id.toString());
                            }}
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>{t("chat.edit")}</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            if (message.text) {
                                navigator.clipboard.writeText(message.text);
                            }
                        }}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        <span>{t("chat.copy")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Forward message", message.id);
                        }}
                    >
                        <Forward className="mr-2 h-4 w-4" />
                        <span>{t("chat.forward")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Pin message", message.id);
                        }}
                    >
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{t("chat.pin")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onSelect) {
                                onSelect(message.id);
                            }
                        }}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>{t("chat.select")}</span>
                    </DropdownMenuItem>

                    {onDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(t("chat.deleteChatConfirm"))) {
                                        handleDelete(false);
                                    }
                                }}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t("chat.deleteForMe")}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                        confirm(t("chat.confirmDeleteForAll"))
                                    ) {
                                        handleDelete(true);
                                    }
                                }}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t("chat.deleteForAll")}</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function MessageList({ chatId }: MessageListProps) {
    const { getCurrentChats, setReplyTo, removeMessage } = useBotStore();
    const { t } = useTranslation();
    const chats = getCurrentChats();
    const chat = chats?.get(chatId);

    // Selection state
    const [selectedMessages, setSelectedMessages] = useState<
        Set<number | string>
    >(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleScrollToMessage = (messageId: number | string) => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
            messageElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            messageElement.classList.add("message-pulse");
            setTimeout(() => {
                messageElement.classList.remove("message-pulse");
            }, 1000);
        }
    };

    const handleSelectMessage = useCallback(
        (messageId: number | string) => {
            setSelectedMessages((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(messageId)) {
                    newSet.delete(messageId);
                } else {
                    newSet.add(messageId);
                }
                // Exit selection mode if no messages selected
                if (newSet.size === 0) {
                    setIsSelectionMode(false);
                } else if (!isSelectionMode) {
                    setIsSelectionMode(true);
                }
                return newSet;
            });
        },
        [isSelectionMode],
    );

    const handleCancelSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
    }, []);

    const handleSelectAll = useCallback(() => {
        if (!chat?.messages) return;
        const allIds = new Set(chat.messages.map((m: Message) => m.id));
        setSelectedMessages(allIds);
    }, [chat?.messages]);

    if (!chat || !chat.messages || chat.messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-sm">Chưa có tin nhắn nào.</p>
                    <p className="text-xs mt-1">Hãy gửi tin nhắn đầu tiên!</p>
                </div>
            </div>
        );
    }

    const isGroupChat = chat.type === "group" || chat.type === "supergroup";
    const idMap = new Map(chat.messages.map((m: Message) => [m.id, m]));

    const handleDeleteMessage = async (
        messageId: number | string,
        deleteForAll = false,
    ) => {
        try {
            let success = false;

            if (deleteForAll) {
                const result = await botService.deleteMessage(
                    chatId,
                    Number(messageId),
                );
                success = result.ok;

                if (!success) {
                    console.error(
                        "[MessageList] Failed to delete message:",
                        result.description,
                    );
                    alert(`Failed to delete message: ${result.description}`);
                }
            } else {
                success = true;
            }

            if (success) {
                removeMessage(chatId, messageId);
            }
        } catch (error) {
            console.error("[MessageList] Error deleting message:", error);
            alert("An error occurred while deleting the message");
        }
    };

    const handleBulkDelete = async (deleteForAll = false) => {
        if (selectedMessages.size === 0) return;

        const confirmMsg = deleteForAll
            ? t("chat.confirmDeleteSelectedForAll").replace(
                  "{{count}}",
                  String(selectedMessages.size),
              )
            : t("chat.confirmDeleteSelected").replace(
                  "{{count}}",
                  String(selectedMessages.size),
              );

        if (
            !confirm(
                confirmMsg || `Xóa ${selectedMessages.size} tin nhắn đã chọn?`,
            )
        ) {
            return;
        }

        setIsDeleting(true);

        try {
            const messageIds = Array.from(selectedMessages);
            let successCount = 0;
            let failCount = 0;

            for (const messageId of messageIds) {
                try {
                    if (deleteForAll) {
                        const result = await botService.deleteMessage(
                            chatId,
                            Number(messageId),
                        );
                        if (result.ok) {
                            removeMessage(chatId, messageId);
                            successCount++;
                        } else {
                            console.error(
                                `Failed to delete message ${messageId}:`,
                                result.description,
                            );
                            failCount++;
                        }
                    } else {
                        removeMessage(chatId, messageId);
                        successCount++;
                    }
                } catch (error) {
                    console.error(
                        `Error deleting message ${messageId}:`,
                        error,
                    );
                    failCount++;
                }
            }

            if (failCount > 0) {
                alert(
                    `Đã xóa ${successCount} tin nhắn, ${failCount} tin nhắn thất bại`,
                );
            }

            // Clear selection
            setSelectedMessages(new Set());
            setIsSelectionMode(false);
        } catch (error) {
            console.error("[MessageList] Error in bulk delete:", error);
            alert("Có lỗi khi xóa tin nhắn");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReplyToMessage = (messageId: number | string) => {
        setReplyTo(messageId.toString());
    };

    return (
        <div className="relative">
            {/* Selection Toolbar */}
            {isSelectionMode && (
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b p-3 mb-3 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelSelection}
                                className="h-8 px-2"
                            >
                                <X className="h-4 w-4 mr-1" />
                                {t("chat.cancel") || "Hủy"}
                            </Button>
                            <span className="text-sm font-medium">
                                {t("chat.selectedCount").replace(
                                    "{{count}}",
                                    String(selectedMessages.size),
                                ) ||
                                    `Đã chọn ${selectedMessages.size} tin nhắn`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                className="h-8"
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t("chat.selectAll") || "Chọn tất cả"}
                            </Button>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBulkDelete(false)}
                                disabled={
                                    selectedMessages.size === 0 || isDeleting
                                }
                                className="h-8"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t("chat.deleteForMe") || "Xóa cho tôi"}
                            </Button>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBulkDelete(true)}
                                disabled={
                                    selectedMessages.size === 0 || isDeleting
                                }
                                className="h-8"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t("chat.deleteForAll") || "Xóa cho tất cả"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message List */}
            <div className="space-y-3">
                {chat.messages.map((message: Message) => {
                    const replied = message.reply_to
                        ? idMap.get(message.reply_to)
                        : undefined;
                    const replySenderName = replied
                        ? replied.side === "right"
                            ? t("chat.you")
                            : replied.fromName || "Unknown"
                        : undefined;

                    return (
                        <MessageItem
                            key={message.id}
                            message={message}
                            chatId={chatId}
                            onDelete={handleDeleteMessage}
                            onReply={handleReplyToMessage}
                            onScrollToMessage={handleScrollToMessage}
                            onSelect={handleSelectMessage}
                            showSenderName={isGroupChat}
                            replySenderName={replySenderName}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMessages.has(message.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
