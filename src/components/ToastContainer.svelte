<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Toast } from "../types/types";
  import {
    X,
    Info,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
  } from "lucide-svelte";

  let { toasts }: { toasts: Toast[] } = $props();

  // Auto-dismiss timers
  const timers = new Map<string, number>();

  // Icon mapping for toast types
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  // Color mapping for toast types
  const colors = {
    info: "bg-blue-500 border-blue-600 text-white",
    success: "bg-green-500 border-green-600 text-white",
    warning: "bg-yellow-500 border-yellow-600 text-white",
    error: "bg-red-500 border-red-600 text-white",
  };

  $effect(() => {
    // Set up auto-dismiss timers for existing toasts
    toasts.forEach((toast) => {
      if (!timers.has(toast.id)) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration || 5000);
        timers.set(toast.id, timer);
      }
    });

    // Clean up timers for toasts that no longer exist
    for (const [id, timer] of timers.entries()) {
      if (!toasts.find((t) => t.id === id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }
  });

  const removeToast = (id: string) => {
    const index = toasts.findIndex((toast) => toast.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
    }

    // Clean up timer
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  };

  const handleMouseEnter = (toastId: string) => {
    // Pause auto-dismiss on hover
    const timer = timers.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(toastId);
    }
  };

  const handleMouseLeave = (toast: Toast) => {
    // Resume auto-dismiss when mouse leaves
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 5000);
    timers.set(toast.id, timer);
  };

  onDestroy(() => {
    // Clean up all timers on component destroy
    timers.forEach((timer) => clearTimeout(timer));
  });
</script>

<div
  class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
>
  {#each toasts as toast (toast.id)}
    {@const IconComponent = icons[toast.type]}
    {@const colorClass = colors[toast.type]}

    <div
      class="pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm min-w-[300px] transform transition-all duration-300 ease-in-out {colorClass}"
      class:animate-pulse={toast.type === "warning"}
      onmouseenter={() => handleMouseEnter(toast.id)}
      onmouseleave={() => handleMouseLeave(toast)}
      role="alert"
      aria-live="polite"
    >
      <IconComponent class="w-5 h-5 flex-shrink-0 mt-0.5" />

      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-sm leading-tight break-words">
          {toast.title}
        </h4>
        {#if toast.body}
          <p class="text-sm opacity-90 mt-1 leading-tight break-words">
            {toast.body}
          </p>
        {/if}
      </div>

      <button
        type="button"
        class="flex-shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-current"
        onclick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    div {
      transition: none !important;
      animation: none !important;
    }
  }

  @media (max-width: 640px) {
    div {
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
      max-width: none;
    }

    div > div {
      min-width: auto;
      width: 100%;
    }
  }
</style>
