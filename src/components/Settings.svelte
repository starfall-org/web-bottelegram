<script lang="ts">
  import type { BotInfo } from "../types/types";

  let {
    botInfo,
    token,
    proxyBase,
    clearData,
    testConnection,
    deleteWebhook,
    requestNotifications,
    setProxyBase,
    clearChatHistoryForToken,
  }: {
    botInfo: BotInfo | null;
    token: string;
    proxyBase: string;
    clearData: () => void;
    testConnection: () => Promise<string>;
    deleteWebhook: () => Promise<boolean>;
    requestNotifications: () => Promise<boolean>;
    setProxyBase: (proxy: string) => void;
    clearChatHistoryForToken: () => void;
  } = $props();

  let newToken = $state(token);
  let newProxyBase = $state(proxyBase);
  let isTestingConnection = $state(false);
  let isDeletingWebhook = $state(false);
  let isRequestingNotif = $state(false);
  let isClearingData = $state(false);

  const updateToken = () => {
    localStorage.setItem("token", newToken);
    window.location.reload();
  };

  const handleTestConnection = async () => {
    isTestingConnection = true;
    try {
      await testConnection();
    } catch (error) {
      // Error toast is shown by store
    } finally {
      isTestingConnection = false;
    }
  };

  const handleDeleteWebhook = async () => {
    isDeletingWebhook = true;
    try {
      await deleteWebhook();
    } catch (error) {
      // Error toast is shown by store
    } finally {
      isDeletingWebhook = false;
    }
  };

  const handleRequestNotifications = async () => {
    isRequestingNotif = true;
    try {
      await requestNotifications();
    } catch (error) {
      // Error toast is shown by store
    } finally {
      isRequestingNotif = false;
    }
  };

  const handleProxyChange = () => {
    setProxyBase(newProxyBase);
  };

  const handleClearData = () => {
    isClearingData = true;
    try {
      clearChatHistoryForToken();
      clearData();
    } catch (error) {
      // Error toast is shown by store
    } finally {
      isClearingData = false;
    }
  };
</script>

<div class="flex flex-col gap-6 bg-slate-900 px-6 py-6 text-slate-100 max-h-[80vh] overflow-y-auto">
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
    <h2 class="text-lg font-semibold text-white">Bot token</h2>
    <p class="mt-2 text-sm text-slate-400">
      Update your bot token (from BotFather). The app will reload with the new token.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <input
        class="flex-1 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        type="password"
        placeholder="Enter new bot token..."
        bind:value={newToken}
      />
      <button
        class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={updateToken}
      >
        Update token
      </button>
    </div>
  </section>

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Proxy settings</h2>
    <p class="mt-2 text-sm text-slate-400">
      Optional CORS proxy prefix (e.g., https://cors.isomorphic-git.org/). Leave empty to use direct Telegram API.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <input
        class="flex-1 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        type="text"
        placeholder="Proxy URL (optional)"
        bind:value={newProxyBase}
      />
      <button
        class="inline-flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
        onclick={handleProxyChange}
      >
        Save proxy
      </button>
    </div>

    <div class="mt-3 text-xs text-slate-500">
      Changes take effect immediately. The bot will reinitialize with the new proxy settings.
    </div>
  </section>

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Connection testing</h2>
    <p class="mt-2 text-sm text-slate-400">
      Test your bot connection to Telegram API.
    </p>

    <div class="mt-4 flex gap-2">
      <button
        class="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleTestConnection}
        disabled={isTestingConnection}
      >
        {isTestingConnection ? "Testing..." : "Test connection"}
      </button>
    </div>
  </section>

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Webhook management</h2>
    <p class="mt-2 text-sm text-slate-400">
      If you receive error 409 when polling, the webhook might still be active. Delete it below.
    </p>

    <div class="mt-4 flex gap-2">
      <button
        class="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleDeleteWebhook}
        disabled={isDeletingWebhook}
      >
        {isDeletingWebhook ? "Deleting..." : "Delete webhook"}
      </button>
    </div>
  </section>

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Browser notifications</h2>
    <p class="mt-2 text-sm text-slate-400">
      Enable browser notifications to receive alerts for new messages.
    </p>

    <div class="mt-4 flex gap-2">
      <button
        class="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleRequestNotifications}
        disabled={isRequestingNotif}
      >
        {isRequestingNotif ? "Requesting..." : "Enable notifications"}
      </button>
    </div>
  </section>

  <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner">
    <h2 class="text-lg font-semibold text-white">Data management</h2>
    <p class="mt-2 text-sm text-slate-400">
      Removes local chat history stored for this bot token. This action cannot be undone.
    </p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <button
        class="inline-flex items-center justify-center rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-400 transition hover:border-red-500 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleClearData}
        disabled={isClearingData}
      >
        {isClearingData ? "Clearing..." : "Clear all data"}
      </button>
      <div class="flex-1 text-xs text-slate-500">
        Permanently removes chat history, messages, and cached files.
      </div>
    </div>
  </section>
</div>
