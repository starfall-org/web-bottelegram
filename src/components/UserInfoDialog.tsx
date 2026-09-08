import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Bell, FileText, Link2, MessageCircle, QrCode, User, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { botService } from "@/services/botService";
import { getUserAvatarUrl } from "@/lib/telegramAvatar";

interface UserInfoDialogProps {
  userId: number;
  userName: string;
  username?: string;
  children: ReactNode;
}

const extractLinks = (text?: string) => text?.match(/https?:\/\/[^\s<>()]+/gi) || [];

export function UserInfoDialog({ userId, userName, username, children }: UserInfoDialogProps) {
  const { setActiveChatId, getCurrentChats, isConnected, getOrCreateChat } = useBotStore();
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [profileUsername, setProfileUsername] = useState(username);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [notifications, setNotifications] = useState(false);
  const chats = getCurrentChats();
  const idStr = String(userId);
  const userChat = chats?.get(idStr);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [chatResult, avatar] = await Promise.all([
          isConnected ? botService.getChat(userId) : Promise.resolve({ ok: false } as any),
          getUserAvatarUrl(userId),
        ]);
        if (cancelled) return;
        if (avatar) setAvatarUrl(avatar);
        if (chatResult.ok && chatResult.result) {
          const info: any = chatResult.result;
          const title =
            `${info.first_name || ""} ${info.last_name || ""}`.trim() ||
            info.username ||
            userName;
          setProfileName(title);
          setProfileUsername(info.username || username);
          getOrCreateChat(idStr, {
            type: "private",
            title,
            avatarText: title.charAt(0).toUpperCase(),
            username: info.username || username,
            avatarUrl: avatar || userChat?.avatarUrl,
          });
        }
      } catch (error) {
        console.warn("Failed to load user info:", error);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [open, userId, username, isConnected]);

  const media = useMemo(() => {
    if (!userChat) return [] as Array<{ id: string; type: "photo" | "video"; url: string }>;
    const items: Array<{ id: string; type: "photo" | "video"; url: string }> = [];
    userChat.messages.forEach((message) => {
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
  }, [userChat?.messages]);

  const files = useMemo(() => {
    if (!userChat) return [] as Array<{ id: string; name: string; url?: string }>;
    const items: Array<{ id: string; name: string; url?: string }> = [];
    userChat.messages.forEach((message) => {
      if (message.type === "document" && message.fileName) {
        items.push({ id: String(message.id), name: message.fileName, url: message.mediaUrl });
      }
      message.mediaGroupItems?.forEach((item) => {
        if (item.type === "document" && item.fileName) {
          items.push({ id: String(item.id), name: item.fileName, url: item.mediaUrl });
        }
      });
    });
    return items.reverse();
  }, [userChat?.messages]);

  const links = useMemo(() => {
    const result = new Set<string>();
    userChat?.messages.forEach((message) => {
      extractLinks(message.text).forEach((link) => result.add(link));
      extractLinks(message.caption).forEach((link) => result.add(link));
    });
    return Array.from(result).reverse();
  }, [userChat?.messages]);

  const handleOpenChat = async () => {
    const existingChat = chats?.get(idStr);
    if (existingChat) {
      setActiveChatId(idStr);
      setOpen(false);
      return;
    }

    let title = profileName || userName || `User ${idStr}`;
    getOrCreateChat(idStr, {
      type: "private",
      title,
      avatarText: title.charAt(0).toUpperCase(),
      username: profileUsername,
      avatarUrl,
    });
    setActiveChatId(idStr);
    setOpen(false);
  };

  const publicLink = profileUsername ? `t.me/${profileUsername}` : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showClose={false}
        overlayClassName="!bg-black/10 !backdrop-blur-none md:!bg-transparent"
        className="!left-auto !right-5 !top-5 !bottom-5 !translate-x-0 !translate-y-0 !w-[min(480px,calc(100vw-40px))] !max-w-none !rounded-[30px] border-white/5 bg-[#171717] p-0 text-white shadow-2xl overflow-hidden gap-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-[78px] shrink-0 items-center gap-5 px-6">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white hover:bg-white/10">
                <X className="h-7 w-7" />
              </Button>
            </DialogClose>
            <DialogTitle className="text-[25px] font-semibold">User Info</DialogTitle>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 pb-7">
              <div className="flex flex-col items-center pb-8 pt-5 text-center">
                <Avatar
                  src={avatarUrl || userChat?.avatarUrl}
                  alt={profileName}
                  fallback={(profileName || "U").charAt(0).toUpperCase()}
                  className="flex h-36 w-36 items-center justify-center rounded-full bg-[#8774e1] text-5xl font-semibold text-white"
                />
                <h2 className="mt-7 max-w-full truncate px-4 text-[28px] font-semibold leading-tight">{profileName}</h2>
                <p className="mt-2 text-[17px] text-[#9a9a9a]">{profileUsername ? `@${profileUsername}` : "User"}</p>
              </div>

              <div className="overflow-hidden rounded-[28px] bg-[#222222]">
                {publicLink ? (
                  <a href={`https://${publicLink}`} target="_blank" rel="noreferrer" className="flex min-h-[84px] items-center gap-5 px-6 hover:bg-white/[0.03]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff9500]"><Link2 className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[19px] font-medium">{publicLink}</p>
                      <p className="mt-1 text-[15px] text-[#969696]">Link</p>
                    </div>
                    <QrCode className="h-7 w-7 text-white/85" />
                  </a>
                ) : (
                  <div className="flex min-h-[84px] items-center gap-5 px-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff9500]"><Link2 className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[19px] font-medium">{idStr}</p>
                      <p className="mt-1 text-[15px] text-[#969696]">User ID</p>
                    </div>
                  </div>
                )}
                <div className="mx-6 border-t border-white/5" />
                <button type="button" onClick={handleOpenChat} className="flex min-h-[84px] w-full items-center gap-5 px-6 text-left hover:bg-white/[0.03]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8774e1]"><MessageCircle className="h-6 w-6" /></div>
                  <div className="flex-1">
                    <p className="text-[19px] font-medium">Message</p>
                    <p className="mt-1 text-[15px] text-[#969696]">Open private chat</p>
                  </div>
                </button>
                <div className="mx-6 border-t border-white/5" />
                <button type="button" onClick={() => setNotifications((value) => !value)} className="flex min-h-[84px] w-full items-center gap-5 px-6 text-left hover:bg-white/[0.03]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff5b55]"><Bell className="h-6 w-6 fill-white text-white" /></div>
                  <span className="flex-1 text-[19px] font-medium">Notifications</span>
                  <span className={`relative h-8 w-14 rounded-full border-2 transition-colors ${notifications ? "border-[#8774e1] bg-[#8774e1]" : "border-[#7b7b7b]"}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full transition-all ${notifications ? "left-7 bg-white" : "left-1 bg-[#8c8c8c]"}`} />
                  </span>
                </button>
              </div>

              <Tabs defaultValue="media" className="mt-6">
                <TabsList className="grid h-[58px] w-full grid-cols-3 rounded-[28px] bg-[#222222] p-1.5">
                  {(["media", "files", "links"] as const).map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="rounded-[22px] text-[16px] capitalize data-[state=active]:bg-[#2c2938] data-[state=active]:text-[#9b83ff] data-[state=active]:shadow-none">{tab}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="media" className="mt-6">
                  {media.length ? (
                    <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[24px]">
                      {media.map((item) => item.type === "photo" ? (
                        <img key={item.id} src={item.url} alt="Media" className="aspect-square w-full cursor-pointer object-cover" onClick={() => window.open(item.url, "_blank")} />
                      ) : <video key={item.id} src={item.url} controls className="aspect-square w-full object-cover" />)}
                    </div>
                  ) : <InfoEmpty icon={<User className="h-8 w-8" />} label="No media yet" />}
                </TabsContent>
                <TabsContent value="files" className="mt-6 rounded-[28px] bg-[#202020] p-3">
                  {files.length ? files.map((file) => (
                    <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8774e1]"><FileText className="h-6 w-6" /></div>
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    </a>
                  )) : <InfoEmpty icon={<FileText className="h-8 w-8" />} label="No files yet" />}
                </TabsContent>
                <TabsContent value="links" className="mt-6 rounded-[28px] bg-[#202020] p-3">
                  {links.length ? links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff9500]"><Link2 className="h-6 w-6" /></div>
                      <span className="min-w-0 flex-1 truncate text-[#bcaeff]">{link}</span>
                    </a>
                  )) : <InfoEmpty icon={<Link2 className="h-8 w-8" />} label="No links yet" />}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoEmpty({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-[28px] bg-[#202020] text-[#969696]">{icon}<span>{label}</span></div>;
}
