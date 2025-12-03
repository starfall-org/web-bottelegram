import React, { useState, useRef, useEffect } from "react";
import { useBotStore } from "@/store/botStore";
import { botService } from "@/services/botService";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Send, Paperclip, Smile, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputFile } from "grammy";

interface InputAreaProps {
  className?: string;
}

export function InputArea({ className }: InputAreaProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const chatActionTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [stickerFileId, setStickerFileId] = useState("");
  const [isSendingSticker, setIsSendingSticker] = useState(false);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);
  const stickerPanelRef = useRef<HTMLDivElement>(null);

  const [showFilePanel, setShowFilePanel] = useState(false);
  const filePanelRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSendingFiles, setIsSendingFiles] = useState(false);

  const {
    getCurrentActiveChatId,
    getCurrentChats,
    replyTo,
    setReplyTo,
    editingMessageId,
    setEditingMessageId,
    isConnected,
    addMessage,
    updateMessage,
    addRecentSticker,
    addFavoriteSticker,
    removeFavoriteSticker,
  } = useBotStore();

  const activeChatId = getCurrentActiveChatId();
  const chats = getCurrentChats();
  const activeChat = activeChatId ? chats?.get(activeChatId) : null;
  const recentStickers = useBotStore((s: any) => s.getRecentStickers());
  const favoriteStickers = useBotStore((s: any) => s.getFavoriteStickers());
  const replyMessage =
    replyTo && activeChat
      ? activeChat.messages.find((m: any) => m.id.toString() === replyTo)
      : null;

  const editingMsg =
    editingMessageId && activeChat
      ? activeChat.messages.find(
          (m: any) => m.id.toString() === editingMessageId
        )
      : null;

  useEffect(() => {
    if (editingMsg && editingMsg.text != null) {
      setMessage(editingMsg.text);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.min(textareaRef.current.scrollHeight, 120) + "px";
        textareaRef.current.focus();
      }
      setIsFocused(true);
    }
  }, [editingMessageId]);

  // Sync Telegram chat action "typing" while input is focused
  useEffect(() => {
    if (!isConnected || !activeChatId) return;

    // clear previous timer if any
    if (chatActionTimer.current) {
      clearInterval(chatActionTimer.current);
      chatActionTimer.current = null;
    }

    if (isFocused) {
      const send = () => {
        botService.sendChatAction(activeChatId, "typing");
      };
      // send immediately
      send();
      // keep alive every 4s
      chatActionTimer.current = window.setInterval(send, 4000);
    }

    return () => {
      if (chatActionTimer.current) {
        clearInterval(chatActionTimer.current);
        chatActionTimer.current = null;
      }
    };
  }, [isFocused, isConnected, activeChatId]);

  // Close popovers on outside click
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideSticker = stickerPanelRef.current?.contains(target);
      const insideFile = filePanelRef.current?.contains(target);
      if (showStickerPanel && !insideSticker) setShowStickerPanel(false);
      if (showFilePanel && !insideFile) setShowFilePanel(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [showStickerPanel, showFilePanel]);

  const handleSend = async () => {
    if (!message.trim() || !activeChatId || !isConnected) return;

    const textToSend = message.trim();

    // Edit existing message flow
    if (editingMessageId) {
      try {
        const msgId = parseInt(editingMessageId);
        const response = await botService.editMessageText(
          activeChatId,
          msgId,
          textToSend
        );
        if (response.ok) {
          updateMessage(activeChatId, msgId, { text: textToSend });
          setMessage("");
          setEditingMessageId(null);
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        } else {
          console.error("Failed to edit message:", response.description);
        }
      } catch (error) {
        console.error("Error editing message:", error);
      }
      return;
    }

    const replyToId = replyTo ? parseInt(replyTo) : undefined;

    setMessage("");
    setReplyTo(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await botService.sendMessage(activeChatId, textToSend, {
        reply_to_message_id: replyToId,
      });

      if (response.ok && response.result) {
        const sentMessage = response.result;
        const newMessage = {
          id: sentMessage.message_id,
          type: "text" as const,
          side: "right" as const,
          text: sentMessage.text || textToSend,
          date: sentMessage.date * 1000,
          fromId: sentMessage.from?.id,
          fromName: sentMessage.from?.first_name || t("chat.you"),
          reply_to: replyToId,
          reply_preview: replyMessage?.text?.substring(0, 50),
        };
        addMessage(activeChatId, newMessage);
      } else {
        console.error("Failed to send message:", response.description);

        setMessage(textToSend);
        if (replyTo) setReplyTo(replyTo);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message on failure
      setMessage(textToSend);
      if (replyTo) setReplyTo(replyTo);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";

    // Show typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
    }
  };

  const handleFileSelect = () => {
    if (!isConnected || !activeChatId) return;
    setShowFilePanel(true);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...selected]);
    // Reset input so selecting the same file again still triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  const sendSelectedFiles = async () => {
    if (!activeChatId || !isConnected || selectedFiles.length === 0) return;
    setIsSendingFiles(true);
    const replyToId = replyTo ? parseInt(replyTo) : undefined;

    try {
      for (const file of selectedFiles) {
        const mime = file.type || "";
        const lowerName = file.name.toLowerCase();
        const input = new InputFile(file, file.name);

        let response: any;

        if (mime.startsWith("image/")) {
          response = await botService.sendPhoto(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        } else if (mime.startsWith("video/")) {
          response = await botService.sendVideo(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        } else if (mime.startsWith("audio/")) {
          response = await botService.sendAudio(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        } else if (lowerName.endsWith(".webm")) {
          response = await botService.sendVideo(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        } else if (
          lowerName.endsWith(".mp3") ||
          lowerName.endsWith(".wav") ||
          lowerName.endsWith(".ogg")
        ) {
          response = await botService.sendAudio(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        } else {
          response = await botService.sendDocument(activeChatId, input, {
            reply_to_message_id: replyToId,
          });
        }

        if (response.ok && response.result) {
          const sent: any = response.result;

          let newMsg: any = {
            id: sent.message_id,
            side: "right" as const,
            date: sent.date * 1000,
            fromId: sent.from?.id,
            fromName: sent.from?.first_name || t("chat.you"),
            reply_to: replyToId,
            reply_preview: replyMessage?.text?.substring(0, 50),
          };

          if (sent.photo) {
            const photo = sent.photo[sent.photo.length - 1];
            let mediaUrl: string | undefined;
            try {
              const fileInfo = await botService.getFile(photo.file_id);
              if (fileInfo.ok && fileInfo.result?.file_path) {
                mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              }
            } catch {}
            newMsg = { ...newMsg, type: "photo" as const, mediaUrl };
          } else if (sent.video) {
            let mediaUrl: string | undefined;
            try {
              const fileInfo = await botService.getFile(sent.video.file_id);
              if (fileInfo.ok && fileInfo.result?.file_path) {
                mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              }
            } catch {}
            newMsg = {
              ...newMsg,
              type: "video" as const,
              mediaUrl,
              fileName: sent.video.file_name,
            };
          } else if (sent.audio) {
            let mediaUrl: string | undefined;
            try {
              const fileInfo = await botService.getFile(sent.audio.file_id);
              if (fileInfo.ok && fileInfo.result?.file_path) {
                mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              }
            } catch {}
            newMsg = {
              ...newMsg,
              type: "audio" as const,
              mediaUrl,
              fileName: sent.audio.file_name,
            };
          } else if (sent.document) {
            let mediaUrl: string | undefined;
            try {
              const fileInfo = await botService.getFile(sent.document.file_id);
              if (fileInfo.ok && fileInfo.result?.file_path) {
                mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              }
            } catch {}
            newMsg = {
              ...newMsg,
              type: "document" as const,
              mediaUrl,
              fileName: sent.document.file_name,
            };
          }

          addMessage(activeChatId, newMsg);
        } else {
          console.error("Failed to send file");
        }
      }
      clearSelectedFiles();
      setReplyTo(null);
      setShowFilePanel(false);
    } catch (err) {
      console.error("Error sending files:", err);
      alert("Có lỗi khi gửi tệp");
    } finally {
      setIsSendingFiles(false);
    }
  };

  const toggleStickerPanel = async () => {
    if (!isConnected || !activeChatId) return;
    setShowStickerPanel((prev) => !prev);
    try {
      await botService.sendChatAction(activeChatId, "choose_sticker");
    } catch {}
  };

  const isStickerFavorite = (fileId: string) =>
    Array.isArray(favoriteStickers) &&
    favoriteStickers.some((s: any) => s.file_id === fileId);

  const toggleFavoriteSticker = (sticker: any) => {
    if (!sticker?.file_id) return;
    if (isStickerFavorite(sticker.file_id)) {
      removeFavoriteSticker(sticker.file_id);
    } else {
      addFavoriteSticker({
        file_id: sticker.file_id,
        url: sticker.url,
        emoji: sticker.emoji,
        format: sticker.format || "unknown",
        addedAt: Date.now(),
        favorite: true,
      } as any);
    }
  };

  const handleSendStickerCore = async (fileId: string) => {
    if (!fileId || !activeChatId || !isConnected) return;
    setIsSendingSticker(true);
    try {
      const response = await botService.sendSticker(activeChatId, fileId);

      if (response.ok && response.result) {
        const sentMessage = response.result;
        let mediaUrl: string | undefined;
        let stickerFormat: string | undefined;

        try {
          if (sentMessage.sticker?.file_id) {
            const fileInfo = await botService.getFile(
              sentMessage.sticker.file_id
            );
            if (fileInfo.ok && fileInfo.result?.file_path) {
              mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              const fp = fileInfo.result.file_path.toLowerCase();
              if (fp.endsWith(".webm")) stickerFormat = "video";
              else if (fp.endsWith(".webp")) stickerFormat = "static";
              else if (fp.endsWith(".tgs")) stickerFormat = "animated";
            }
          }
        } catch {}

        // Save to recent stickers for reuse
        if (sentMessage.sticker?.file_id) {
          addRecentSticker({
            file_id: sentMessage.sticker.file_id,
            url: mediaUrl,
            emoji: sentMessage.sticker?.emoji,
            format: (stickerFormat as any) || "unknown",
            addedAt: Date.now(),
          });
        }

        const newMessage = {
          id: sentMessage.message_id,
          type: "sticker" as const,
          side: "right" as const,
          mediaUrl,
          stickerFormat,
          emoji: sentMessage.sticker?.emoji,
          date: sentMessage.date * 1000,
          fromId: sentMessage.from?.id,
          fromName: sentMessage.from?.first_name || t("chat.you"),
          reply_to: replyTo ? parseInt(replyTo) : undefined,
          reply_preview: replyMessage?.text?.substring(0, 50),
        };
        addMessage(activeChatId, newMessage);
        setReplyTo(null);
        setShowStickerPanel(false);
        setStickerFileId("");
      } else {
        console.error("Failed to send sticker:", response.description);
        alert(response.description || "Gửi sticker thất bại");
      }
    } catch (error) {
      console.error("Error sending sticker:", error);
      alert("Có lỗi khi gửi sticker");
    } finally {
      setIsSendingSticker(false);
    }
  };

  const handleSendStickerById = async () => {
    const id = stickerFileId.trim();
    if (!id) return;
    await handleSendStickerCore(id);
  };

  const handleSendStickerFromRecent = async (fileId: string) => {
    await handleSendStickerCore(fileId);
  };

  const handleStickerFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChatId || !isConnected) return;

    const file = files[0];
    setIsSendingSticker(true);

    try {
      const input = new InputFile(file, file.name);
      const response = await botService.sendSticker(activeChatId, input);

      if (response.ok && response.result) {
        const sentMessage = response.result;
        let mediaUrl: string | undefined;
        let stickerFormat: string | undefined;

        try {
          if (sentMessage.sticker?.file_id) {
            const fileInfo = await botService.getFile(
              sentMessage.sticker.file_id
            );
            if (fileInfo.ok && fileInfo.result?.file_path) {
              mediaUrl = botService.getFileUrl(fileInfo.result.file_path);
              const fp = fileInfo.result.file_path.toLowerCase();
              if (fp.endsWith(".webm")) stickerFormat = "video";
              else if (fp.endsWith(".webp")) stickerFormat = "static";
              else if (fp.endsWith(".tgs")) stickerFormat = "animated";
            }
          }
        } catch {}

        // Save to recent
        if (sentMessage.sticker?.file_id) {
          addRecentSticker({
            file_id: sentMessage.sticker.file_id,
            url: mediaUrl,
            emoji: sentMessage.sticker?.emoji,
            format: (stickerFormat as any) || "unknown",
            addedAt: Date.now(),
          });
        }

        const newMessage = {
          id: sentMessage.message_id,
          type: "sticker" as const,
          side: "right" as const,
          mediaUrl,
          stickerFormat,
          emoji: sentMessage.sticker?.emoji,
          date: sentMessage.date * 1000,
          fromId: sentMessage.from?.id,
          fromName: sentMessage.from?.first_name || t("chat.you"),
          reply_to: replyTo ? parseInt(replyTo) : undefined,
          reply_preview: replyMessage?.text?.substring(0, 50),
        };
        addMessage(activeChatId, newMessage);
        setReplyTo(null);
        setShowStickerPanel(false);
        if (stickerFileInputRef.current) {
          stickerFileInputRef.current.value = "";
        }
      } else {
        console.error("Failed to send sticker:", response.description);
        alert(response.description || "Gửi sticker thất bại");
      }
    } catch (error) {
      console.error("Error sending sticker file:", error);
      alert("Có lỗi khi gửi sticker");
    } finally {
      setIsSendingSticker(false);
    }
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div
      className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      {/* Reply Context */}
      {replyTo && replyMessage && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("chat.replyingTo")}
            </p>
            <p className="text-sm truncate">{replyMessage.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelReply}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {editingMessageId && editingMsg && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{t("chat.editing")}</p>
            <p className="text-sm truncate">{editingMsg.text}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingMessageId(null)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="relative flex items-end gap-2 p-3 md:p-4">
        <div
          className={cn(
            "flex items-end gap-2 w-full bg-card/60 border rounded-2xl px-2 py-2 shadow-sm transition-all",
            isFocused
              ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
              : "hover:shadow-md"
          )}
        >
          {/* Attach Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileSelect}
            disabled={!isConnected || !activeChatId}
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                editingMessageId
                  ? t("chat.editing")
                  : !isConnected
                  ? t("chat.disconnected")
                  : !activeChatId
                  ? t("chat.selectChat")
                  : t("chat.typeMessage")
              }
              disabled={!isConnected || !activeChatId}
              className={cn(
                "w-full min-h-[40px] max-h-[120px] px-0 py-1 bg-transparent text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "resize-none"
              )}
              rows={1}
            />
          </div>

          {/* Sticker/Emoji Button */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!isConnected || !activeChatId}
            className="shrink-0"
            onClick={toggleStickerPanel}
            aria-pressed={showStickerPanel}
            aria-label="Sticker"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !isConnected || !activeChatId}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* File Panel */}
        {showFilePanel && (
          <div
            ref={filePanelRef}
            className="absolute bottom-16 left-4 z-20 w-96 rounded-2xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-xl p-3 animate-slideIn"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Tệp đã chọn</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isConnected || !activeChatId || isSendingFiles}
                >
                  Thêm tệp
                </Button>
                <Button
                  size="sm"
                  onClick={sendSelectedFiles}
                  disabled={
                    selectedFiles.length === 0 ||
                    !isConnected ||
                    !activeChatId ||
                    isSendingFiles
                  }
                >
                  {isSendingFiles ? "Đang gửi..." : "Gửi tệp"}
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-auto space-y-2">
              {selectedFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Chưa có tệp nào. Nhấn "Thêm tệp" để chọn.
                </p>
              ) : (
                selectedFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {((f.size || 0) / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeSelectedFile(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelectedFiles}
                  disabled={isSendingFiles}
                >
                  Xóa hết
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sticker Panel */}
        {showStickerPanel && (
          <div
            ref={stickerPanelRef}
            className="absolute bottom-16 right-4 z-20 w-80 rounded-2xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-xl p-3 animate-slideIn"
          >
            <Tabs defaultValue="recent" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="recent">Gần đây</TabsTrigger>
                <TabsTrigger value="favorite">Ưa thích</TabsTrigger>
                <TabsTrigger value="id">File ID</TabsTrigger>
                <TabsTrigger value="upload">Tải lên</TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="mt-3">
                {recentStickers && recentStickers.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {recentStickers.map((s: any) => {
                      const isFav = isStickerFavorite(s.file_id);
                      return (
                        <div key={s.file_id} className="relative">
                          <button
                            className="border rounded-lg p-1 flex items-center justify-center hover:bg-muted/80 transition-colors h-16 w-full"
                            onClick={() => handleSendStickerFromRecent(s.file_id)}
                            disabled={isSendingSticker || !isConnected || !activeChatId}
                            title={s.emoji || ""}
                          >
                            {s.format === "static" && s.url ? (
                              <img
                                src={s.url}
                                alt={s.emoji || "sticker"}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : s.format === "video" && s.url ? (
                              <video
                                src={s.url}
                                autoPlay
                                loop
                                muted
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <span className="text-3xl">{s.emoji || "✨"}</span>
                            )}
                          </button>
                          <button
                            className="absolute top-1 right-1 p-1 rounded bg-background/80 border hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteSticker({ ...s });
                            }}
                            title={isFav ? "Bỏ ưa thích" : "Thêm vào ưa thích"}
                          >
                            <span className="sr-only">Favorite</span>
                            <Star className={`h-4 w-4 ${isFav ? "text-yellow-500" : "opacity-50"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Chưa có sticker gần đây. Hãy gửi một sticker để lưu lại.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="favorite" className="mt-3">
                {favoriteStickers && favoriteStickers.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {favoriteStickers.map((s: any) => {
                      return (
                        <div key={s.file_id} className="relative">
                          <button
                            className="border rounded-lg p-1 flex items-center justify-center hover:bg-muted/80 transition-colors h-16 w-full"
                            onClick={() => handleSendStickerFromRecent(s.file_id)}
                            disabled={isSendingSticker || !isConnected || !activeChatId}
                            title={s.emoji || ""}
                          >
                            {s.format === "static" && s.url ? (
                              <img
                                src={s.url}
                                alt={s.emoji || "sticker"}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : s.format === "video" && s.url ? (
                              <video
                                src={s.url}
                                autoPlay
                                loop
                                muted
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <span className="text-3xl">{s.emoji || "✨"}</span>
                            )}
                          </button>
                          <button
                            className="absolute top-1 right-1 p-1 rounded bg-background/80 border hover:bg-background"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteSticker(s);
                            }}
                            title="Bỏ ưa thích"
                          >
                            <span className="sr-only">Unfavorite</span>
                            <Star className="h-4 w-4 text-yellow-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Chưa có sticker ưa thích.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="id" className="mt-3 space-y-2">
                <Label htmlFor="sticker-id-input" className="text-xs">
                  Nhập file_id sticker
                </Label>
                <Input
                  id="sticker-id-input"
                  placeholder="Ví dụ: CAACAgIAAxkBA..."
                  value={stickerFileId}
                  onChange={(e) => setStickerFileId(e.target.value)}
                  disabled={!isConnected || !activeChatId || isSendingSticker}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSendStickerById}
                    disabled={
                      !stickerFileId.trim() ||
                      !isConnected ||
                      !activeChatId ||
                      isSendingSticker
                    }
                  >
                    {isSendingSticker ? "Đang gửi..." : "Gửi sticker"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-3 space-y-2">
                <Label className="text-xs">Chọn file .webp, .webm, .tgs</Label>
                <input
                  ref={stickerFileInputRef}
                  type="file"
                  accept=".webp,.webm,image/webp,video/webm,.tgs,application/x-tgsticker"
                  onChange={handleStickerFileChange}
                  disabled={!isConnected || !activeChatId || isSendingSticker}
                />
                <p className="text-[10px] text-muted-foreground">
                  Hỗ trợ: static (.webp), video (.webm), animated (.tgs).
                  Sticker không hiển thị sẽ dùng emoji thay thế.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,video/*,audio/*,document/*"
        />
      </div>

      {/* Typing Indicator */}
      {isFocused && isConnected && activeChatId && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">{t("chat.composing")}</p>
        </div>
      )}
    </div>
  );
}
