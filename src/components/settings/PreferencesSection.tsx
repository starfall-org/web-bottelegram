import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Trash2, Sparkles, Volume2, BellRing } from "lucide-react";
import { SectionHeader, SettingRow } from "./SettingsComponents";

interface PreferencesSectionProps {
    t: (key: string) => string;
    preferences: {
        autoScroll: boolean;
        sound: boolean;
        push: boolean;
    };
    updatePreferences: (prefs: Partial<PreferencesSectionProps["preferences"]>) => void;
    handleClearAllData: () => void;
}

export function PreferencesSection({
    t,
    preferences,
    updatePreferences,
    handleClearAllData,
}: PreferencesSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Bell}
                title={t("settings.appPreferences")}
                description={t("settings.appPreferencesDesc")}
            />

            <div className="space-y-1 rounded-xl border divide-y overflow-hidden">
                <SettingRow
                    icon={Sparkles}
                    title={t("settings.autoScroll")}
                    description={t("settings.autoScrollDesc")}
                    className="px-4 hover:bg-muted/50 transition-colors"
                >
                    <Switch
                        checked={preferences.autoScroll}
                        onCheckedChange={(checked) =>
                            updatePreferences({ autoScroll: checked })
                        }
                    />
                </SettingRow>

                <SettingRow
                    icon={Volume2}
                    title={t("settings.sound")}
                    description={t("settings.soundDesc")}
                    className="px-4 hover:bg-muted/50 transition-colors"
                >
                    <Switch
                        checked={preferences.sound}
                        onCheckedChange={(checked) =>
                            updatePreferences({ sound: checked })
                        }
                    />
                </SettingRow>

                <SettingRow
                    icon={BellRing}
                    title={t("settings.push")}
                    description={t("settings.pushDesc")}
                    className="px-4 hover:bg-muted/50 transition-colors"
                >
                    <Switch
                        checked={preferences.push}
                        onCheckedChange={(checked) =>
                            updatePreferences({ push: checked })
                        }
                    />
                </SettingRow>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <Label className="text-sm font-medium">
                        {t("settings.dangerZone")}
                    </Label>
                </div>
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {t("settings.clearAllDataDesc")}
                    </p>
                    <Button
                        variant="destructive"
                        onClick={handleClearAllData}
                        className="w-full h-10"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("bot.clearAllData")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
