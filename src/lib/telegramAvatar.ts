import { botService } from "@/services/botService";

/**
 * Resolve a Telegram fileId (Bot API string) or direct MTProto FileLocation / ChatPhotoSize
 * into a usable blob/http URL.
 */
export async function getAvatarUrl(fileIdOrLocation?: string | any): Promise<string | undefined> {
    if (!fileIdOrLocation) return undefined;

    try {
        // If it's already a string fileId, use normal getFile path
        // If it's a FileLocation object (mtcute ChatPhotoSize), botService will route to mtProtoGateway
        const response =
            typeof fileIdOrLocation === "string"
                ? await botService.getFile(fileIdOrLocation)
                : await (botService as any).getAvatarFile
                  ? await (botService as any).getAvatarFile(fileIdOrLocation)
                  : await botService.getFile(fileIdOrLocation);
        if (!response.ok || !response.result?.file_path) return undefined;
        return botService.getFileUrl(response.result.file_path);
    } catch {
        return undefined;
    }
}

/**
 * Bot API returns chat.photo as { small_file_id, big_file_id }
 * MTProto getChat now also populates this shape, but for direct FileLocation
 * fallback we also try downloading via FileLocation when fileId is not a string.
 */
export async function getChatAvatarUrl(chat: any): Promise<string | undefined> {
    if (!chat) return undefined;
    // Bot-API shape
    const fileId = chat?.photo?.small_file_id || chat?.photo?.big_file_id;
    if (fileId) return getAvatarUrl(fileId);

    // MTProto shape: chat.photo may be a ChatPhoto object with .small/.big FileLocations
    const loc = chat?.photo?.small || chat?.photo?.big || chat?.fullPhoto;
    if (loc) {
        try {
            return await getAvatarUrl(loc);
        } catch {
            return undefined;
        }
    }

    // Last resort: if we have chat.id, try downloading chat photo directly via gateway
    if (chat?.id != null) {
        try {
            const res = await (botService as any).getChatPhotoUrl?.(chat.id);
            if (res?.ok && res.url) return res.url;
            // Also try getChatPhotoUrl fallback via getChat re-fetch
        } catch {
            /* ignore */
        }
    }
    return undefined;
}

/**
 * Unified helper — works for both Bot API and MTProto gateways.
 * Bot API: getUserProfilePhotos -> file_id -> getFile -> http url
 * MTProto: getUserProfilePhotos via mtcute (thumbnails) -> fileId -> downloadAsBuffer -> blob url
 */
export async function getUserAvatarUrl(userId?: number | null): Promise<string | undefined> {
    if (!userId) return undefined;

    try {
        const response = await botService.getUserProfilePhotos(userId, 1);
        // mtcute/Bot API both populate result.photos as Array<Array<{file_id}>>
        const photos: any = (response as any).result?.photos;
        const sizes = Array.isArray(photos) ? photos[0] : undefined;
        const largestPhoto = Array.isArray(sizes) ? sizes[sizes.length - 1] : undefined;
        const fileId = largestPhoto?.file_id || largestPhoto?.fileId;
        // In MTProto thumbnails, fileId is a Bot-API-compatible string — still downloadable via getFile
        if (fileId) return getAvatarUrl(fileId);

        // MTProto fallback: Photo object itself may be a FileLocation
        if (largestPhoto && typeof largestPhoto !== "string") {
            const loc = largestPhoto.location || largestPhoto;
            if (loc) {
                const alt = await getAvatarUrl(loc as any);
                if (alt) return alt;
            }
        }
        return undefined;
    } catch {
        return undefined;
    }
}
