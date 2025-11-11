<script lang="ts">
  import type { Chat } from "../types/types";
  import ChatSearch from "./ChatSearch.svelte";

  let {
    chats,
    currentChat,
    selectChat,
    showSidebar,
    toggleSidebar,
    onSearch,
    searchDisabled = false,
  }: {
    chats: Chat[];
    currentChat: number|null;
    selectChat: (id: number) => void;
    showSidebar: boolean;
    toggleSidebar: () => void;
    onSearch?: (query: string) => Promise<void>;
    searchDisabled?: boolean;
  } = $props();

  function formatTimestamp(timestamp?: number): string {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();

    if (isSameDay) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    return date.toLocaleDateString();
  }

  const handleSelect = (chatId: number) => {
    selectChat(chatId);
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 768 &&
      showSidebar
    ) {
      toggleSidebar();
    }
  };
</script>

<div class="flex h-full flex-col bg-slate-950">
  <div class="border-b border-slate-900/60">
    {#if onSearch}
      <ChatSearch {onSearch} disabled={searchDisabled} />
    {:else}
      {#snippet scs()}
        <div class="px-4 py-3 text-sm text-slate-500">Search coming soon.</div>
      {/snippet}
      {@render scs()}
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if chats.length === 0}
      <div class="px-4 py-6 text-center text-sm text-slate-500">
        No conversations yet. Messages will appear here once they arrive.
      </div>
    {:else}
      {#each chats as chat}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <button
          class={`group relative flex w-full items-center gap-3 border-b border-slate-900/60 px-4 py-3 text-left transition ${
            currentChat === chat.id ? "bg-slate-900" : "hover:bg-slate-900/60"
          }`}
          onclick={() => handleSelect(chat.id)}
          aria-pressed={currentChat === chat.id}
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold uppercase text-slate-100"
          >
            {chat.avatarText ?? "?"}
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-slate-100">
                {chat.name}
              </span>
              <span class="ml-auto text-xs text-slate-500">
                {formatTimestamp(chat.lastTimestamp)}
              </span>
            </div>
            <span
              class={`truncate text-xs ${chat.unread ? "text-slate-200" : "text-slate-400"}`}
            >
              {chat.lastMessage || "No messages yet"}
            </span>
          </div>

          {#if chat.unread}
            <span
              class="ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-semibold text-white"
            >
              {chat.unread}
            </span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>
</div>
