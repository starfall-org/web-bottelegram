import React from "react";
import { useBotStore, type Chat } from "@/store/botStore";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Eraser } from "lucide-react";
import { cn, snippet, formatTime } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";

interface ChatListProps {
  query?: string;
  onChatSelected?: () => void;
}

export function ChatList({ query = "", onChatSelected }: ChatListProps) {
  const { getCurrentActiveChatId, setActiveChatId, getSortedChats, deleteChat, clearChatHistory } =
    useBotStore();
  const { t } = useTranslation();
  const activeChatId = getCurrentActiveChatId();
  const sortedChats = getSortedChats();
  const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase();
  const visibleChats = normalizedQuery
    ? sortedChats.filter((chat: Chat) => {
        const title = chat.title.toLocaleLowerCase();
        const username = (chat.username || "").replace(/^@/, "").toLocaleLowerCase();
        return (
          String(chat.id).includes(query.trim()) ||
          title.includes(query.trim().toLocaleLowerCase()) ||
          username.includes(normalizedQuery)
        );
      })
    : sortedChats;

  const handleChatClick = (chatId: string) => {
    setActiveChatId(chatId);
    onChatSelected?.();
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm(t('chat.deleteChatConfirm'))) {
      const ok = deleteChat(chatId);
      if (!ok) {
        console.error('[ChatList] Failed to delete chat', chatId);
      }
    }
  };

  const handleClearHistory = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm(t('chat.clearHistoryConfirm'))) {
      const ok = clearChatHistory(chatId);
      if (!ok) {
        console.error('[ChatList] Failed to clear history', chatId);
      }
    }
  };

  if (visibleChats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">{normalizedQuery ? "Không có chat trong danh sách" : t('chat.noChats')}</p>
          <p className="text-xs mt-1">
            {normalizedQuery ? "Nhấn Enter để tìm và thêm chat này." : t('chat.noChatsDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {visibleChats.map((chat: Chat) => {
        const isActive = activeChatId === chat.id;
        return (
          <div
            key={chat.id}
            className={cn(
              "group mx-2 flex cursor-pointer items-center gap-3 rounded-[18px] px-3 py-3 transition-colors hover:bg-muted/70",
              isActive && "bg-[#8875df] text-white shadow-sm hover:bg-[#8875df]"
            )}
            onClick={() => handleChatClick(chat.id)}
          >
          {/* Avatar */}
          <Avatar
            src={chat.avatarUrl}
            alt={chat.title}
            fallback={chat.avatarText}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary",
              isActive && "bg-white/15 text-white"
            )}
          />

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="truncate text-[16px] font-semibold">{chat.title}</h3>
              {chat.lastDate > 0 && (
                <span className={cn(
                  "ml-2 shrink-0 text-xs text-muted-foreground",
                  isActive && "text-white/95"
                )}>
                  {formatTime(chat.lastDate)}
                </span>
              )}
            </div>

            <p className={cn(
              "truncate text-sm text-muted-foreground",
              isActive && "text-white/95"
            )}>
              {chat.lastText ? snippet(chat.lastText, 40) : "—"}
            </p>
          </div>

          {/* Unread badge and actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {chat.unread > 0 && (
              <div className={cn(
                "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground",
                isActive && "bg-white text-[#8875df]"
              )}>
                {chat.unread > 99 ? "99+" : chat.unread}
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100",
                    isActive && "text-white hover:bg-white/15 hover:text-white"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => handleClearHistory(e, chat.id)}>
                  <Eraser className="mr-2 h-4 w-4" />
                  <span>{t('chat.clearHistory')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{t('chat.deleteChat')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        );
      })}
    </div>
  );
}
