<script lang="ts">
  import type { RichMessage } from "../types/types";
  import MessageBubble from "./MessageBubble.svelte";

  let {
    messages,
    setContainer,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    onDeleteMessage,
  }: {
    messages: RichMessage[];
    setContainer: (container: HTMLDivElement) => void;
    showScrollButton: boolean;
    scrollToBottom: () => void;
    handleScroll: () => void;
    onDeleteMessage: (messageId: number) => void;
  } = $props();

  let messagesContainer: HTMLDivElement;

  $effect(() => {
    if (messagesContainer) {
      setContainer(messagesContainer);
    }
  });
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

  {#each messages as message (message.id)}
    <MessageBubble 
      message={message}
      onDelete={onDeleteMessage}
    />
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
