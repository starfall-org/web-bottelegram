<script lang="ts">
  import type { BotInfo } from "../types/types";

  let {
    botInfo,
    token,
    clearData,
  }: {
    botInfo: BotInfo | null;
    token: string;
    clearData: () => void;
  } = $props();

  let newToken = $state(token);

  const updateToken = () => {
    localStorage.setItem("token", newToken);
    window.location.reload();
  };
</script>

<div class="flex flex-col gap-6 bg-slate-900 px-6 py-6 text-slate-100">
  {#if botInfo}
    <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
      <h2 class="text-lg font-semibold text-white">Bot information</h2>
      <dl class="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">ID</dt>
          <dd class="mt-1 text-slate-100">{botInfo.id}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Name</dt>
          <dd class="mt-1 text-slate-100">{botInfo.first_name}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Username</dt>
          <dd class="mt-1 text-slate-100">@{botInfo.username}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Can join groups</dt>
          <dd class="mt-1 text-slate-100">{botInfo.can_join_groups ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Read group messages</dt>
          <dd class="mt-1 text-slate-100">{botInfo.can_read_all_group_messages ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </section>
  {/if}

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Connection</h2>
    <p class="mt-2 text-sm text-slate-400">
      Update your bot token or clear cached chat history for a fresh start.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <input
        class="flex-1 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        type="text"
        placeholder="Enter new bot token..."
        bind:value={newToken}
      />
      <button
        class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        onclick={updateToken}
      >
        Update token
      </button>
    </div>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <button
        class="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        onclick={clearData}
      >
        Clear data
      </button>
      <div class="flex-1 text-xs text-slate-500">
        Removes local chat history stored for this bot token.
      </div>
    </div>
  </section>
</div>
