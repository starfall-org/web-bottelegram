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

  // Helper to render message content based on type
  function renderMessageContent(message: RichMessage) {
    switch (message.type) {
      case "text":
        return message.text;
      case "photo":
        return `<img src="${message.mediaUrl}" alt="Photo" class="max-w-full rounded-lg shadow-sm" />${message.caption ? `<p class="mt-2 text-sm">${message.caption}</p>` : ""}`;
      case "video":
        return `<video src="${message.mediaUrl}" controls class="max-w-full rounded-lg shadow-sm" />${message.caption ? `<p class="mt-2 text-sm">${message.caption}</p>` : ""}`;
      case "audio":
        return `<audio src="${message.mediaUrl}" controls class="w-full" />${message.caption ? `<p class="mt-2 text-sm">${message.caption}</p>` : ""}`;
      case "voice":
        return `<audio src="${message.mediaUrl}" controls class="w-full" />${message.caption ? `<p class="mt-2 text-sm">${message.caption}</p>` : ""}`;
      case "document":
        return `<a href="${message.mediaUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>${message.fileName || "Document"}</a>${message.caption ? `<p class="mt-2 text-sm">${message.caption}</p>` : ""}`;
      case "sticker":
        if (message.stickerFormat === "webp") {
          return `<img src="${message.mediaUrl}" alt="${message.emoji || 'Sticker'}" class="max-w-32 h-auto" />`;
        } else if (message.stickerFormat === "webm") {
          return `<video src="${message.mediaUrl}" autoplay loop muted playsinline class="max-w-32 h-auto" />`;
        } else {
          return `<span class="text-2xl">${message.emoji || "📎"}</span>`;
        }
      default:
        return "[Unsupported message type]";
    }
  }
</script>

<div
  class="flex-1 overflow-y-auto p-4 bg-gray-100 relative"
  bind:this={messagesContainer}
  onscroll={handleScroll}
>
  {#each messages as message}
    <div
      class="mb-4 {message.side === 'right' ? 'ml-auto' : ''}"
      style="max-width: 70%"
    >
      <div
        class="flex items-center mb-1 {message.side === 'right' ? 'justify-end' : ''}"
      >
        <span
          class="font-bold {message.side === 'right'
            ? 'text-blue-600'
            : 'text-green-600'}"
        >
          {message.fromName}
        </span>
        <span class="text-gray-500 text-sm ml-2">
          {new Date(message.date).toLocaleString()}
        </span>
      </div>
      
      <!-- Reply preview -->
      {#if message.reply_preview}
        <div class="mb-1 p-2 bg-gray-50 border-l-2 border-gray-300 rounded text-sm text-gray-600">
          <div class="font-medium">Replying to:</div>
          <div class="truncate">{message.reply_preview}</div>
        </div>
      {/if}
      
      <!-- Message content -->
      <div
        class="p-3 rounded-lg shadow-sm break-words overflow-wrap-anywhere {message.side === 'right'
          ? 'bg-blue-100'
          : 'bg-white'}"
      >
        {@html renderMessageContent(message)}
      </div>
    </div>
  {/each}

  {#if showScrollButton}
    <button
      class="fixed bottom-24 right-8 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700"
      onclick={scrollToBottom}
      aria-label="Scroll to bottom"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
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
