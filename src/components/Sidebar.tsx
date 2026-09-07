import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatList } from "@/components/ChatList";
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
  const [openChatInput, setOpenChatInput] = useState("");
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showNotificationTip, setShowNotificationTip] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const handleOpenChat = async () => {
    const chatId = openChatInput.trim();
    if (!chatId) return;

    console.log("Opening chat:", chatId);
    setOpenChatInput("");
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
              value={openChatInput}
              onChange={(e) => setOpenChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOpenChat();
                }
              }}
              className="telegram-sidebar__search-input h-12 border-0 bg-[hsl(var(--input))] pl-11 text-base shadow-none"
            />
          </div>
          {showAppMenu && (
            <div className="telegram-sidebar__app-menu absolute left-4 top-[62px] z-20 flex min-w-[190px] flex-col items-stretch gap-1 rounded-2xl bg-card p-2 shadow-xl">
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

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
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
