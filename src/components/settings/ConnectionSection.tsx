import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    Wifi,
    WifiOff,
    Shield,
    User,
    Check,
    Eye,
    EyeOff,
    Copy,
    Loader2,
    Zap,
} from "lucide-react";
import { SectionHeader } from "./SettingsComponents";
import type { BotCommand } from "@/store/botStore";

interface ConnectionSectionProps {
    t: (key: string) => string;
    isConnected: boolean;
    isPolling: boolean;
    isLoading: boolean;
    botInfo: {
        name: string | null;
        username: string | null;
        commands?: BotCommand[];
    };
    tokenInput: string;
    setTokenInput: (value: string) => void;
    proxyInput: string;
    setProxyInput: (value: string) => void;
    showToken: boolean;
    setShowToken: (value: boolean) => void;
    copiedToken: boolean;
    handleCopyToken: (token: string) => void;
    handleTestConnection: () => void;
    handleDeleteWebhook: () => void;
    handleSaveConnection: () => void;

    // Bot profile
    botName: string;
    setBotName: (value: string) => void;
    botUsernameInput: string;
    setBotUsernameInput: (value: string) => void;
    botDescription: string;
    setBotDescription: (value: string) => void;
    botShortDescription: string;
    setBotShortDescription: (value: string) => void;
    handleUpdateBotInfo: () => void;
}

export function ConnectionSection({
    t,
    isConnected,
    isPolling,
    isLoading,
    botInfo,
    tokenInput,
    setTokenInput,
    proxyInput,
    setProxyInput,
    showToken,
    setShowToken,
    copiedToken,
    handleCopyToken,
    handleTestConnection,
    handleDeleteWebhook,
    handleSaveConnection,

    botName,
    setBotName,
    botUsernameInput,
    setBotUsernameInput,
    botDescription,
    setBotDescription,
    botShortDescription,
    setBotShortDescription,
    handleUpdateBotInfo,
}: ConnectionSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Wifi}
                title={t("settings.botConfig")}
                description={t("settings.botConfigDesc")}
            />

            {/* Connection Status */}
            <div
                className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
                    isConnected
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-muted/50 border-border",
                )}
            >
                <div
                    className={cn(
                        "p-2.5 rounded-full transition-colors",
                        isConnected ? "bg-green-500/10" : "bg-muted",
                    )}
                >
                    {isConnected ? (
                        <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                        <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium">
                        {isConnected
                            ? t("connection.connected")
                            : t("connection.disconnected")}
                    </div>
                    {botInfo.name && (
                        <div className="text-sm text-muted-foreground truncate">
                            {botInfo.name}{" "}
                            {botInfo.username && `(@${botInfo.username})`}
                        </div>
                    )}
                </div>
                <Badge
                    variant={isPolling ? "default" : "secondary"}
                    className="shrink-0"
                >
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

            {/* Token Input */}
            <div className="space-y-3">
                <Label htmlFor="token" className="text-sm font-medium">
                    {t("bot.token")} *
                </Label>
                <div className="relative">
                    <Input
                        id="token"
                        type={showToken ? "text" : "password"}
                        placeholder={t("bot.tokenPlaceholder")}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="pr-20 font-mono text-sm h-11"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowToken(!showToken)}
                            title={showToken ? "Hide" : "Show"}
                        >
                            {showToken ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyToken(tokenInput)}
                            title="Copy"
                        >
                            {copiedToken ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("bot.tokenFromBotFather")}
                </p>
            </div>

            {/* Proxy Input */}
            <div className="space-y-3">
                <Label htmlFor="proxy" className="text-sm font-medium">
                    {t("settings.proxy")}
                </Label>
                <Input
                    id="proxy"
                    placeholder={t("settings.proxyPlaceholder")}
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                    className="font-mono text-sm h-11"
                />
                <p className="text-xs text-muted-foreground">
                    {t("settings.proxyDesc")}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleTestConnection}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1 sm:flex-none h-10"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Wifi className="h-4 w-4 mr-2" />
                    )}
                    {t("connection.testConnection")}
                </Button>
                <Button
                    onClick={handleDeleteWebhook}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1 sm:flex-none h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("bot.deleteWebhook")}
                </Button>
                <Button
                    onClick={handleSaveConnection}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none h-10"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4 mr-2" />
                    )}
                    {t("connection.saveConnection")}
                </Button>
            </div>

            <Separator />

            {/* Bot Profile */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">
                        {t("settings.botProfile")}
                    </Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="bot-name"
                            className="text-xs text-muted-foreground"
                        >
                            {t("bot.botName")}
                        </Label>
                        <Input
                            id="bot-name"
                            value={botName}
                            onChange={(e) => setBotName(e.target.value)}
                            placeholder="My Telegram Bot"
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor="bot-username"
                            className="text-xs text-muted-foreground"
                        >
                            {t("bot.botUsername")}
                        </Label>
                        <Input
                            id="bot-username"
                            value={botUsernameInput}
                            onChange={(e) =>
                                setBotUsernameInput(e.target.value)
                            }
                            placeholder="@mybot"
                            readOnly
                            className="bg-muted/50 h-10"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="bot-short-desc"
                        className="text-xs text-muted-foreground"
                    >
                        {t("bot.botShortDescription")}
                    </Label>
                    <Input
                        id="bot-short-desc"
                        value={botShortDescription}
                        onChange={(e) => setBotShortDescription(e.target.value)}
                        className="h-10"
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="bot-desc"
                        className="text-xs text-muted-foreground"
                    >
                        {t("bot.botDescription")}
                    </Label>
                    <textarea
                        id="bot-desc"
                        value={botDescription}
                        onChange={(e) => setBotDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <Button
                    onClick={handleUpdateBotInfo}
                    disabled={isLoading}
                    className="w-full sm:w-auto h-10"
                >
                    <Check className="h-4 w-4 mr-2" />
                    {t("common.save")}
                </Button>
            </div>

            {/* Commands Display */}
            {botInfo.commands && botInfo.commands.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            {t("bot.botCommands")} ({botInfo.commands.length})
                        </Label>
                        <div className="grid gap-2 max-h-40 overflow-y-auto">
                            {botInfo.commands.map((cmd: BotCommand) => (
                                <div
                                    key={cmd.command}
                                    className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <code className="font-mono text-xs bg-background px-2 py-1 rounded border shrink-0">
                                        /{cmd.command}
                                    </code>
                                    <span className="text-sm text-muted-foreground flex-1 truncate">
                                        {cmd.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
