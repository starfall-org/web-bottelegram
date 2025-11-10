<script lang="ts">
  import type { RichMessage } from "../types/types";
  import { Trash2 } from "lucide-svelte";

  let {
    message,
    onDelete,
  }: {
    message: RichMessage;
    onDelete: (messageId: number) => void;
  } = $props();

  function renderMessageContent(message: RichMessage) {
    switch (message.type) {
      case "text":
        return message.text;
      case "photo":
        return `<img src="${message.mediaUrl}" alt="Photo" class="max-w-full rounded-xl border border-slate-800/70 shadow-md" />${
          message.caption ? `<p class="mt-2 text-sm text-inherit">${escapeHtml(message.caption)}</p>` : ""
        }`;
      case "video":
        return `<video src="${message.mediaUrl}" controls class="max-w-full rounded-xl border border-slate-800/70 shadow-md" />${
          message.caption ? `<p class="mt-2 text-sm text-inherit">${escapeHtml(message.caption)}</p>` : ""
        }`;
      case "audio":
      case "voice":
        return `<audio src="${message.mediaUrl}" controls class="w-full" />${
          message.caption ? `<p class="mt-2 text-sm text-inherit">${escapeHtml(message.caption)}</p>` : ""
        }`;
      case "document":
        return `<a href="${message.mediaUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-900/80 p-3 text-sm text-slate-100 transition hover:border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="truncate">${escapeHtml(message.fileName || "Document")}</span>
          </a>${message.caption ? `<p class="mt-2 text-sm text-inherit">${escapeHtml(message.caption)}</p>` : ""}`;
      case "sticker":
        if (message.stickerFormat === "webp") {
          return `<img src="${message.mediaUrl}" alt="${escapeHtml(message.emoji || "Sticker")}" class="max-w-[8rem] rounded-lg" />`;
        }
        if (message.stickerFormat === "webm") {
          return `<video src="${message.mediaUrl}" autoplay loop muted playsinline class="max-w-[8rem] rounded-lg" />`;
        }
        return `<span class="text-2xl">${escapeHtml(message.emoji || "📎")}</span>`;
      default:
        return "[Unsupported message type]";
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function handleDelete() {
    if (confirm("Delete this message?")) {
      onDelete(message.id);
    }
  }
</script>

<div class={`mb-5 max-w-[min(78%,32rem)] ${message.side === "right" ? "ml-auto" : ""}`}>
  <div
    class={`mb-1 flex items-center gap-2 text-xs ${
      message.side === "right" ? "justify-end text-slate-400" : "text-slate-500"
    }`}
  >
    <span class="truncate font-medium">{message.fromName}</span>
    <span>{new Date(message.date).toLocaleString()}</span>
  </div>

  {#if message.reply_preview}
    <div
      class={`mb-2 rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 ${
        message.side === "right" ? "text-right" : "text-left"
      }`}
    >
      <div class="font-semibold text-slate-200">Replying to</div>
      <div class="truncate">{message.reply_preview}</div>
    </div>
  {/if}

  <div class="relative group">
    <div
      class={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
        message.side === "right"
          ? "bg-blue-600 text-white"
          : "bg-slate-800/80 text-slate-100"
      }`}
    >
      {@html renderMessageContent(message)}
    </div>

    {#if message.side === "right"}
      <button
        class="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded-full"
        onclick={handleDelete}
        aria-label="Delete message"
        title="Delete message"
      >
        <Trash2 class="h-4 w-4 text-red-400" />
      </button>
    {/if}
  </div>
</div>
