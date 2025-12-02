import React from "react";
import { useBotStore, type Chat } from "@/store/botStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn, snippet, formatTime } from "@/lib/utils";

export function ChatList() {
  const { getCurrentActiveChatId, setActiveChatId, getSortedChats } =
    useBotStore();
  const { t } = useTranslation();
  const activeChatId = getCurrentActiveChatId();
  const sortedChats = getSortedChats();

  const handleChatClick = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm(t('chat.deleteChatConfirm'))) {
      // TODO: Implement chat deletion
      console.log("Deleting chat:", chatId);
    }
  };

  if (sortedChats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">{t('chat.noChats')}</p>
          <p className="text-xs mt-1">{t('chat.noChatsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedChats.map((chat: Chat) => (
        <div
          key={chat.id}
          className={cn(
            "flex items-center gap-3 p-3 border-b cursor-pointer transition-colors hover:bg-muted/50",
            activeChatId === chat.id && "bg-muted"
          )}
          onClick={() => handleChatClick(chat.id)}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm flex-shrink-0">
            {chat.avatarText}
          </div>

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-sm truncate">{chat.title}</h3>
              {chat.lastDate > 0 && (
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {formatTime(chat.lastDate)}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate">
              {chat.lastText ? snippet(chat.lastText, 40) : "—"}
            </p>
          </div>

          {/* Unread badge and delete button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {chat.unread > 0 && (
              <div className="bg-primary text-primary-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1.5">
                {chat.unread > 99 ? "99+" : chat.unread}
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => handleDeleteChat(e, chat.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
