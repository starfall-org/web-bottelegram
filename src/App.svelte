<script lang="ts">
  import { onMount } from "svelte";
  import type { RichChat, RichMessage } from "./types/types";
  import { telegramStore } from "./stores/telegram";
  import { showNotification } from "./utils/botUtils";

  import Header from "./components/Header.svelte";
  import Settings from "./components/Settings.svelte";
  import ChatList from "./components/ChatList.svelte";
  import MessageList from "./components/MessageList.svelte";
  import MessageInput from "./components/MessageInput.svelte";
  import ToastContainer from "./components/ToastContainer.svelte";

  // Get store values
  const initializeBot = telegramStore.initializeBot;
  const selectChat = telegramStore.selectChat;
  const markRead = telegramStore.markRead;
  const enqueueToast = telegramStore.enqueueToast;
  const dismissToast = telegramStore.dismissToast;
  const clearToasts = telegramStore.clearToasts;
  const sendText = telegramStore.sendText;
  const clearReplyContext = telegramStore.clearReplyContext;
  const setReplyContext = telegramStore.setReplyContext;
  const getTokenPrompt = telegramStore.getTokenPrompt;

  // Reactive state variables
  let token = $state(telegramStore.token);
  let proxyBase = $state(telegramStore.proxyBase);
  let chats = $state(telegramStore.chats);
  let currentChatId = $state(telegramStore.currentChatId);
  let replyTo = $state(telegramStore.replyTo);
  let toastQueue = telegramStore.toastQueue; // Direct reference to store state
  let botInfo = $state(telegramStore.botInfo);
  let isConnected = $state(telegramStore.isConnected);
  let showSidebar = $state(telegramStore.showSidebar);
  let showSettings = $state(telegramStore.showSettings);

  let messagesContainer = $state<HTMLDivElement | null>(null);

  // Initialize token and bot on mount
  $effect(() => {
    if (!token) {
      try {
        getTokenPrompt();
      } catch (error) {
        console.error("Failed to get token:", error);
      }
    } else {
      initializeBot();
    }
  });

  // Handle browser notifications for important toasts
  $effect(() => {
    const recentToasts = toastQueue.slice(-3); // Only handle recent toasts
    recentToasts.forEach((toast) => {
      // Show browser notification for important toast types
      if (toast.type === 'error' || toast.type === 'warning' || toast.type === 'success') {
        showNotification(toast.title, toast.body);
      }
    });
  });

  // Get current chat and messages
  const currentChat: RichChat | undefined = $derived(
    currentChatId ? chats.get(currentChatId) : undefined
  );
  const messagesForCurrentChat: RichMessage[] = $derived(
    currentChat?.messages || []
  );

  // Convert rich chats to simple chat format for ChatList component
  const simpleChats = $derived(
    Array.from(chats.values()).map((chat) => ({
      id: chat.id,
      name: chat.title,
      unread: chat.unread,
      hasNotification: chat.unread > 0,
    }))
  );

  const sendMessage = (messageText: string) => {
    if (!messageText.trim() || !currentChatId) return;

    sendText(currentChatId, messageText, replyTo || undefined);
    clearReplyContext();
    scrollToBottom();
  };

  const clearData = () => {
    if (token) {
      localStorage.removeItem(`telegram_${token}`);
      // Clear the store state
      telegramStore.chats.clear();
      telegramStore.currentChatId = null;
    }
  };

  const handleScroll = () => {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    // Show scroll button logic could be added here if needed
  };

  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const toggleSidebar = () => {
    telegramStore.showSidebar = !telegramStore.showSidebar;
  };

  const toggleSettings = () => {
    telegramStore.showSettings = !telegramStore.showSettings;
  };
</script>

<div class="flex flex-col h-screen max-h-screen max-w-screen overflow-hidden">
  <Header {botInfo} {toggleSettings} {toggleSidebar} />

  {#if telegramStore.showSettings}
    <Settings {botInfo} {token} {clearData} />
  {/if}

  <div class="flex flex-1 overflow-hidden">
    <ChatList
      chats={simpleChats}
      currentChat={currentChatId || ""}
      selectChat={selectChat}
      showSidebar={telegramStore.showSidebar}
      toggleSidebar={() => (telegramStore.showSidebar = !telegramStore.showSidebar)}
    />

    <div
      class="flex-1 flex flex-col min-h-0 max-w-full md:max-w-[calc(100vw-16rem)]"
    >
      <MessageList
        messages={messagesForCurrentChat}
        setContainer={(container: HTMLDivElement) => {
          messagesContainer = container;
        }}
        showScrollButton={false}
        {scrollToBottom}
        {handleScroll}
      />
      <MessageInput {sendMessage} />
    </div>
  </div>
  
  <!-- Toast Container -->
  <ToastContainer toasts={toastQueue} />
</div>
