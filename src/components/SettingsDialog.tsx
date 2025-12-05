import { useState, useEffect, useCallback } from "react";
import { useBotStore } from "@/store/botStore";
import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "@/i18n/useTranslation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Settings,
    Wifi,
    WifiOff,
    Palette,
    Bell,
    Database,
    Info,
} from "lucide-react";
import { botService } from "@/services/botService";

import {
    type SettingsSection,
    type StatusToast,
    NavItem,
    StatusToastUI,
} from "./settings/SettingsComponents";
import { ConnectionSection } from "./settings/ConnectionSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { PreferencesSection } from "./settings/PreferencesSection";
import { BotsSection } from "./settings/BotsSection";
import { AboutSection } from "./settings/AboutSection";

export function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [activeSection, setActiveSection] =
        useState<SettingsSection>("connection");
    const [tokenInput, setTokenInput] = useState("");
    const [proxyInput, setProxyInput] = useState("");
    const [showToken, setShowToken] = useState(false);
    const [toast, setToast] = useState<StatusToast | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);

    // Bot profile states
    const [botName, setBotName] = useState("");
    const [botUsernameInput, setBotUsernameInput] = useState("");
    const [botDescription, setBotDescription] = useState("");
    const [botShortDescription, setBotShortDescription] = useState("");

    const {
        token,
        setToken,
        getCurrentBotInfo,
        setBotInfo,
        botDataMap,
        clearBotData,
        isConnected,
        isPolling,
        preferences,
        updatePreferences,
        clearAllData,
    } = useBotStore();

    const botInfo = getCurrentBotInfo();
    const { theme, setTheme } = useTheme();
    const { t, language, changeLanguage } = useTranslation();

    useEffect(() => {
        if (open) {
            setTokenInput(token);
            setProxyInput(localStorage.getItem("cors_proxy") || "");
            setToast(null);
            setBotName(botInfo.name || "");
            setBotUsernameInput(botInfo.username || "");
            setBotDescription(botInfo.description || "");
            setBotShortDescription(botInfo.shortDescription || "");
        }
    }, [open, token, botInfo]);

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
            botService.setConfig({ token: tok, proxyPrefix });
            return true;
        } catch {
            return false;
        }
    }, [tokenInput, proxyInput]);

    const handleSaveConnection = async () => {
        if (!tokenInput.trim()) {
            showToast(t("messages.enterToken"), "error");
            return;
        }
        setIsLoading(true);
        try {
            setToken(tokenInput.trim());
            localStorage.setItem("bot_token", tokenInput.trim());
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.settings")}
                    className="relative"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl h-[90vh] max-h-[800px] p-0 gap-0 overflow-hidden">
                <div className="flex h-full overflow-hidden">
                    {/* Sidebar Navigation */}
                    <div className="w-64 border-r bg-muted/30 flex-col shrink-0 hidden sm:flex overflow-hidden">
                        <DialogHeader className="p-4 pb-2">
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                    <Settings className="h-4 w-4 text-primary" />
                                </div>
                                {t("settings.title")}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {t("settings.description")}
                            </DialogDescription>
                        </DialogHeader>

                        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <NavItem
                                    key={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    description={item.description}
                                    active={activeSection === item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    badge={item.badge}
                                />
                            ))}
                        </nav>

                        {/* Connection Status in Sidebar */}
                        <div className="p-3 border-t">
                            <div
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                                    isConnected
                                        ? "bg-green-500/10 text-green-600"
                                        : "bg-muted text-muted-foreground",
                                )}
                            >
                                {isConnected ? (
                                    <Wifi className="h-3.5 w-3.5" />
                                ) : (
                                    <WifiOff className="h-3.5 w-3.5" />
                                )}
                                <span className="truncate">
                                    {isConnected
                                        ? botInfo.name ||
                                          t("connection.connected")
                                        : t("connection.disconnected")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="sm:hidden border-b p-2 flex gap-1 overflow-x-auto shrink-0 absolute top-0 left-0 right-0 bg-background z-10">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                                        activeSection === item.id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-accent",
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 sm:pt-0 pt-14 overflow-hidden">
                        {/* Toast */}
                        {toast && (
                            <div className="px-6 pt-4 shrink-0">
                                <StatusToastUI
                                    toast={toast}
                                    onClose={() => setToast(null)}
                                />
                            </div>
                        )}

                        {/* Main Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            <div className="p-6 pb-12">{renderContent()}</div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
