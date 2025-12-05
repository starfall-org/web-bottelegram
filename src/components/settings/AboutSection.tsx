import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, Info, Zap } from "lucide-react";
import { SectionHeader } from "./SettingsComponents";
import type { BotData, Chat } from "@/store/botStore";

interface AboutSectionProps {
    t: (key: string) => string;
    language: "vi" | "en";
    botInfo: {
        name: string | null;
    };
    isPolling: boolean;
    botDataMap: Map<string, BotData>;
}

export function AboutSection({
    t,
    language,
    botInfo,
    isPolling,
    botDataMap,
}: AboutSectionProps) {
    const totalChats = Array.from(botDataMap.values()).reduce(
        (sum, bot) => sum + (bot as BotData).chats.size,
        0,
    );

    const totalMessages = Array.from(botDataMap.values()).reduce((sum, bot) => {
        const botData = bot as BotData;
        return (
            sum +
            Array.from(botData.chats.values()).reduce(
                (msgSum: number, chat: Chat) => msgSum + chat.messages.length,
                0,
            )
        );
    }, 0);

    return (
        <div className="space-y-6">
            <SectionHeader icon={Info} title={t("settings.aboutApp")} />

            {/* App Info */}
            <div className="text-center py-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Bot className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold">
                    {botInfo.name ||
                        (language === "vi"
                            ? "Telegram Bot Manager"
                            : "Telegram Bot Manager")}
                </h3>
                <p className="text-muted-foreground mt-1">
                    {language === "vi"
                        ? "Ứng dụng web quản lý bot Telegram hiện đại"
                        : "Modern Telegram bot management web application"}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                        {botDataMap.size}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Bots
                    </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                        {totalChats}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Chats
                    </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="text-2xl font-bold text-primary">
                        {totalMessages}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Messages
                    </div>
                </div>
            </div>

            <Separator />

            {/* Technical Info */}
            <div className="space-y-3 rounded-xl border p-4">
                <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                        {t("settings.version")}
                    </span>
                    <Badge variant="outline">1.0.0</Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                        {t("settings.framework")}
                    </span>
                    <span className="text-sm">React + shadcn/ui</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                        {t("settings.botApi")}
                    </span>
                    <span className="text-sm">Telegram Bot API</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                        {t("settings.pollingStatus")}
                    </span>
                    <Badge variant={isPolling ? "default" : "secondary"}>
                        {isPolling ? (
                            <>
                                <Zap className="h-3 w-3 mr-1" />
                                {t("settings.polling")}
                            </>
                        ) : (
                            t("settings.stopped")
                        )}
                    </Badge>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground pt-4">
                <p>© {new Date().getFullYear()} Telegram Bot Manager</p>
            </div>
        </div>
    );
}
