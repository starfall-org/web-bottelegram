import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatList } from "@/components/ChatList";
import { useBotStore } from "@/store/botStore";
import { botService } from "@/services/botService";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Sun, Moon, Monitor, Menu, X, Bell, PenLine, Search } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  // Default to hidden on small screens
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // md breakpoint
    }
    return false;
  });

  // Update isHidden when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsHidden(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const openSidebar = () => setIsHidden(false);
    window.addEventListener('telegram:open-sidebar', openSidebar);
    return () => window.removeEventListener('telegram:open-sidebar', openSidebar);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isResolvingChat, setIsResolvingChat] = useState(false);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showNotificationTip, setShowNotificationTip] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const {
    getSortedChats,
    getOrCreateChat,
    setActiveChatId,
    getCurrentBotInfo,
  } = useBotStore();

  // Telegram-style transient menu: clicking anywhere outside the menu or its
  // trigger closes it. Pointerdown makes this work before another control
  // receives focus and also covers touch input.
  useEffect(() => {
    if (!showAppMenu) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (appMenuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setShowAppMenu(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [showAppMenu]);

  useEffect(() => {
    if (isHidden) setShowAppMenu(false);
  }, [isHidden]);

  const normalizeSearch = (value: string) =>
    value.trim().replace(/^@/, "").toLocaleLowerCase();

  const findExistingChat = (query: string) => {
    const normalized = normalizeSearch(query);
    if (!normalized) return undefined;

    const chats = getSortedChats();
    return (
      chats.find((chat) => String(chat.id) === query.trim()) ||
      chats.find((chat) => chat.username && normalizeSearch(chat.username) === normalized) ||
      chats.find((chat) => chat.title.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) ||
      chats.find((chat) =>
        chat.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) ||
        (chat.username && normalizeSearch(chat.username).includes(normalized)),
      )
    );
  };

  const handleSearchEnter = async () => {
    const raw = searchQuery.trim();
    if (!raw || isResolvingChat) return;
    setSearchError(null);

    const existing = findExistingChat(raw);
    if (existing) {
      setActiveChatId(existing.id);
      setSearchQuery("");
      if (window.innerWidth < 768) setIsHidden(true);
      return;
    }

    setIsResolvingChat(true);
    try {
      // Resolve through Bot API even when MTProto is the realtime gateway.
      // That prevents adding chats which the current bot cannot actually access.
      const remoteTarget = /^-?\d+$/.test(raw)
        ? raw
        : raw.startsWith("@")
          ? raw
          : `@${raw}`;
      const chatResponse = await botService.getBotApiChat(remoteTarget);
      if (!chatResponse.ok || !chatResponse.result) {
        throw new Error(chatResponse.description || "Không tìm thấy chat hoặc bot chưa được kích hoạt trong chat này.");
      }

      const info: any = chatResponse.result;
      const chatType = info.type || "private";

      if (chatType === "group" || chatType === "supergroup" || chatType === "channel") {
        const currentBot = getCurrentBotInfo();
        let botId = currentBot.id;
        if (!botId) {
          const meResponse = await botService.getBotApiMe();
          if (!meResponse.ok || !meResponse.result?.id) {
            throw new Error(meResponse.description || "Không thể xác minh bot trong chat.");
          }
          botId = Number(meResponse.result.id);
        }

        const memberResponse = await botService.getBotApiChatMember(info.id, Number(botId));
        const status = memberResponse.result?.status;
        if (!memberResponse.ok || status === "left" || status === "kicked") {
          throw new Error("Bot chưa được kích hoạt hoặc không còn là thành viên của chat này.");
        }
      }

      const title =
        info.title ||
        `${info.first_name || ""} ${info.last_name || ""}`.trim() ||
        (info.username ? `@${info.username}` : String(info.id));
      const avatarText = (title || "?").charAt(0).toUpperCase();

      let avatarUrl: string | undefined;
      const avatarFileId = info.photo?.small_file_id || info.photo?.big_file_id;
      if (avatarFileId) {
        const fileResponse = await botService.getBotApiFile(avatarFileId);
        if (fileResponse.ok && fileResponse.result?.file_path) {
          avatarUrl = botService.getBotApiFileUrl(fileResponse.result.file_path);
        }
      }

      const chatId = String(info.id);
      getOrCreateChat(chatId, {
        type: chatType,
        title,
        avatarText,
        avatarUrl,
        username: info.username || undefined,
        description: info.description || info.bio || undefined,
      });
      setActiveChatId(chatId);
      setSearchQuery("");
      if (window.innerWidth < 768) setIsHidden(true);
    } catch (error: any) {
      setSearchError(error?.message || "Không thể mở chat.");
    } finally {
      setIsResolvingChat(false);
    }
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4" />;
    if (theme === "dark") return <Moon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <>
      {!isHidden && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={() => {
            setShowAppMenu(false);
            setIsHidden(true);
          }}
        />
      )}
      <aside
        className={cn(
          "telegram-sidebar w-full max-w-[300px] md:max-w-[320px] flex flex-col bg-[hsl(var(--sidebar-bg))] transition-transform duration-300 ease-in-out",
          "absolute inset-y-0 left-0 z-40 md:relative",
          isHidden && "-translate-x-full",
          className
        )}
      >
        <div className="telegram-sidebar__search relative flex items-center gap-3 px-4 pt-3 pb-4">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="telegram-sidebar__menu shrink-0"
            onClick={() => setShowAppMenu((open) => !open)}
            title="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSearchEnter();
                }
              }}
              disabled={isResolvingChat}
              className="telegram-sidebar__search-input h-12 border-0 bg-[hsl(var(--input))] pl-11 text-base shadow-none"
            />
          </div>
          {showAppMenu && (
            <div ref={appMenuRef} className="telegram-sidebar__app-menu absolute left-4 top-[62px] z-20 flex min-w-[190px] flex-col items-stretch gap-1 rounded-2xl bg-card p-2 shadow-xl">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-start gap-3 px-3"
                onClick={toggleTheme}
                title={t("chat.toggleTheme")}
              >
                {getThemeIcon()}
                <span>{t("settings.appearance")}</span>
              </Button>
              <SettingsDialog
                showLabel
                triggerClassName="h-10 w-full justify-start gap-3 px-3"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-start gap-3 px-3 md:hidden"
                onClick={() => setIsHidden(true)}
                title="Close sidebar"
              >
                <X className="h-4 w-4" />
                <span>{t("common.close")}</span>
              </Button>
            </div>
          )}
        </div>

        {showNotificationTip && (
          <div className="telegram-notification-tip mx-3 mb-3 flex items-start gap-3 rounded-[20px] px-4 py-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 fill-[#e8aa20] text-[#d89814]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-5">Never miss a message!</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Enable notifications to stay updated.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-1 h-8 w-8 shrink-0 rounded-full"
              onClick={() => setShowNotificationTip(false)}
              title="Dismiss"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {searchError && (
          <div className="mx-4 mb-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {searchError}
          </div>
        )}

        {/* Search filters existing chats as you type. Enter resolves and adds a
            Bot-API-visible chat when there is no existing local match. */}
        <div className="flex-1 overflow-hidden">
          <ChatList
            query={searchQuery}
            onChatSelected={() => {
              setSearchQuery("");
              setShowAppMenu(false);
              if (window.innerWidth < 768) setIsHidden(true);
            }}
          />
        </div>

        <Button
          size="icon"
          className="telegram-sidebar__compose"
          onClick={() => searchInputRef.current?.focus()}
          title="Open chat"
        >
          <PenLine className="h-6 w-6" />
        </Button>
      </aside>

    </>
  );
}
