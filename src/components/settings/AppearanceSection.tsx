import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Globe, Palette, Check } from "lucide-react";
import { SectionHeader } from "./SettingsComponents";

interface AppearanceSectionProps {
    t: (key: string) => string;
    theme: "light" | "dark" | "system";
    setTheme: (theme: "light" | "dark" | "system") => void;
    language: "vi" | "en";
    changeLanguage: (lang: "vi" | "en") => void;
}

const themeOptions = [
    {
        value: "light" as const,
        icon: Sun,
        labelKey: "settings.themeLight",
        descKey: "settings.themeLightDesc",
    },
    {
        value: "dark" as const,
        icon: Moon,
        labelKey: "settings.themeDark",
        descKey: "settings.themeDarkDesc",
    },
    {
        value: "system" as const,
        icon: Monitor,
        labelKey: "settings.themeSystem",
        descKey: "settings.themeSystemDesc",
    },
];

const languageOptions = [
    { value: "vi" as const, label: "Tiếng Việt", flag: "🇻🇳" },
    { value: "en" as const, label: "English", flag: "🇬🇧" },
];

export function AppearanceSection({
    t,
    theme,
    setTheme,
    language,
    changeLanguage,
}: AppearanceSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Palette}
                title={t("settings.theme")}
                description={t("settings.themeDesc")}
            />

            {/* Theme Selection */}
            <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                        <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={cn(
                                "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                                "hover:border-primary/50 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
                                isActive
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border",
                            )}
                        >
                            <div
                                className={cn(
                                    "p-3 rounded-full transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted",
                                )}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-sm">
                                    {t(option.labelKey)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                                    {t(option.descKey)}
                                </div>
                            </div>
                            {isActive && (
                                <div className="absolute top-2 right-2">
                                    <Check className="h-4 w-4 text-primary" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <Separator />

            {/* Language Selection */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">
                        {t("settings.language")}
                    </Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {languageOptions.map((option) => {
                        const isActive = language === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => changeLanguage(option.value)}
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                                    "hover:border-primary/50 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
                                    isActive
                                        ? "border-primary bg-primary/5"
                                        : "border-border",
                                )}
                            >
                                <span className="text-2xl">{option.flag}</span>
                                <span className="font-medium">
                                    {option.label}
                                </span>
                                {isActive && (
                                    <Check className="h-4 w-4 text-primary ml-auto" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
