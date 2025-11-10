<script lang="ts">
  import { Paperclip, Send, X } from "lucide-svelte";

  let {
    sendMessage,
    replyPreview,
    clearReply,
    disabled,
    onAttach,
  }: {
    sendMessage: (messageText: string) => void;
    replyPreview: string | null;
    clearReply: () => void;
    disabled: boolean;
    onAttach: () => void;
  } = $props();

  let messageText: string = $state("");

  const triggerSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || disabled) return;
    sendMessage(trimmed);
    messageText = "";
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      triggerSend();
    }
  };
</script>

<div class="px-4 py-3">
  {#if replyPreview}
    <div class="mb-3 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
      <div class="flex-1">
        <span class="text-[11px] uppercase tracking-wide text-slate-500">Replying to</span>
        <p class="mt-1 overflow-hidden text-sm text-slate-200" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          {replyPreview}
        </p>
      </div>
      <button
        class="mt-1 rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        onclick={clearReply}
        aria-label="Cancel reply"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  {/if}

  <div class="flex items-end gap-3">
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      onclick={onAttach}
      disabled={disabled}
      aria-label="Attach file"
    >
      <Paperclip class="h-5 w-5" />
    </button>

    <div class="relative flex-1">
      <textarea
        class="h-11 w-full resize-none rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        rows={1}
        placeholder={disabled ? "Select a chat to start messaging" : "Write a message..."}
        bind:value={messageText}
        onkeydown={handleKeyDown}
        disabled={disabled}
      ></textarea>
    </div>

    <button
      class="inline-flex h-11 min-w-[3rem] items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      onclick={triggerSend}
      disabled={disabled || !messageText.trim()}
      aria-label="Send message"
    >
      <Send class="h-5 w-5" />
    </button>
  </div>
</div>
