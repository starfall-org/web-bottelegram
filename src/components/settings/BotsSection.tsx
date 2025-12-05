import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Bot,
    Database,
    Trash2,
    Copy,
    MessageSquare,
    Clock,
    LogIn,
} from "lucide-react";
import { SectionHeader } from "./SettingsComponents";
import type { BotData, Chat } from "@/store/botStore";

interface BotsSectionProps {
    t: (key: string) => string;
    language: "vi" | "en";
    token: string;
    botDataMap: Map<string, BotData>;
    clearBotData: (token: string) => void;
    handleCopyToken: (token: string) => void;
    showToast: (message: string, type: "success" | "error" | "info") => void;
    onLoginBot: (botToken: string) => void;
}

export function BotsSection({
    t,
    language,
    token,
    botDataMap,
    clearBotData,
    handleCopyToken,
    showToast,
    onLoginBot,
}: BotsSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Database}
                title={t("settings.manageBotData")}
                description={t("settings.botHistoryDesc")}
            />

            {botDataMap.size === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="font-medium">{t("settings.noBotsFound")}</p>
                    <p className="text-sm mt-1">
                        {t("settings.botHistoryDesc")}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {Array.from(botDataMap.entries()).map((entry) => {
                        const [botToken, botData] = entry as [string, BotData];
                        const isCurrentBot = token === botToken;
                        const chatCount = botData.chats.size;
                        const totalMessages = Array.from(
                            botData.chats.values(),
                        ).reduce(
                            (sum: number, chat: Chat) =>
                                sum + chat.messages.length,
                            0,
                        );

                        return (
                            <div
                                key={botToken}
                                className={cn(
                                    "p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
                                    isCurrentBot
                                        ? "border-primary/50 bg-primary/5"
                                        : "border-border hover:border-primary/30",
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                                            isCurrentBot
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted",
                                        )}
                                    >
                                        <Bot className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium truncate">
                                                {botData.botInfo.name ||
                                                    `Bot ...${botToken.slice(-8)}`}
                                            </h3>
                                            {isCurrentBot && (
                                                <Badge
                                                    variant="default"
                                                    className="text-xs shrink-0"
                                                >
                                                    {language === "vi"
                                                        ? "Đang dùng"
                                                        : "Active"}
                                                </Badge>
                                            )}
                                        </div>
                                        {botData.botInfo.username && (
                                            <p className="text-sm text-muted-foreground">
                                                @{botData.botInfo.username}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                {chatCount} chats
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {totalMessages} messages
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* Login button for non-active bots */}
                                        {!isCurrentBot && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    onLoginBot(botToken)
                                                }
                                            >
                                                <LogIn className="h-4 w-4 mr-1" />
                                                {language === "vi"
                                                    ? "Đăng nhập"
                                                    : "Login"}
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        t(
                                                            "settings.confirmClearBotData",
                                                        ),
                                                    )
                                                ) {
                                                    clearBotData(botToken);
                                                    showToast(
                                                        t(
                                                            "messages.allDataCleared",
                                                        ),
                                                        "success",
                                                    );
                                                }
                                            }}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono bg-muted/50 px-2 py-1.5 rounded truncate">
                                            {botToken}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() =>
                                                handleCopyToken(botToken)
                                            }
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-xl space-y-1">
                <p className="font-medium mb-2">
                    {language === "vi" ? "Lưu ý:" : "Notes:"}
                </p>
                <p>
                    •{" "}
                    {language === "vi"
                        ? "Mỗi bot sẽ có lịch sử chat riêng biệt"
                        : "Each bot has its own chat history"}
                </p>
                <p>
                    •{" "}
                    {language === "vi"
                        ? "Khi chuyển đổi token, dữ liệu bot cũ được giữ lại"
                        : "Old bot data is preserved when switching tokens"}
                </p>
                <p>
                    •{" "}
                    {language === "vi"
                        ? "Có thể xóa dữ liệu từng bot riêng lẻ"
                        : "You can delete data for each bot individually"}
                </p>
            </div>
        </div>
    );
}
