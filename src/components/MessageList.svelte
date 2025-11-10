<script lang="ts">
  import type { RichMessage } from "../types/types";

  let {
    messages,
    setContainer,
    showScrollButton,
    scrollToBottom,
    handleScroll,
  }: {
    messages: RichMessage[];
    setContainer: (container: HTMLDivElement) => void;
    showScrollButton: boolean;
    scrollToBottom: () => void;
    handleScroll: () => void;
  } = $props();

  let messagesContainer: HTMLDivElement;

  $effect(() => {
    if (messagesContainer) {
      setContainer(messagesContainer);
    }
  });

  function renderMessageContent(message: RichMessage) {
    switch (message.type) {
      case "text":
        return message.text;
      case "photo":
        return `<img src="${message.mediaUrl}" alt="Photo" class="max-w-full rounded-xl border border-slate-800/70 shadow-md" />${
          message.caption ? `<p class="mt-2 text-sm text-slate-200">${message.caption}</p>` : ""
        }`;
      case "video":
        return `<video src="${message.mediaUrl}" controls class="max-w-full rounded-xl border border-slate-800/70 shadow-md" />${
          message.caption ? `<p class="mt-2 text-sm text-slate-200">${message.caption}</p>` : ""
        }`;
      case "audio":
      case "voice":
        return `<audio src="${message.mediaUrl}" controls class="w-full" />${
          message.caption ? `<p class="mt-2 text-sm text-slate-200">${message.caption}</p>` : ""
        }`;
      case "document":
        return `<a href="${message.mediaUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-900/80 p-3 text-sm text-slate-100 transition hover:border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="truncate">${message.fileName || "Document"}</span>
          </a>${message.caption ? `<p class="mt-2 text-sm text-slate-200">${message.caption}</p>` : ""}`;
      case "sticker":
        if (message.stickerFormat === "webp") {
          return `<img src="${message.mediaUrl}" alt="${message.emoji || "Sticker"}" class="max-w-[8rem] rounded-lg" />`;
        }
        if (message.stickerFormat === "webm") {
          return `<video src="${message.mediaUrl}" autoplay loop muted playsinline class="max-w-[8rem] rounded-lg" />`;
        }
        return `<span class="text-2xl">${message.emoji || "📎"}</span>`;
      default:
        return "[Unsupported message type]";
    }
  }
</script>

<div
  class="relative flex-1 overflow-y-auto bg-slate-900 px-4 py-6"
  bind:this={messagesContainer}
  onscroll={handleScroll}
>
  {#if messages.length === 0}
    <div class="py-10 text-center text-sm text-slate-500">
      Select a chat to load messages.
    </div>
  {/if}

  {#each messages as message}
    <div
      class={`mb-5 max-w-[min(78%,32rem)] ${message.side === "right" ? "ml-auto" : ""}`}
    >
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

      <div
        class={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
          message.side === "right"
            ? "bg-blue-600 text-white"
            : "bg-slate-800/80 text-slate-100"
        }`}
      >
        {@html renderMessageContent(message)}
      </div>
    </div>
  {/each}

  {#if showScrollButton}
    <button
      class="fixed bottom-28 right-6 rounded-full bg-slate-800 p-3 text-white shadow-lg transition hover:bg-slate-700"
      onclick={scrollToBottom}
      aria-label="Scroll to bottom"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  {/if}
</div>
