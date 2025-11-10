<script lang="ts">
  import type { BotInfo } from "../types/types";
  import { Menu, Settings2, Users } from "lucide-svelte";

  type ActiveChatMeta = {
    id: string;
    title: string;
    avatarText?: string;
    type: string;
  };

  let {
    botInfo,
    statusText,
    activeChat,
    toggleSettings,
    toggleSidebar,
    onToggleMembers,
    canShowMembers,
  }: {
    botInfo: BotInfo | null;
    statusText: string;
    activeChat: ActiveChatMeta | null;
    toggleSettings: () => void;
    toggleSidebar: () => void;
    onToggleMembers: () => void;
    canShowMembers: boolean;
  } = $props();

  const displayTitle = $derived(() => activeChat?.title ?? "Select a chat");
  const displayInitials = $derived(() => activeChat?.avatarText ?? "?");
  const botDescription = $derived(() => {
    if (!botInfo) return "Bot disconnected";
    const username = botInfo.username
      ? `@${botInfo.username}`
      : botInfo.first_name;
    return `${username} • ID ${botInfo.id}`;
  });
  const statusVariant = $derived(() => {
    const text = statusText?.toLowerCase() ?? "";
    if (text.includes("token")) return "bg-slate-500";
    if (text.includes("connected") && !text.includes("disconnected"))
      return "bg-emerald-500";
    if (text.includes("disconnected") || text.includes("error"))
      return "bg-rose-500";
    return "bg-amber-400";
  });
</script>

<header
  class="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3"
>
  <div class="flex min-w-0 items-center gap-3">
    <button
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:bg-slate-800 md:hidden"
      onclick={toggleSidebar}
      aria-label="Toggle sidebar"
    >
      <Menu class="h-5 w-5" />
    </button>

    <div
      class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold uppercase text-slate-100"
    >
      {displayInitials}
    </div>

    <div class="flex min-w-0 flex-col">
      <span class="truncate text-sm font-semibold text-white md:text-base">
        {displayTitle}
      </span>
      <div class="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <span
          class={`inline-flex h-2 w-2 rounded-full ${statusVariant}`}
          aria-hidden="true"
        ></span>
        <span class="truncate">{statusText}</span>
      </div>
    </div>
  </div>

  <div class="flex items-center gap-2 md:gap-3">
    {#if canShowMembers}
      <div class="flex items-center gap-2">
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:bg-slate-800 md:hidden"
          onclick={onToggleMembers}
          aria-label="Open members panel"
        >
          <Users class="h-5 w-5" />
        </button>
        <button
          class="hidden items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white md:flex"
          onclick={onToggleMembers}
          aria-label="Open members panel"
        >
          <Users class="h-4 w-4" />
          Members
        </button>
      </div>
    {/if}

    <div
      class="hidden min-w-0 flex-col text-right text-xs text-slate-400 lg:flex"
    >
      <span class="truncate">{botDescription}</span>
    </div>

    <button
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:bg-slate-800"
      onclick={toggleSettings}
      aria-label="Open settings"
    >
      <Settings2 class="h-5 w-5" />
    </button>
  </div>
</header>
