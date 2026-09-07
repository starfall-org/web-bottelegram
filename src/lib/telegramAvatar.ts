import { botService } from "@/services/botService";

export async function getAvatarUrl(fileId?: string): Promise<string | undefined> {
    if (!fileId) return undefined;

    try {
        const response = await botService.getFile(fileId);
        if (!response.ok || !response.result?.file_path) return undefined;

        return botService.getFileUrl(response.result.file_path);
    } catch {
        return undefined;
    }
}

export async function getChatAvatarUrl(chat: any): Promise<string | undefined> {
    return getAvatarUrl(chat?.photo?.small_file_id || chat?.photo?.big_file_id);
}

export async function getUserAvatarUrl(userId?: number | null): Promise<string | undefined> {
    if (!userId) return undefined;

    try {
        const response = await botService.getUserProfilePhotos(userId, 1);
        const sizes = response.ok ? response.result?.photos?.[0] : undefined;
        const largestPhoto = sizes?.[sizes.length - 1];
        return getAvatarUrl(largestPhoto?.file_id);
    } catch {
        return undefined;
    }
}
