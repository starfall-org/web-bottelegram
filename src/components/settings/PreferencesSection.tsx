import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Trash2, Sparkles, Volume2, BellRing, FileText } from "lucide-react";
import { SectionHeader, SettingRow } from "./SettingsComponents";

interface PreferencesSectionProps {
    t: (key: string) => string;
    preferences: {
        autoScroll: boolean;
        sound: boolean;
        push: boolean;
        parseMode: 'MarkdownV2' | 'Markdown' | 'HTML' | 'None';
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

                <SettingRow
                    icon={FileText}
                    title="Định dạng tin nhắn"
                    description="Chọn cách hiển thị và gửi tin nhắn"
                    className="px-4 hover:bg-muted/50 transition-colors"
                >
                    <select
                        value={preferences.parseMode}
                        onChange={(e) =>
                            updatePreferences({ parseMode: e.target.value as any })
                        }
                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
                    >
                        <option value="MarkdownV2">MarkdownV2 (Mặc định)</option>
                        <option value="Markdown">Markdown (Legacy)</option>
                        <option value="HTML">HTML</option>
                        <option value="None">Plain Text</option>
                    </select>
                </SettingRow>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 text-xs space-y-2">
                <p className="font-medium">Hướng dẫn định dạng:</p>
                <div className="space-y-1 text-muted-foreground">
                    <p><strong>MarkdownV2:</strong> **bold** __italic__ ~~strike~~ `code` ```pre``` [link](url)</p>
                    <p><strong>Markdown:</strong> *bold* _italic_ `code` [link](url)</p>
                    <p><strong>HTML:</strong> &lt;b&gt;bold&lt;/b&gt; &lt;i&gt;italic&lt;/i&gt; &lt;code&gt;code&lt;/code&gt; &lt;a href="url"&gt;link&lt;/a&gt;</p>
                </div>
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
