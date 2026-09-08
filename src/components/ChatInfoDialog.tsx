import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useBotStore } from "@/store/botStore";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Crown,
  FileText,
  Link2,
  Loader2,
  MoreVertical,
  Pencil,
  QrCode,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { getChatAvatarUrl } from "@/lib/telegramAvatar";
import { botService } from "@/services/botService";

const extractLinks = (text?: string) => {
  if (!text) return [];
  return text.match(/https?:\/\/[^\s<>()]+/gi) || [];
};

export function ChatInfoDialog() {
  const {
    getCurrentActiveChatId,
    getCurrentChats,
    getCurrentBotInfo,
    getOrCreateChat,
    upsertMember,
  } = useBotStore();
  const activeChatId = getCurrentActiveChatId();
  const chats = getCurrentChats();
  const chat = activeChatId ? chats?.get(activeChatId) : null;
  const botInfo = getCurrentBotInfo();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !chat) return;
    let cancelled = false;

    const sync = async () => {
      try {
        const profileResponse = await botService.getChat(chat.id);
        if (profileResponse.ok && profileResponse.result) {
          const info: any = profileResponse.result;
          const avatarUrl = await getChatAvatarUrl(info);
          const patch: any = {
            username: info.username || undefined,
            description: info.description || info.bio || undefined,
          };
          if (avatarUrl) patch.avatarUrl = avatarUrl;

          if (chat.type !== "private") {
            const countResponse = await botService.getChatMemberCount(chat.id);
            if (countResponse.ok && typeof countResponse.result === "number") {
              patch.memberCount = countResponse.result;
            }
          }

          if (!cancelled) getOrCreateChat(chat.id, patch);
        }

        if (chat.type === "group" || chat.type === "supergroup") {
          const adminsResponse = await botService.getChatAdministrators(chat.id);
          if (adminsResponse.ok && Array.isArray(adminsResponse.result)) {
            for (const admin of adminsResponse.result as any[]) {
              const user = admin.user;
              if (!user?.id) continue;
              const displayName =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                user.username ||
                String(user.id);
              upsertMember(chat.id, {
                id: String(user.id),
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                displayName,
                avatarText: displayName.charAt(0).toUpperCase(),
                status: admin.status || "administrator",
                isAdmin: admin.status === "administrator" || admin.status === "creator",
                isCreator: admin.status === "creator",
                isBot: Boolean(user.is_bot),
                lastSeen: Date.now(),
              });
            }
          }
        }

        if (chat.type !== "private" && botInfo.id) {
          const memberResponse = await botService.getChatMember(chat.id, botInfo.id);
          const member: any = memberResponse.ok ? memberResponse.result : null;
          const canChangeInfo =
            member?.status === "creator" ||
            (member?.status === "administrator" && Boolean(member.can_change_info));
          if (!cancelled) {
            getOrCreateChat(chat.id, {
              permissions: { ...chat.permissions, canChangeInfo },
            });
          }
        }
      } catch (error) {
        console.warn("Failed to load chat info:", error);
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [open, chat?.id, chat?.type, botInfo.id, getOrCreateChat]);

  const mediaItems = useMemo(() => {
    if (!chat) return [] as Array<{ id: string; type: "photo" | "video"; url?: string }>;
    const items: Array<{ id: string; type: "photo" | "video"; url?: string }> = [];
    chat.messages.forEach((message) => {
      if ((message.type === "photo" || message.type === "video") && message.mediaUrl) {
        items.push({ id: String(message.id), type: message.type, url: message.mediaUrl });
      }
      message.mediaGroupItems?.forEach((item) => {
        if ((item.type === "photo" || item.type === "video") && item.mediaUrl) {
          items.push({ id: String(item.id), type: item.type, url: item.mediaUrl });
        }
      });
    });
    return items.reverse();
  }, [chat?.messages]);

  const files = useMemo(() => {
    if (!chat) return [] as Array<{ id: string; name: string; url?: string }>;
    const items: Array<{ id: string; name: string; url?: string }> = [];
    chat.messages.forEach((message) => {
      if ((message.type === "document" || message.type === "audio") && message.fileName) {
        items.push({ id: String(message.id), name: message.fileName, url: message.mediaUrl });
      }
      message.mediaGroupItems?.forEach((item) => {
        if ((item.type === "document" || item.type === "audio") && item.fileName) {
          items.push({ id: String(item.id), name: item.fileName, url: item.mediaUrl });
        }
      });
    });
    return items.reverse();
  }, [chat?.messages]);

  const links = useMemo(() => {
    if (!chat) return [];
    const unique = new Set<string>();
    chat.messages.forEach((message) => {
      extractLinks(message.text).forEach((link) => unique.add(link));
      extractLinks(message.caption).forEach((link) => unique.add(link));
    });
    return Array.from(unique).reverse();
  }, [chat?.messages]);

  if (!chat) return null;

  const isGroup = chat.type === "group" || chat.type === "supergroup";
  const isChannel = chat.type === "channel";
  const membersList = Array.from(chat.members.values());
  const memberCount = chat.memberCount || chat.members.size;
  const canChangeAvatar = chat.type !== "private" && chat.permissions.canChangeInfo;
  const infoTitle = isChannel ? "Channel Info" : isGroup ? "Group Info" : "User Info";
  const subtitle = isChannel
    ? memberCount > 0 ? `${memberCount} subscribers` : "Channel"
    : isGroup
      ? memberCount > 0 ? `${memberCount} members` : "Group"
      : chat.username ? `@${chat.username}` : "Private chat";
  const publicLink = chat.username ? `t.me/${chat.username}` : undefined;

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (!photo) return;

    setAvatarError(null);
    setIsUpdatingAvatar(true);
    try {
      const response = await botService.setChatPhoto(chat.id, photo);
      if (!response.ok) throw new Error(response.description || "Could not change photo");
      const refreshed = await botService.getChat(chat.id);
      const avatarUrl = refreshed.ok && refreshed.result
        ? await getChatAvatarUrl(refreshed.result)
        : undefined;
      getOrCreateChat(chat.id, { avatarUrl: avatarUrl || URL.createObjectURL(photo) });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" title={infoTitle}>
          <MoreVertical className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showClose={false}
        overlayClassName="!bg-black/10 !backdrop-blur-none md:!bg-transparent"
        className="!left-auto !right-5 !top-5 !bottom-5 !translate-x-0 !translate-y-0 !w-[min(480px,calc(100vw-40px))] !max-w-none !rounded-[30px] border-white/5 bg-[#171717] p-0 text-white shadow-2xl overflow-hidden gap-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-[78px] shrink-0 items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/10">
                  <X className="h-7 w-7" />
                </Button>
              </DialogClose>
              <DialogTitle className="text-[25px] font-semibold">{infoTitle}</DialogTitle>
            </div>
            {chat.type !== "private" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full text-white hover:bg-white/10"
                onClick={() => canChangeAvatar && avatarInputRef.current?.click()}
                disabled={!canChangeAvatar || isUpdatingAvatar}
                title={canChangeAvatar ? "Edit" : "Administrator permission required"}
              >
                {isUpdatingAvatar ? <Loader2 className="h-6 w-6 animate-spin" /> : <Pencil className="h-6 w-6" />}
              </Button>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 pb-7">
              <div className="flex flex-col items-center pb-8 pt-5 text-center">
                <Avatar
                  src={chat.avatarUrl}
                  alt={chat.title}
                  fallback={chat.avatarText}
                  className="flex h-36 w-36 items-center justify-center rounded-full bg-[#8774e1] text-5xl font-semibold text-white"
                />
                <h2 className="mt-7 max-w-full truncate px-4 text-[28px] font-semibold leading-tight">{chat.title}</h2>
                <p className="mt-2 text-[17px] text-[#9a9a9a]">{subtitle}</p>
                {chat.description && (
                  <p className="mt-4 max-w-[390px] whitespace-pre-wrap text-sm leading-6 text-[#b9b9b9]">{chat.description}</p>
                )}
                {avatarError && <p className="mt-3 text-sm text-red-400">{avatarError}</p>}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="overflow-hidden rounded-[28px] bg-[#222222]">
                {publicLink ? (
                  <a href={`https://${publicLink}`} target="_blank" rel="noreferrer" className="flex min-h-[84px] items-center gap-5 px-6 hover:bg-white/[0.03]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff9500]">
                      <Link2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[19px] font-medium">{publicLink}</p>
                      <p className="mt-1 text-[15px] text-[#969696]">Link</p>
                    </div>
                    <QrCode className="h-7 w-7 text-white/85" />
                  </a>
                ) : (
                  <div className="flex min-h-[84px] items-center gap-5 px-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff9500]">
                      <Link2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[19px] font-medium">{chat.id}</p>
                      <p className="mt-1 text-[15px] text-[#969696]">Chat ID</p>
                    </div>
                  </div>
                )}
                <div className="mx-6 border-t border-white/5" />
                <button
                  type="button"
                  className="flex min-h-[84px] w-full items-center gap-5 px-6 text-left hover:bg-white/[0.03]"
                  onClick={() => setNotifications((value) => !value)}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff5b55]">
                    <Bell className="h-6 w-6 fill-white text-white" />
                  </div>
                  <span className="flex-1 text-[19px] font-medium">Notifications</span>
                  <span className={`relative h-8 w-14 rounded-full border-2 transition-colors ${notifications ? "border-[#8774e1] bg-[#8774e1]" : "border-[#7b7b7b]"}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-[#8c8c8c] transition-all ${notifications ? "left-7 bg-white" : "left-1"}`} />
                  </span>
                </button>
              </div>

              <Tabs defaultValue={isGroup ? "members" : "media"} className="mt-6">
                <TabsList className={`grid h-[58px] w-full rounded-[28px] bg-[#222222] p-1.5 ${isGroup ? "grid-cols-4" : "grid-cols-3"}`}>
                  {isGroup && (
                    <TabsTrigger value="members" className="rounded-[22px] text-[16px] data-[state=active]:bg-[#2c2938] data-[state=active]:text-[#9b83ff] data-[state=active]:shadow-none">
                      Members
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="media" className="rounded-[22px] text-[16px] data-[state=active]:bg-[#2c2938] data-[state=active]:text-[#9b83ff] data-[state=active]:shadow-none">Media</TabsTrigger>
                  <TabsTrigger value="files" className="rounded-[22px] text-[16px] data-[state=active]:bg-[#2c2938] data-[state=active]:text-[#9b83ff] data-[state=active]:shadow-none">Files</TabsTrigger>
                  <TabsTrigger value="links" className="rounded-[22px] text-[16px] data-[state=active]:bg-[#2c2938] data-[state=active]:text-[#9b83ff] data-[state=active]:shadow-none">Links</TabsTrigger>
                </TabsList>

                {isGroup && (
                  <TabsContent value="members" className="mt-6 rounded-[28px] bg-[#202020] p-3">
                    {membersList.length > 0 ? membersList.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                        <Avatar
                          src={member.avatarUrl}
                          alt={member.displayName}
                          fallback={member.avatarText}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6cbd4b] font-semibold text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[17px] font-medium">{member.displayName}</p>
                            {member.isCreator ? <Crown className="h-4 w-4 text-yellow-400" /> : member.isAdmin ? <Shield className="h-4 w-4 text-[#9b83ff]" /> : null}
                          </div>
                          <p className="mt-0.5 truncate text-sm text-[#969696]">{member.username ? `@${member.username}` : member.status || "member"}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center gap-3 py-10 text-[#969696]">
                        <Users className="h-9 w-9" />
                        <p>Member list has not been loaded yet.</p>
                      </div>
                    )}
                  </TabsContent>
                )}

                <TabsContent value="media" className="mt-6">
                  {mediaItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[24px]">
                      {mediaItems.map((item) => item.type === "photo" ? (
                        <img key={item.id} src={item.url} alt="Media" className="aspect-square w-full cursor-pointer object-cover" onClick={() => window.open(item.url, "_blank")} />
                      ) : (
                        <video key={item.id} src={item.url} controls className="aspect-square w-full object-cover" />
                      ))}
                    </div>
                  ) : <EmptyPane label="No media yet" />}
                </TabsContent>

                <TabsContent value="files" className="mt-6 rounded-[28px] bg-[#202020] p-3">
                  {files.length > 0 ? files.map((file) => (
                    <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8774e1]"><FileText className="h-6 w-6" /></div>
                      <span className="min-w-0 flex-1 truncate text-[16px]">{file.name}</span>
                    </a>
                  )) : <EmptyPane label="No files yet" />}
                </TabsContent>

                <TabsContent value="links" className="mt-6 rounded-[28px] bg-[#202020] p-3">
                  {links.length > 0 ? links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff9500]"><Link2 className="h-6 w-6" /></div>
                      <span className="min-w-0 flex-1 truncate text-[15px] text-[#bcaeff]">{link}</span>
                    </a>
                  )) : <EmptyPane label="No links yet" />}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
          {isGroup && chat.permissions.canInviteUsers && (
            <Button
              size="icon"
              className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-[#8875df] shadow-xl hover:bg-[#7865d2]"
              title="Add member"
            >
              <UserPlus className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyPane({ label }: { label: string }) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-[28px] bg-[#202020] text-[#969696]">
      {label}
    </div>
  );
}
