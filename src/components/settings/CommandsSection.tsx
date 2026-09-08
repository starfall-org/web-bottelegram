import { useMemo, useState } from "react";
import {
    Bot,
    ChevronLeft,
    Link2,
    Plus,
    Save,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { botService } from "@/services/botService";
import {
    useBotStore,
    type CustomBotCommand,
    type CustomCommandButton,
} from "@/store/botStore";
import { cn } from "@/lib/utils";

const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createCommand = (): CustomBotCommand => ({
    id: newId(),
    command: "",
    description: "",
    response: "",
    enabled: true,
    buttons: [],
});

const normalizeCommandName = (value: string) =>
    value
        .replace(/^\/+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 32);

interface CommandsSectionProps {
    onBack?: () => void;
    showToast?: (message: string, type?: "success" | "error" | "info" | "loading") => void;
}

export function CommandsSection({ onBack, showToast }: CommandsSectionProps) {
    const {
        getCustomCommands,
        upsertCustomCommand,
        removeCustomCommand,
        setBotInfo,
        isConnected,
    } = useBotStore();
    const commands = getCustomCommands();
    const [selectedId, setSelectedId] = useState(commands[0]?.id || "builtin-start");
    const selected = useMemo(
        () => commands.find((item) => item.id === selectedId) || commands[0],
        [commands, selectedId],
    );
    const [draft, setDraft] = useState<CustomBotCommand | null>(selected || null);

    const selectCommand = (command: CustomBotCommand) => {
        setSelectedId(command.id);
        setDraft({
            ...command,
            buttons: command.buttons.map((button) => ({ ...button })),
        });
    };

    const addCommand = () => {
        const command = createCommand();
        setSelectedId(command.id);
        setDraft(command);
    };

    const syncTelegramCommands = async (nextCommands: CustomBotCommand[]) => {
        const menuCommands = nextCommands
            .filter((item) => item.enabled)
            .map((item) => ({
                command: item.command,
                description: item.description.trim() || `/${item.command}`,
            }))
            .filter((item) => item.command);
        setBotInfo({ commands: menuCommands });
        if (!isConnected) return;
        const response = await botService.setMyCommands(menuCommands);
        if (!response.ok) {
            throw new Error(response.description || "Không thể đồng bộ command với Telegram");
        }
    };

    const saveDraft = async () => {
        if (!draft) return;
        const commandName = normalizeCommandName(draft.command);
        if (!commandName) {
            showToast?.("Tên command không hợp lệ", "error");
            return;
        }
        const duplicate = commands.find(
            (item) => item.id !== draft.id && item.command.toLowerCase() === commandName,
        );
        if (duplicate) {
            showToast?.(`/${commandName} đã tồn tại`, "error");
            return;
        }

        const normalized: CustomBotCommand = {
            ...draft,
            command: commandName,
            enabled: draft.builtin === "start" ? true : draft.enabled,
            description: draft.description.trim() || (draft.builtin === "start" ? "Start bot" : commandName),
            buttons: draft.buttons.map((button) => ({
                ...button,
                id: button.id || newId(),
                row: Math.max(0, Math.floor(Number(button.row) || 0)),
                text: button.text.trim(),
                value: button.value.trim(),
            })),
        };
        const next = commands.some((item) => item.id === normalized.id)
            ? commands.map((item) => (item.id === normalized.id ? normalized : item))
            : [...commands, normalized];

        try {
            upsertCustomCommand(normalized);
            await syncTelegramCommands(next);
            setDraft(normalized);
            setSelectedId(normalized.id);
            showToast?.(`Đã lưu /${normalized.command}`, "success");
        } catch (error) {
            showToast?.(error instanceof Error ? error.message : String(error), "error");
        }
    };

    const deleteSelected = async () => {
        if (!draft || draft.builtin === "start") return;
        if (!window.confirm(`Xóa /${draft.command || "command"}?`)) return;
        const next = commands.filter((item) => item.id !== draft.id);
        if (!removeCustomCommand(draft.id)) return;
        try {
            await syncTelegramCommands(next);
        } catch (error) {
            showToast?.(error instanceof Error ? error.message : String(error), "error");
        }
        const fallback = next[0];
        setSelectedId(fallback?.id || "builtin-start");
        setDraft(fallback ? { ...fallback, buttons: fallback.buttons.map((item) => ({ ...item })) } : null);
    };

    const addButton = () => {
        if (!draft) return;
        const button: CustomCommandButton = {
            id: newId(),
            text: "Button",
            type: "callback",
            value: "action",
            row: draft.buttons.length ? Math.max(...draft.buttons.map((item) => item.row)) : 0,
        };
        setDraft({ ...draft, buttons: [...draft.buttons, button] });
    };

    const updateButton = (id: string, patch: Partial<CustomCommandButton>) => {
        if (!draft) return;
        setDraft({
            ...draft,
            buttons: draft.buttons.map((button) =>
                button.id === id ? { ...button, ...patch } : button,
            ),
        });
    };

    const removeButton = (id: string) => {
        if (!draft) return;
        setDraft({ ...draft, buttons: draft.buttons.filter((button) => button.id !== id) });
    };

    if (!draft) return null;

    return (
        <div className="space-y-5 text-white">
            <div className="flex items-center gap-3">
                {onBack && (
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onBack}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                )}
                <div className="flex-1">
                    <h2 className="text-2xl font-semibold">Commands</h2>
                    <p className="text-sm text-[#929292]">Tạo response và inline button cho từng lệnh.</p>
                </div>
                <Button onClick={addCommand} className="rounded-full bg-[#8875df] hover:bg-[#7865d2]">
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>

            <div className="grid min-h-[620px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-[26px] bg-[#202020] p-2">
                    {commands.map((command) => (
                        <button
                            key={command.id}
                            type="button"
                            onClick={() => selectCommand(command)}
                            className={cn(
                                "mb-1 flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition-colors",
                                selectedId === command.id
                                    ? "bg-[#2d2939] text-[#a48dff]"
                                    : "hover:bg-white/[0.04]",
                            )}
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8875df]/20">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">/{command.command}</p>
                                <p className="truncate text-xs text-[#929292]">{command.description}</p>
                            </div>
                        </button>
                    ))}
                    {!commands.some((item) => item.id === draft.id) && (
                        <button type="button" className="flex w-full items-center gap-3 rounded-[20px] bg-[#2d2939] px-3 py-3 text-left text-[#a48dff]">
                            <Plus className="h-5 w-5" /> New command
                        </button>
                    )}
                </div>

                <div className="space-y-5 rounded-[28px] bg-[#202020] p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Command</Label>
                            <div className="flex items-center rounded-xl bg-[#151515] px-3">
                                <span className="text-[#8d8d8d]">/</span>
                                <Input
                                    value={draft.command}
                                    disabled={draft.builtin === "start"}
                                    onChange={(event) =>
                                        setDraft({ ...draft, command: normalizeCommandName(event.target.value) })
                                    }
                                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={draft.description}
                                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                className="border-white/5 bg-[#151515]"
                                maxLength={256}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-[#171717] px-4 py-3">
                        <div>
                            <p className="font-medium">Enabled</p>
                            <p className="text-xs text-[#929292]">Lệnh bật sẽ được đăng ký vào menu Telegram.</p>
                        </div>
                        <Switch
                            checked={draft.builtin === "start" ? true : draft.enabled}
                            disabled={draft.builtin === "start"}
                            onCheckedChange={(enabled) => setDraft({ ...draft, enabled })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Response</Label>
                        <textarea
                            value={draft.response}
                            onChange={(event) => setDraft({ ...draft, response: event.target.value })}
                            rows={4}
                            className="w-full resize-y rounded-2xl border border-white/5 bg-[#151515] p-4 text-sm outline-none focus:border-[#8875df]"
                            placeholder={
                                draft.builtin === "start"
                                    ? "Để trống để dùng response preset hiện tại."
                                    : "Nội dung bot sẽ trả lời..."
                            }
                        />
                        {draft.builtin === "start" && (
                            <p className="text-xs text-[#929292]">
                                /start luôn tồn tại và không thể xóa. Khi response trống, Bottlegram dùng preset mặc định.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Inline buttons</Label>
                                <p className="text-xs text-[#929292]">Cùng row sẽ nằm trên cùng một hàng.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={addButton} className="rounded-full border-white/10 bg-transparent">
                                <Plus className="mr-2 h-4 w-4" /> Button
                            </Button>
                        </div>
                        {draft.buttons.map((button) => (
                            <div key={button.id} className="grid gap-2 rounded-2xl bg-[#171717] p-3 sm:grid-cols-[1fr_110px_1fr_70px_40px]">
                                <Input value={button.text} onChange={(event) => updateButton(button.id, { text: event.target.value })} placeholder="Label" className="border-white/5 bg-[#111]" />
                                <select value={button.type} onChange={(event) => updateButton(button.id, { type: event.target.value as 'callback' | 'url' })} className="rounded-md border border-white/5 bg-[#111] px-2 text-sm">
                                    <option value="callback">Callback</option>
                                    <option value="url">URL</option>
                                </select>
                                <div className="relative">
                                    {button.type === "url" && <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />}
                                    <Input value={button.value} onChange={(event) => updateButton(button.id, { value: event.target.value })} placeholder={button.type === "url" ? "https://..." : "callback_data"} className={cn("border-white/5 bg-[#111]", button.type === "url" && "pl-9")} />
                                </div>
                                <Input type="number" min={0} value={button.row} onChange={(event) => updateButton(button.id, { row: Number(event.target.value) })} className="border-white/5 bg-[#111]" title="Row" />
                                <Button variant="ghost" size="icon" onClick={() => removeButton(button.id)} className="text-red-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                        <Button
                            variant="ghost"
                            disabled={draft.builtin === "start"}
                            onClick={deleteSelected}
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                        <Button onClick={saveDraft} className="rounded-full bg-[#8875df] px-6 hover:bg-[#7865d2]">
                            <Save className="mr-2 h-4 w-4" /> Save command
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}