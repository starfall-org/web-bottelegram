import { cn } from "@/lib/utils";
import type { InlineKeyboardButton } from "@/store/types";

interface InlineKeyboardProps {
    buttons: InlineKeyboardButton[][];
    onCallbackClick?: (callbackData: string) => void;
}

export function InlineKeyboard({ buttons, onCallbackClick }: InlineKeyboardProps) {
    if (!buttons || buttons.length === 0) return null;

    return (
        <div className="mt-2 space-y-1">
            {buttons.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-1">
                    {row.map((button, btnIdx) => (
                        <button
                            key={btnIdx}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (button.url) {
                                    window.open(button.url, "_blank");
                                } else if (button.callback_data && onCallbackClick) {
                                    onCallbackClick(button.callback_data);
                                } else if (button.web_app?.url) {
                                    window.open(button.web_app.url, "_blank");
                                }
                            }}
                            className={cn(
                                "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                "bg-primary/10 hover:bg-primary/20 text-primary",
                                "border border-primary/20",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                            )}
                            disabled={
                                !button.url &&
                                !button.callback_data &&
                                !button.web_app
                            }
                        >
                            {button.text}
                            {button.url && " 🔗"}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}
