import { useState, useEffect, useCallback } from "react";
import { useBotStore } from "@/store/botStore";
import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "@/i18n/useTranslation";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    Bell,
    Bot,
    ChevronRight,
    Database,
    Info,
    ListTree,
    MoreVertical,
    Palette,
    Search,
    Settings,
    Wifi,
    WifiOff,
} from "lucide-react";
import { botService } from "@/services/botService";
import { getUserAvatarUrl } from "@/lib/telegramAvatar";
import {
    type SettingsSection,
    type StatusToast,
    StatusToastUI,
} from "./settings/SettingsComponents";
import { ConnectionSection } from "./settings/ConnectionSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { PreferencesSection } from "./settings/PreferencesSection";
import { CommandsSection } from "./settings/CommandsSection";
import { BotsSection } from "./settings/BotsSection";
import { AboutSection } from "./settings/AboutSection";

interface SettingsDialogProps {
    triggerClassName?: string;
    showLabel?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

export function SettingsDialog({
    triggerClassName,
    showLabel = false,
    open: controlledOpen,
    onOpenChange,
    hideTrigger = false,
}: SettingsDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (next: boolean) => {
        if (!isControlled) setInternalOpen(next);
        onOpenChange?.(next);
    };
    const [activeSection, setActiveSection] =
        useState<SettingsSection>("home");
    const [tokenInput, setTokenInput] = useState("");
    const [proxyInput, setProxyInput] = useState("");
    const [showToken, setShowToken] = useState(false);
    const [toast, setToast] = useState<StatusToast | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);

    // MTProto gateway inputs
    const [mtprotoApiId, setMtprotoApiId] = useState("");
    const [mtprotoApiHash, setMtprotoApiHash] = useState("");

    // Bot profile states
    const [botName, setBotName] = useState("");
    const [botUsernameInput, setBotUsernameInput] = useState("");
    const [botDescription, setBotDescription] = useState("");
    const [botShortDescription, setBotShortDescription] = useState("");

    const {
        token,
        gateway,
        setGateway,
        mtproto,
        setMtprotoSettings,
        setToken,
        getCurrentBotInfo,
        setBotInfo,
        botDataMap,
        clearBotData,
        isConnected,
        isPolling,
        preferences,
        updatePreferences,
        getCustomCommands,
        clearAllData,
    } = useBotStore();

    const botInfo = getCurrentBotInfo();
    const customCommands = getCustomCommands();
    const { theme, setTheme } = useTheme();
    const { t, language, changeLanguage } = useTranslation();

    useEffect(() => {
        if (open) {
            setTokenInput(token);
            setMtprotoApiId(String(mtproto.apiId || 4));
            setMtprotoApiHash(mtproto.apiHash || "");
            setProxyInput(localStorage.getItem("cors_proxy") || "");
            setToast(null);
            setBotName(botInfo.name || "");
            setBotUsernameInput(botInfo.username || "");
            setBotDescription(botInfo.description || "");
            setBotShortDescription(botInfo.shortDescription || "");
        }
    }, [open, token, botInfo, mtproto.apiId, mtproto.apiHash]);

    // Reset navigation only when the dialog itself is opened. Bot/profile data can
    // change while editing Commands (for example after setMyCommands), and must
    // not kick the user back to the settings home screen.
    useEffect(() => {
        if (open) setActiveSection("home");
    }, [open]);

    const showToast = useCallback(
        (message: string, type: StatusToast["type"] = "info") => {
            setToast({ message, type });
            if (type !== "loading") {
                setTimeout(() => setToast(null), 4000);
            }
        },
        [],
    );

    const applyServiceConfig = useCallback(() => {
        const tok = tokenInput.trim();
        const proxyPrefix = proxyInput.trim() || undefined;
        if (!tok) return false;
        try {
            botService.setGatewayMode(gateway);
            botService.setConfig({
                token: tok,
                proxyPrefix,
                apiId: mtprotoApiId ? Number(mtprotoApiId) : 4,
                apiHash: mtprotoApiHash || undefined,
            });
            return true;
        } catch {
            return false;
        }
    }, [tokenInput, proxyInput, mtprotoApiId, mtprotoApiHash, gateway]);

    const handleGatewayChange = (mode: "bot" | "mtproto") => {
        // Persist to the store; useBotConnection reacts to gateway/config
        // changes and re-initializes the connection automatically.
        setGateway(mode);
        const apiIdNum = mtprotoApiId ? Number(mtprotoApiId) : 4;
        setMtprotoSettings({ apiId: apiIdNum, apiHash: mtprotoApiHash.trim() });
    };

    const handleSaveConnection = async () => {
        if (!tokenInput.trim()) {
            showToast(t("messages.enterToken"), "error");
            return;
        }
        setIsLoading(true);
        try {
            setToken(tokenInput.trim());
            localStorage.setItem("bot_token", tokenInput.trim());
            setMtprotoSettings({
                apiId: mtprotoApiId ? Number(mtprotoApiId) : 4,
                apiHash: mtprotoApiHash.trim(),
            });
            if (proxyInput.trim()) {
                localStorage.setItem("cors_proxy", proxyInput.trim());
            } else {
                localStorage.removeItem("cors_proxy");
            }
            showToast(t("messages.connectionSaved"), "success");
        } catch {
            showToast(t("common.error"), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!tokenInput.trim()) {
            showToast(t("messages.enterTokenToTest"), "error");
            return;
        }
        setIsLoading(true);
        try {
            if (!applyServiceConfig()) {
                showToast(t("messages.enterTokenToTest"), "error");
                return;
            }
            showToast(t("messages.connectionTesting"), "loading");
            const res = await botService.getMe();
            if (res.ok) {
                showToast(t("messages.connectionSuccess"), "success");
            } else {
                showToast(
                    res.description || t("messages.connectionFailed"),
                    "error",
                );
            }
        } catch {
            showToast(t("messages.connectionFailed"), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWebhook = async () => {
        if (!tokenInput.trim()) {
            showToast(t("messages.enterToken"), "error");
            return;
        }
        setIsLoading(true);
        try {
            if (!applyServiceConfig()) {
                showToast(t("messages.enterToken"), "error");
                return;
            }
            showToast(t("messages.webhookDeleting"), "loading");
            const res = await botService.deleteWebhook(true);
            if (res.ok) {
                showToast(t("messages.webhookDeleted"), "success");
            } else {
                showToast(
                    res.description || t("messages.webhookDeleteFailed"),
                    "error",
                );
            }
        } catch {
            showToast(t("messages.webhookDeleteFailed"), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBotInfo = async () => {
        setIsLoading(true);
        try {
            if (tokenInput.trim() && applyServiceConfig()) {
                try {
                    await botService.setMyName(botName || undefined);
                } catch {}
                try {
                    await botService.setMyDescription(
                        botDescription || undefined,
                    );
                } catch {}
                try {
                    await botService.setMyShortDescription(
                        botShortDescription || undefined,
                    );
                } catch {}
            }
            setBotInfo({
                name: botName || null,
                username: botUsernameInput || null,
                description: botDescription || null,
                shortDescription: botShortDescription || null,
            });
            showToast(t("messages.botInfoUpdated"), "success");
        } catch {
            showToast(t("messages.botInfoUpdateFailed"), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBotAvatar = async (photo: File) => {
        setIsLoading(true);
        try {
            const response = await botService.setMyProfilePhoto(photo);
            if (!response.ok) {
                throw new Error(response.description || t("common.error"));
            }

            const avatarUrl = await getUserAvatarUrl(botInfo.id);
            if (avatarUrl) setBotInfo({ avatarUrl });
            showToast(t("messages.botInfoUpdated"), "success");
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : t("common.error"),
                "error",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearAllData = () => {
        if (window.confirm(t("messages.confirmClearData"))) {
            clearAllData();
            setTokenInput("");
            setProxyInput("");
            localStorage.removeItem("bot_token");
            localStorage.removeItem("cors_proxy");
            showToast(t("messages.allDataCleared"), "success");
        }
    };

    const handleCopyToken = async (tokenToCopy: string) => {
        try {
            await navigator.clipboard.writeText(tokenToCopy);
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        } catch {}
    };

    const navItems: {
        id: SettingsSection;
        icon: React.ElementType;
        label: string;
        description: string;
        badge?: number;
    }[] = [
        {
            id: "connection",
            icon: Wifi,
            label: t("settings.connection"),
            description: t("settings.botConfigDesc"),
        },
        {
            id: "appearance",
            icon: Palette,
            label: t("settings.appearance"),
            description: t("settings.themeDesc"),
        },
        {
            id: "preferences",
            icon: Bell,
            label: t("settings.preferences"),
            description: t("settings.appPreferencesDesc"),
        },
        {
            id: "commands",
            icon: ListTree,
            label: "Commands",
            description: "Responses and inline buttons",
            badge: customCommands.length || undefined,
        },
        {
            id: "bots",
            icon: Database,
            label: t("settings.botHistory"),
            description: t("settings.botHistoryDesc"),
            badge: botDataMap.size || undefined,
        },
        {
            id: "about",
            icon: Info,
            label: t("settings.about"),
            description: t("settings.aboutApp"),
        },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case "connection":
                return (
                    <ConnectionSection
                        t={t}
                        isConnected={isConnected}
                        isPolling={isPolling}
                        isLoading={isLoading}
                        botInfo={botInfo}
                        gateway={gateway}
                        setGateway={handleGatewayChange}
                        mtprotoApiId={mtprotoApiId}
                        setMtprotoApiId={setMtprotoApiId}
                        mtprotoApiHash={mtprotoApiHash}
                        setMtprotoApiHash={setMtprotoApiHash}
                        tokenInput={tokenInput}
                        setTokenInput={setTokenInput}
                        proxyInput={proxyInput}
                        setProxyInput={setProxyInput}
                        showToken={showToken}
                        setShowToken={setShowToken}
                        copiedToken={copiedToken}
                        handleCopyToken={handleCopyToken}
                        handleTestConnection={handleTestConnection}
                        handleDeleteWebhook={handleDeleteWebhook}
                        handleSaveConnection={handleSaveConnection}
                        botName={botName}
                        setBotName={setBotName}
                        botUsernameInput={botUsernameInput}
                        setBotUsernameInput={setBotUsernameInput}
                        botDescription={botDescription}
                        setBotDescription={setBotDescription}
                        botShortDescription={botShortDescription}
                        setBotShortDescription={setBotShortDescription}
                        handleUpdateBotInfo={handleUpdateBotInfo}
                        handleUpdateBotAvatar={handleUpdateBotAvatar}
                    />
                );
            case "appearance":
                return (
                    <AppearanceSection
                        t={t}
                        theme={theme}
                        setTheme={setTheme}
                        language={language}
                        changeLanguage={changeLanguage}
                    />
                );
            case "preferences":
                return (
                    <PreferencesSection
                        t={t}
                        preferences={preferences}
                        updatePreferences={updatePreferences}
                        handleClearAllData={handleClearAllData}
                    />
                );
            case "commands":
                return (
                    <CommandsSection showToast={showToast} />
                );
            case "bots":
                return (
                    <BotsSection
                        t={t}
                        language={language}
                        token={token}
                        botDataMap={botDataMap}
                        clearBotData={clearBotData}
                        handleCopyToken={handleCopyToken}
                        showToast={showToast}
                        onLoginBot={(botToken) => {
                            setToken(botToken);
                            setTokenInput(botToken);
                            localStorage.setItem("bot_token", botToken);
                            showToast(t("messages.switchedBot"), "success");
                        }}
                    />
                );
            case "about":
                return (
                    <AboutSection
                        t={t}
                        language={language}
                        botInfo={botInfo}
                        isPolling={isPolling}
                        botDataMap={botDataMap}
                    />
                );
            default:
                return null;
        }
    };

    const renderSettingsHome = () => {
        const groups = [navItems.slice(0, 3), navItems.slice(3)];
        return (
            <ScrollArea className="min-h-0 flex-1">
                <div className="px-5 pb-8">
                    <div className="flex flex-col items-center pb-10 pt-8 text-center">
                        <Avatar
                            src={botInfo.avatarUrl}
                            alt={botInfo.name || "Bot"}
                            fallback={(botInfo.name || botInfo.username || "B").charAt(0).toUpperCase()}
                            className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-b from-[#8bd45f] to-[#45c43f] text-6xl font-medium text-white"
                        />
                        <h2 className="mt-8 max-w-full truncate px-4 text-[27px] font-semibold leading-tight">
                            {botInfo.name || botInfo.username || "Telegram Bot"}
                        </h2>
                        <p className="mt-2 text-[17px] text-[#9a9a9a]">
                            {isConnected ? "online" : "offline"}
                        </p>
                    </div>

                    <div className="mb-6 overflow-hidden rounded-[28px] bg-[#222222]">
                        <div className="flex min-h-[86px] items-center gap-5 px-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8875df]">
                                <Bot className="h-7 w-7 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[19px] font-medium">
                                    {botInfo.username ? `@${botInfo.username}` : "Bot account"}
                                </p>
                                <p className="mt-1 text-[15px] text-[#969696]">
                                    {gateway === "mtproto" ? "MTProto gateway" : "Bot API gateway"}
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "flex items-center gap-2 rounded-full px-3 py-1 text-xs",
                                    isConnected
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-white/5 text-[#999]",
                                )}
                            >
                                {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                                {isConnected ? "Connected" : "Disconnected"}
                            </div>
                        </div>
                    </div>

                    {groups.map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-6 overflow-hidden rounded-[28px] bg-[#222222]">
                            {group.map((item, index) => {
                                const Icon = item.icon;
                                const iconBackgrounds: Record<string, string> = {
                                    connection: "bg-[#4caf50]",
                                    appearance: "bg-[#3390ec]",
                                    preferences: "bg-[#ff5b55]",
                                    commands: "bg-[#8875df]",
                                    bots: "bg-[#ff9500]",
                                    about: "bg-[#7d7d7d]",
                                };
                                return (
                                    <div key={item.id}>
                                        {index > 0 && <div className="ml-[86px] border-t border-white/5" />}
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection(item.id)}
                                            className="flex min-h-[82px] w-full items-center gap-5 px-6 text-left transition-colors hover:bg-white/[0.035]"
                                        >
                                            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBackgrounds[item.id] || "bg-[#777]") }>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[18px] font-medium">{item.label}</p>
                                                <p className="mt-1 truncate text-[14px] text-[#969696]">{item.description}</p>
                                            </div>
                                            {item.badge !== undefined && Number(item.badge) > 0 && (
                                                <span className="rounded-md bg-[#8875df]/25 px-2 py-0.5 text-xs font-medium text-[#aa96ff]">
                                                    {item.badge}
                                                </span>
                                            )}
                                            <ChevronRight className="h-5 w-5 text-[#737373]" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        );
    };

    const activeNavItem = navItems.find((item) => item.id === activeSection);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!hideTrigger && (
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        title={t("common.settings")}
                        className={cn("relative", triggerClassName)}
                    >
                        <Settings className="h-4 w-4" />
                        {showLabel && <span>{t("common.settings")}</span>}
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent
                showClose={false}
                overlayClassName="!bg-black/10 !backdrop-blur-none md:!bg-transparent"
                className="!left-0 !top-0 !bottom-0 !translate-x-0 !translate-y-0 !w-full !max-w-none !rounded-none border-white/5 bg-[#171717] p-0 text-white shadow-2xl overflow-hidden gap-0 md:!left-5 md:!top-5 md:!bottom-5 md:!w-[min(650px,calc(100vw-40px))] md:!rounded-[30px]"
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="flex h-[82px] shrink-0 items-center justify-between px-6">
                        <div className="flex min-w-0 items-center gap-5">
                            {activeSection === "home" ? (
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/10">
                                        <ArrowLeft className="h-7 w-7" />
                                    </Button>
                                </DialogClose>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 rounded-full text-white hover:bg-white/10"
                                    onClick={() => setActiveSection("home")}
                                >
                                    <ArrowLeft className="h-7 w-7" />
                                </Button>
                            )}
                            <DialogTitle className="truncate text-[26px] font-semibold">
                                {activeSection === "home" ? "Settings" : activeNavItem?.label || "Settings"}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/10" title="Search settings">
                                <Search className="h-7 w-7" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/10" title="More">
                                <MoreVertical className="h-7 w-7" />
                            </Button>
                        </div>
                    </div>

                    {toast && (
                        <div className="shrink-0 px-5 pb-3">
                            <StatusToastUI toast={toast} onClose={() => setToast(null)} />
                        </div>
                    )}

                    {activeSection === "home" ? (
                        renderSettingsHome()
                    ) : (
                        <ScrollArea className="min-h-0 flex-1">
                            <div className="px-5 pb-10 pt-2">
                                {renderContent()}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
