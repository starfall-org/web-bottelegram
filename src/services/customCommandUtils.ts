import type { CustomCommandButton, InlineKeyboardButton } from "@/store/types";

export const parseBotCommand = (text: string, botUsername?: string | null) => {
    const match = text
        .trim()
        .match(/^\/([a-zA-Z0-9_]{1,32})(?:@([a-zA-Z0-9_]{3,32}))?(?:\s+([\s\S]*))?$/);
    if (!match) return null;
    if (
        match[2] &&
        botUsername &&
        match[2].toLowerCase() !== botUsername.replace(/^@/, "").toLowerCase()
    ) {
        return null;
    }
    return {
        command: match[1].toLowerCase(),
        args: match[3] || "",
    };
};

export const commandButtonsToReplyMarkup = (
    buttons: CustomCommandButton[],
): InlineKeyboardButton[][] | undefined => {
    const usable = buttons
        .filter((button) => button.text.trim() && button.value.trim())
        .sort((a, b) => a.row - b.row);
    if (!usable.length) return undefined;

    const rows = new Map<number, InlineKeyboardButton[]>();
    for (const button of usable) {
        const row = Math.max(0, Math.floor(button.row || 0));
        const items = rows.get(row) || [];
        items.push(
            button.type === "url"
                ? { text: button.text.trim(), url: button.value.trim() }
                : { text: button.text.trim(), callback_data: button.value.trim() },
        );
        rows.set(row, items);
    }
    return [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, items]) => items);
};
