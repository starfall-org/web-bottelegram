import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InlineKeyboardButton } from "@/store/types";

interface InlineKeyboardProps {
    buttons: InlineKeyboardButton[][];
    onCallbackClick?: (callbackData: string) => void;
}

export function InlineKeyboard({ buttons, onCallbackClick }: InlineKeyboardProps) {
    if (!buttons || buttons.length === 0) return null;

    // Keep Telegram's row/column structure responsive. Width is proportional
    // to the available message cluster instead of being locked to pixels.
    const maxColumns = Math.max(1, ...buttons.map((row) => row.length));
    const widthPercent = Math.min(100, Math.max(36, maxColumns * 32));

    return (
        <div
            className="telegram-inline-keyboard max-w-full space-y-1"
            style={{ width: `${widthPercent}%` }}
        >
            {buttons.map((row, rowIdx) => (
                <div
                    key={rowIdx}
                    className="grid gap-1"
                    style={{
                        gridTemplateColumns: `repeat(${Math.max(1, row.length)}, minmax(0, 1fr))`,
                    }}
                >
                    {row.map((button, btnIdx) => {
                        const isUrl = Boolean(button.url || button.web_app?.url);
                        const disabled = !button.url && !button.callback_data && !button.web_app?.url;

                        return (
                            <button
                                key={btnIdx}
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (button.url) {
                                        window.open(button.url, "_blank", "noopener,noreferrer");
                                    } else if (button.web_app?.url) {
                                        window.open(button.web_app.url, "_blank", "noopener,noreferrer");
                                    } else if (button.callback_data && onCallbackClick) {
                                        onCallbackClick(button.callback_data);
                                    }
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                                className={cn(
                                    "flex min-h-10 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-white/[0.055] bg-[#242424] px-3 py-2 text-center text-sm font-semibold text-[#a995ff] whitespace-nowrap",
                                    "transition-colors hover:bg-[#2d2a36] active:bg-[#34303f]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8875df]/70",
                                    disabled && "cursor-default opacity-50 hover:bg-[#242424]",
                                )}
                                disabled={disabled}
                                title={
                                    button.url
                                        ? button.url
                                        : button.web_app?.url
                                          ? button.web_app.url
                                          : button.callback_data
                                            ? `Callback: ${button.callback_data}`
                                            : undefined
                                }
                            >
                                <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{button.text}</span>
                                {isUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
