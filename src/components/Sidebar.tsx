import { useState } from "react";
import { useBotStore } from "@/store/botStore";
import { useBotConnection } from "@/hooks/useBotConnection";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatList } from "@/components/ChatList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Sun, Moon, Monitor, Menu, X, MessageSquare } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [openChatInput, setOpenChatInput] = useState("");
  const { theme, setTheme } = useTheme();
  const { isConnected, pollingStatus, lastError, botInfo } = useBotConnection();
  const { token } = useBotStore();
  const { t } = useTranslation();

  const handleOpenChat = async () => {
    const chatId = openChatInput.trim();
    if (!chatId) return;

    // TODO: Implement chat opening logic with bot service
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
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsHidden(!isHidden)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <aside
        className={cn(
          "w-full max-w-[300px] border-r bg-card flex flex-col transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          isHidden
            ? "-translate-x-full absolute inset-y-0 left-0 z-40"
            : "translate-x-0 absolute inset-y-0 left-0 z-40 md:relative",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageSquare className="h-5 w-5 text-primary" />
              {/* Connection indicator */}
              <div
                className={cn(
                  "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background transition-colors duration-300",
                  pollingStatus === "polling"
                    ? "bg-green-500 animate-pulse"
                    : pollingStatus === "error"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                )}
                title={lastError || pollingStatus}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-semibold text-lg">
                {botInfo.name || "Bottlegram"}
              </h1>
              {token && (
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? botInfo.name
                      ? `${t("connection.connected")}: ${botInfo.name}`
                      : t("connection.connected")
                    : pollingStatus === "error"
                    ? lastError || "Error"
                    : t("connection.connecting")}
                </p>
              )}
              {!token && (
                <p className="text-xs text-red-500">{t("chat.noToken")}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={t("chat.toggleTheme")}
            >
              {getThemeIcon()}
            </Button>

            <SettingsDialog />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsHidden(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Open Chat Section */}
        <div className="p-3 border-b">
          <div className="flex gap-2">
            <Input
              placeholder={t("chat.enterChatId")}
              value={openChatInput}
              onChange={(e) => setOpenChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOpenChat();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleOpenChat}
              size="sm"
              disabled={!openChatInput.trim()}
            >
              →
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isHidden && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsHidden(true)}
        />
      )}
    </>
  );
}
