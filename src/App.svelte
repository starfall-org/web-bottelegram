<script lang="ts">
  import type { RichChat, RichMessage } from "./types/types";
  import { telegramStore } from "./stores/telegram";

  import Header from "./components/Header.svelte";
  import Settings from "./components/Settings.svelte";
  import ChatList from "./components/ChatList.svelte";
  import MessageList from "./components/MessageList.svelte";
  import MessageInput from "./components/MessageInput.svelte";
  import MembersOverlay from "./components/MembersOverlay.svelte";
  import ToastContainer from "./components/ToastContainer.svelte";

  const initializeBot = telegramStore.initializeBot;
  const selectChat = telegramStore.selectChat;
  const markRead = telegramStore.markRead;
  const enqueueToast = telegramStore.enqueueToast;
  const sendText = telegramStore.sendText;
  const sendMedia = telegramStore.sendMedia;
  const deleteMessage = telegramStore.deleteMessage;
  const clearReplyContext = telegramStore.clearReplyContext;
  const getTokenPrompt = telegramStore.getTokenPrompt;
  const setHasNewerMessages = telegramStore.setHasNewerMessages;
  const searchChat = telegramStore.searchChat;
  const fetchChatAdministrators = telegramStore.fetchChatAdministrators;
  const kickMember = telegramStore.kickMember;
  const toggleAdminStatus = telegramStore.toggleAdminStatus;
  const testConnection = telegramStore.testConnection;
  const deleteWebhook = telegramStore.deleteWebhook;
  const requestNotifications = telegramStore.requestNotifications;
  const setProxyBase = telegramStore.setProxyBase;
  const clearChatHistoryForToken = telegramStore.clearChatHistoryForToken;

  let token = $state(telegramStore.token);
  let proxyBase = $state(telegramStore.proxyBase);
  let chats = $state(telegramStore.chats);
  let currentChatId = $state(telegramStore.currentChatId);
  let replyTo = $state(telegramStore.replyTo);
  let toastQueue = $state(telegramStore.toastQueue);
  let botInfo = $state(telegramStore.botInfo);
  let isConnected = $state(telegramStore.isConnected);
  let showSidebar = $state(telegramStore.showSidebar);
  let showSettings = $state(telegramStore.showSettings);
  let hasNewerMessages = $state(telegramStore.hasNewerMessages);

  $effect(() => {
    token = telegramStore.token;
    proxyBase = telegramStore.proxyBase;
    chats = telegramStore.chats;
    currentChatId = telegramStore.currentChatId;
    replyTo = telegramStore.replyTo;
    toastQueue = telegramStore.toastQueue;
    botInfo = telegramStore.botInfo;
    isConnected = telegramStore.isConnected;
    showSidebar = telegramStore.showSidebar;
    showSettings = telegramStore.showSettings;
    hasNewerMessages = telegramStore.hasNewerMessages;
  });

  let messagesContainer = $state<HTMLDivElement | null>(null);
  let showMembersPanel = $state(false);

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

  const currentChat: RichChat | undefined = $derived(
    currentChatId ? chats.get(currentChatId.toString()) : undefined
  );
  const messagesForCurrentChat: RichMessage[] = $derived(
    currentChat?.messages || []
  );

  function renderMessagePreview(
    message: RichMessage | undefined
  ): string | null {
    if (!message) return null;
    if (message.type === "text") return message.text;
    if ("caption" in message && message.caption) return message.caption;
    if ("text" in message && (message as any).text)
      return (message as any).text;
    return `[${message.type}]`;
  }

  const replyPreview = $derived.by(() => {
    if (!replyTo || !currentChat) return null;
    const target = currentChat.messages.find((msg) => msg.id === replyTo);
    return renderMessagePreview(target);
  });

  function truncatePreview(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= 80) return trimmed;
    return `${trimmed.slice(0, 77)}…`;
  }

  const chatTiles = $derived.by(() => {
    return Array.from(chats.values())
      .sort((a, b) => b.lastDate - a.lastDate)
      .map((chat) => ({
        id: chat.id,
        name: chat.title,
        avatarText: chat.avatarText,
        lastMessage: chat.lastText ? truncatePreview(chat.lastText) : "",
        lastTimestamp: chat.lastDate,
        unread: chat.unread,
        hasNotification: chat.unread > 0,
      }));
  });

  const statusText = $derived.by(() => {
    if (!token) return "Token required";
    return isConnected ? "Connected" : "Disconnected";
  });

  const canShowMembers = $derived.by(() =>
    currentChat ? ["group", "supergroup"].includes(currentChat.type) : false
  );

  const activeChatMeta = $derived.by(() => {
    if (!currentChat) return null;
    return {
      id: currentChat.id,
      title: currentChat.title,
      avatarText: currentChat.avatarText,
      type: currentChat.type,
    };
  });

  const clearData = () => {
    if (token) {
      localStorage.removeItem(`telegram_${token}`);
      telegramStore.chats.clear();
      telegramStore.currentChatId = null;
      setHasNewerMessages(false);
    }
  };

  const handleScroll = () => {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom < 120) {
      setHasNewerMessages(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const handleSendMessage = (messageText: string) => {
    if (!messageText.trim() || !currentChatId) return;

    sendText(currentChatId, messageText, replyTo || undefined)
      .then(() => {
        clearReplyContext();
        setHasNewerMessages(false);
        requestAnimationFrame(() => scrollToBottom());
      })
      .catch(() => {
        // Errors are surfaced via toasts in the store
      });
  };

  const handleAttachment = (files: FileList | null) => {
    if (!files || files.length === 0 || !currentChatId) return;

    sendMedia(currentChatId, files, "", replyTo || undefined)
      .then(() => {
        clearReplyContext();
        setHasNewerMessages(false);
        requestAnimationFrame(() => scrollToBottom());
      })
      .catch(() => {
        // Errors are surfaced via toasts in the store
      });
  };

  const handleDeleteMessage = (messageId: number) => {
    if (!currentChatId) return;

    deleteMessage(currentChatId, messageId)
      .then(() => {
        setHasNewerMessages(false);
      })
      .catch(() => {
        // Errors are surfaced via toasts in the store
      });
  };

  const handleSelectChat = (chatId: number) => {
    selectChat(chatId);
    markRead(chatId);
    setHasNewerMessages(false);
    setTimeout(() => {
      scrollToBottom();
    }, 0);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      telegramStore.showSidebar = false;
    }
  };

  const handleSearchChat = async (query: string) => {
    await searchChat(query);
  };

  const toggleSidebar = () => {
    telegramStore.showSidebar = !telegramStore.showSidebar;
  };

  const toggleSettings = () => {
    telegramStore.showSettings = !telegramStore.showSettings;
    showSettings = !showSettings;
  };

  const toggleMembersPanel = () => {
    showMembersPanel = !showMembersPanel;
  };

  const jumpToLatest = () => {
    scrollToBottom();
    setHasNewerMessages(false);
  };

  $effect(() => {
    messagesForCurrentChat.length;
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom < 80) {
      requestAnimationFrame(() => {
        scrollToBottom();
        setHasNewerMessages(false);
      });
    }
  });
</script>

<div class="relative flex h-screen w-screen bg-slate-950 text-slate-100">
  {#if showSidebar}
    <div
      class="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 md:hidden"
      role="presentation"
      onclick={(event) => {
        if (event.target === event.currentTarget) toggleSidebar();
      }}
    ></div>
  {/if}

  <aside
    class={`fixed inset-y-0 left-0 z-40 flex w-full max-w-xs transform flex-col overflow-hidden border-r border-slate-900/60 bg-slate-950 shadow-2xl transition-transform duration-200 md:static md:max-w-sm md:translate-x-0 md:shadow-none ${
      showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    }`}
  >
    <ChatList
      chats={chatTiles}
      currentChat={currentChatId}
      selectChat={handleSelectChat}
      {showSidebar}
      {toggleSidebar}
      onSearch={handleSearchChat}
      searchDisabled={!isConnected}
    />
  </aside>

  <section class="flex flex-1 flex-col overflow-hidden">
    <Header
      {botInfo}
      {statusText}
      activeChat={activeChatMeta}
      {toggleSettings}
      {toggleSidebar}
      onToggleMembers={toggleMembersPanel}
      {canShowMembers}
    />

    <div class="relative flex flex-1 flex-col overflow-hidden bg-slate-900">
      <MessageList
        messages={messagesForCurrentChat}
        setContainer={(container: HTMLDivElement) => {
          messagesContainer = container;
        }}
        showScrollButton={false}
        {scrollToBottom}
        {handleScroll}
        onDeleteMessage={handleDeleteMessage}
      />

      <div class="border-t border-slate-800 bg-slate-900">
        <MessageInput
          sendMessage={handleSendMessage}
          {replyPreview}
          clearReply={clearReplyContext}
          disabled={!currentChatId || !isConnected}
          onAttach={handleAttachment}
        />
      </div>

      {#if hasNewerMessages && currentChatId}
        <button
          class="absolute bottom-28 right-6 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          onclick={jumpToLatest}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m5 10 7 7 7-7"
            />
          </svg>
          <span>New messages</span>
        </button>
      {/if}
    </div>
  </section>

  {#if showSettings}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <button
          class="absolute right-3 top-3 rounded-full bg-slate-800/80 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          onclick={toggleSettings}
          aria-label="Close settings"
        >
          ✕
        </button>
        <Settings
          {botInfo}
          {token}
          {proxyBase}
          {clearData}
          {testConnection}
          {deleteWebhook}
          {requestNotifications}
          {setProxyBase}
          {clearChatHistoryForToken}
        />
      </div>
    </div>
  {/if}

  <MembersOverlay
    visible={showMembersPanel}
    onClose={() => (showMembersPanel = false)}
    chatId={currentChatId}
    onFetchMembers={fetchChatAdministrators}
    onKickMember={kickMember}
    onToggleAdmin={toggleAdminStatus}
  />

  <ToastContainer toasts={toastQueue} />
</div>
