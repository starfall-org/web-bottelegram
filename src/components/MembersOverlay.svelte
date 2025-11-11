<script lang="ts">
  import { onMount } from "svelte";
  import type { RenderedMember } from "../types/types";
  import { Trash2, Shield, ShieldOff, X } from "lucide-svelte";

  interface Props {
    visible: boolean;
    onClose: () => void;
    chatId: number | null;
    onFetchMembers: (chatId: number) => Promise<RenderedMember[]>;
    onKickMember: (
      chatId: number,
      userId: number,
      name: string
    ) => Promise<void>;
    onToggleAdmin: (
      chatId: number,
      userId: number,
      promote: boolean,
      name: string
    ) => Promise<void>;
  }

  let {
    visible,
    onClose,
    chatId,
    onFetchMembers,
    onKickMember,
    onToggleAdmin,
  }: Props = $props();

  let members = $state<RenderedMember[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state("");
  let actionInProgress = $state(false);
  let overlayElement = $state<HTMLDivElement | null>(null);

  onMount(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  });

  $effect(() => {
    if (visible && chatId) {
      loadMembers();
    }
  });

  const loadMembers = async () => {
    if (!chatId) return;

    isLoading = true;
    errorMessage = "";
    members = [];

    try {
      const fetchedMembers = await onFetchMembers(chatId);
      members = fetchedMembers;
    } catch (error: any) {
      console.error("Error fetching members:", error);
      errorMessage =
        error?.message ||
        "Failed to load members. Bot may not have admin rights.";
    } finally {
      isLoading = false;
    }
  };

  const handleKickMember = async (member: RenderedMember) => {
    if (member.status === "creator") return;
    if (actionInProgress) return;

    const confirmed = confirm(`Kick ${member.name} from the group?`);
    if (!confirmed || !chatId) return;

    actionInProgress = true;
    try {
      await onKickMember(chatId, member.id, member.name);
      // Refresh the list after action
      await loadMembers();
    } catch (error) {
      console.error("Error kicking member:", error);
    } finally {
      actionInProgress = false;
    }
  };

  const handleToggleAdmin = async (member: RenderedMember) => {
    if (member.status === "creator") return;
    if (actionInProgress) return;

    const isAdmin = member.status === "administrator";
    const action = isAdmin ? "demote" : "promote";

    if (!chatId) return;

    actionInProgress = true;
    try {
      await onToggleAdmin(chatId, member.id, !isAdmin, member.name);
      // Refresh the list after action
      await loadMembers();
    } catch (error) {
      console.error(`Error to ${action} member:`, error);
    } finally {
      actionInProgress = false;
    }
  };
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8"
    role="dialog"
    aria-modal="true"
    onclick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
    bind:this={overlayElement}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
      onclick={(event) => event.stopPropagation()}
    >
      <!-- Header -->
      <div class="border-b border-slate-800 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Members</h2>
          <button
            class="rounded-full bg-slate-800/80 p-1.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            onclick={onClose}
            aria-label="Close members panel"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="max-h-96 overflow-y-auto px-6 py-4">
        {#if isLoading}
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div
                class="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500 mx-auto"
              ></div>
              <p class="text-sm text-slate-400">Loading members...</p>
            </div>
          </div>
        {:else if errorMessage}
          <div
            class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {errorMessage}
          </div>
        {:else if members.length === 0}
          <div class="text-center py-8">
            <p class="text-sm text-slate-400">No members found</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each members as member (member.id)}
              <div
                class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3 hover:bg-slate-800/60 transition"
              >
                <div class="flex-1">
                  <div class="font-medium text-white">
                    {member.name}
                    {#if member.username}
                      <span class="text-xs text-slate-400"
                        >@{member.username}</span
                      >
                    {/if}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">{member.badge}</div>
                </div>

                {#if member.status !== "creator"}
                  <div class="flex items-center gap-1 ml-3">
                    <button
                      class="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-700 text-slate-300 transition hover:bg-blue-600 hover:border-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onclick={() => handleToggleAdmin(member)}
                      disabled={actionInProgress}
                      title={member.status === "administrator"
                        ? "Demote"
                        : "Promote"}
                      aria-label={member.status === "administrator"
                        ? "Demote member"
                        : "Promote member"}
                    >
                      {#if member.status === "administrator"}
                        <ShieldOff class="h-4 w-4" />
                      {:else}
                        <Shield class="h-4 w-4" />
                      {/if}
                    </button>

                    <button
                      class="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-700 text-slate-300 transition hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onclick={() => handleKickMember(member)}
                      disabled={actionInProgress}
                      title="Kick member"
                      aria-label="Kick member"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div
            class="mt-4 text-xs text-slate-500 text-center border-t border-slate-800 pt-3"
          >
            {members.length} member{members.length !== 1 ? "s" : ""} displayed
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-slate-800 px-6 py-3 flex justify-end">
        <button
          class="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
          onclick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
