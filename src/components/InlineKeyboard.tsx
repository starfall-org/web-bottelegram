import { cn } from "@/lib/utils";
import type { InlineKeyboardButton } from "@/store/types";

interface InlineKeyboardProps {
    buttons: InlineKeyboardButton[][];
    onCallbackClick?: (callbackData: string) => void;
}

export function InlineKeyboard({ buttons, onCallbackClick }: InlineKeyboardProps) {
    if (!buttons || buttons.length === 0) return null;

    return (
        <div className="mt-3 space-y-1.5">
            {buttons.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-1.5">
                    {row.map((button, btnIdx) => {
                        const isUrl = !!button.url;
                        const isWebApp = !!button.web_app;
                        
                        return (
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
                                    "flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                                    "border shadow-sm",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "hover:shadow-md active:scale-95",
                                    isUrl || isWebApp
                                        ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                        : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                                )}
                                disabled={
                                    !button.url &&
                                    !button.callback_data &&
                                    !button.web_app
                                }
                                title={
                                    button.url 
                                        ? `Mở link: ${button.url}` 
                                        : button.callback_data 
                                        ? `Callback: ${button.callback_data}`
                                        : button.web_app?.url
                                        ? `Web App: ${button.web_app.url}`
                                        : undefined
                                }
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    {button.text}
                                    {isUrl && <span className="text-xs">🔗</span>}
                                    {isWebApp && <span className="text-xs">🌐</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
