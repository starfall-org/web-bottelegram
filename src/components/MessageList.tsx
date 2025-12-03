import { useBotStore, Message } from "@/store/botStore";
import { Trash2, Reply, Copy, Forward, Pin, CheckCircle, Pencil } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n/useTranslation";
import { UserInfoDialog } from "@/components/UserInfoDialog";
import { botService } from "@/services/botService";

interface MessageListProps {
  chatId: string;
}

interface MessageItemProps {
  message: Message;
  onDelete?: (messageId: number | string, deleteForAll?: boolean) => void;
  onReply?: (messageId: number | string) => void;
  onScrollToMessage?: (messageId: number | string) => void;
  showSenderName?: boolean;
  // Display name of the author of the replied-to message
  replySenderName?: string;
}

function MessageItem({
  message,
  onDelete,
  onReply,
  onScrollToMessage,
  showSenderName = false,
  replySenderName,
}: MessageItemProps) {
  const isOwn = message.side === "right";
  const { t } = useTranslation();
  const { setEditingMessageId, setReplyTo } = useBotStore();

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

  const renderContent = () => {
    switch (message.type) {
      case "photo":
        return (
          <div>
            <img
              src={message.mediaUrl}
              alt={message.caption || "Photo"}
              className="max-w-full rounded-lg"
              loading="lazy"
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        );

      case "video":
        return (
          <div>
            <video
              src={message.mediaUrl}
              controls
              className="max-w-full rounded-lg"
              preload="metadata"
            />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        );

      case "audio":
      case "voice":
        return (
          <div>
            <audio src={message.mediaUrl} controls className="w-full" />
            {message.caption && (
              <p className="mt-2 text-sm">{message.caption}</p>
            )}
          </div>
        );

      case "document":
        return (
          <div>
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 p-2 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              📄 {message.fileName || "Document"}
            </a>
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
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        );
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "group flex flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}
    >
      {/* Sender name outside bubble */}
      {showSenderName && message.fromId && (
        <div
          className={cn(
            "text-xs font-medium px-2",
            isOwn ? "text-right" : "text-left"
          )}
        >
          {isOwn ? (
            <span className="text-muted-foreground">{message.fromName}</span>
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
              message.reply_to && "border-l-4 border-primary pl-3"
            )}
          >
            {/* Reply context - clickable but inside message */}
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

            {/* Message content */}
            <div className="mb-2">{renderContent()}</div>

            {/* Message metadata */}
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
              console.log("Select message", message.id);
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
                  if (confirm(t("chat.confirmDeleteForAll"))) {
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

  const handleScrollToMessage = (messageId: number | string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a brief highlight effect
      messageElement.classList.add("message-pulse");
      setTimeout(() => {
        messageElement.classList.remove("message-pulse");
      }, 1000);
    }
  };

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
    deleteForAll = false
  ) => {
    try {
      let success = false;

      if (deleteForAll) {
        // Call Telegram API to delete message for everyone
        const result = await botService.deleteMessage(
          chatId,
          Number(messageId)
        );
        success = result.ok;

        if (!success) {
          console.error(
            "[MessageList] Failed to delete message:",
            result.description
          );
          alert(`Failed to delete message: ${result.description}`);
        }
      } else {
        // Just remove from local state (delete for me)
        success = true;
      }

      // Remove from local state if deletion was successful or if delete for me
      if (success) {
        removeMessage(chatId, messageId);
      }
    } catch (error) {
      console.error("[MessageList] Error deleting message:", error);
      alert("An error occurred while deleting the message");
    }
  };

  const handleReplyToMessage = (messageId: number | string) => {
    setReplyTo(messageId.toString());
  };

  return (
    <div className="space-y-3">
      {chat.messages.map((message: Message) => {
        const replied = message.reply_to ? idMap.get(message.reply_to) : undefined;
        const replySenderName =
          replied ? (replied.side === "right" ? t("chat.you") : (replied.fromName || "Unknown")) : undefined;

        return (
          <MessageItem
            key={message.id}
            message={message}
            onDelete={handleDeleteMessage}
            onReply={handleReplyToMessage}
            onScrollToMessage={handleScrollToMessage}
            showSenderName={isGroupChat}
            replySenderName={replySenderName}
          />
        );
      })}
    </div>
  );
}
