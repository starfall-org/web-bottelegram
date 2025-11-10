<script lang="ts">
  import { Search } from "lucide-svelte";

  let {
    onSearch,
    disabled = false,
  }: {
    onSearch: (query: string) => Promise<void>;
    disabled?: boolean;
  } = $props();

  let searchQuery = $state("");
  let isSearching = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    isSearching = true;
    try {
      await onSearch(query);
      searchQuery = "";
    } finally {
      isSearching = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  const handleInput = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };
</script>

<div class="flex items-center gap-2 px-4 py-3 border-b border-slate-900/60">
  <div class="relative flex-1">
    <input
      type="text"
      placeholder="Search by ID or @username..."
      bind:value={searchQuery}
      onkeydown={handleKeyDown}
      oninput={handleInput}
      disabled={disabled || isSearching}
      class="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Search chat by ID or username"
    />
    <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
  </div>

  <button
    class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    onclick={handleSearch}
    disabled={disabled || isSearching || !searchQuery.trim()}
    aria-label="Search chat"
  >
    {#if isSearching}
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
    {:else}
      <Search class="h-5 w-5" />
    {/if}
  </button>
</div>
