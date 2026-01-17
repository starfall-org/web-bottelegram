import type { BotState, BotData } from "./types";
import {
    createDefaultBotData,
    createDefaultBotInfo,
    createDefaultPreferences,
} from "./defaults";

/**
 * Serialize botDataMap for localStorage persistence
 * Converts Map and Set to Array for JSON serialization
 */
export const serializeBotDataMap = (botDataMap: Map<string, BotData>) => {
    if (!(botDataMap instanceof Map)) {
        return [];
    }

    return Array.from(botDataMap.entries()).map(([token, botData]) => [
        token,
        {
            ...botData,
            chats:
                botData.chats instanceof Map
                    ? Array.from(botData.chats.entries()).map(
                          ([chatId, chat]) => [
                              chatId,
                              {
                                  ...chat,
                                  messageIds:
                                      chat.messageIds instanceof Set
                                          ? Array.from(chat.messageIds)
                                          : Array.isArray(chat.messageIds)
                                            ? chat.messageIds
                                            : [],
                                  members:
                                      chat.members instanceof Map
                                          ? Array.from(chat.members.entries())
                                          : [],
                              },
                          ],
                      )
                    : [],
            recentStickers: botData.recentStickers || [],
            favoriteStickers: botData.favoriteStickers || [],
        },
    ]);
};

/**
 * Deserialize botDataMap from localStorage
 * Converts Array back to Map and Set
 */
export const deserializeBotDataMap = (
    botDataArray: any[],
): Map<string, BotData> => {
    if (!Array.isArray(botDataArray)) {
        return new Map();
    }

    return new Map(
        botDataArray.map(([token, botData]) => {
            // Ensure botData is valid
            if (!botData || typeof botData !== "object") {
                console.warn("[BotStore] Invalid botData for token", token);
                return [token, createDefaultBotData()];
            }

            return [
                token,
                {
                    ...botData,
                    // Ensure chats is a Map and reconstruct nested Sets/Maps
                    chats:
                        botData.chats && Array.isArray(botData.chats)
                            ? new Map(
                                  (botData.chats as any[]).map(
                                      ([chatId, chat]: [string, any]) => [
                                          chatId,
                                          {
                                              ...chat,
                                              messageIds: new Set(
                                                  chat.messageIds || [],
                                              ),
                                              members: new Map(
                                                  chat.members || [],
                                              ),
                                          },
                                      ],
                                  ),
                              )
                            : new Map(),
                    // Ensure other required fields exist
                    botInfo: botData.botInfo || createDefaultBotInfo(),
                    lastUpdateId: botData.lastUpdateId || 0,
                    activeChatId: botData.activeChatId || null,
                    recentStickers: botData.recentStickers || [],
                    favoriteStickers: botData.favoriteStickers || [],
                },
            ];
        }),
    );
};

/**
 * Partialize state for persistence - only save what we need
 */
export const partializeState = (state: BotState) => ({
    token: state.token,
    theme: state.theme,
    language: state.language,
    preferences: state.preferences,
    botDataMap: serializeBotDataMap(state.botDataMap),
});

/**
 * Rehydrate state from localStorage
 */
export const rehydrateState = (state?: BotState) => {
    console.debug("[BotStore] Rehydrating state...", state);
    if (!state) return;

    try {
        // Ensure botDataMap is always initialized
        if (!state.botDataMap) {
            console.warn(
                "[BotStore] botDataMap is missing, initializing new Map",
            );
            state.botDataMap = new Map();
        } else if (Array.isArray(state.botDataMap)) {
            console.debug(
                "[BotStore] Converting botDataMap array to Map",
                state.botDataMap,
            );
            state.botDataMap = deserializeBotDataMap(state.botDataMap as any);
            console.debug(
                "[BotStore] Rehydration complete. Chats:",
                state.botDataMap,
            );
        } else {
            console.debug(
                "[BotStore] botDataMap is already a Map (or unknown type)",
                state.botDataMap,
            );
        }

        // Ensure other required properties exist
        if (!state.preferences) {
            state.preferences = createDefaultPreferences();
        } else if (!state.preferences.parseMode) {
            // Add parseMode if missing from old saved state
            state.preferences.parseMode = 'MarkdownV2';
        }

        if (!state.language) {
            state.language = "vi";
        }

        if (!state.theme) {
            state.theme = "system";
        }
    } catch (error) {
        console.error("[BotStore] Error during store rehydration:", error);
        // Reset to default state if rehydration fails
        if (state) {
            state.botDataMap = new Map();
            state.preferences = createDefaultPreferences();
            state.language = "vi";
            state.theme = "system";
        }
    }
};
