"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { AlertCircle, Edit3, WifiOff } from "lucide-react";
import CommandPalette from "./CommandPalette";
import Sidebar from "./orbital/Sidebar";
import ThreadListPanel, {
  MobileBottomNav,
  MobileHeader,
  ScheduledPanel,
  SnoozedPanel,
} from "./orbital/ThreadList";
import ThreadDetail from "./orbital/ThreadDetail";
import ComposeModal from "./orbital/ComposeModal";
import ShortcutsModal from "./orbital/ShortcutsModal";
import PanelErrorBoundary from "./orbital/ErrorBoundary";
import {
  EmptyThreadState,
  LoadingView,
  SettingsView,
  SignInView,
} from "./orbital/Views";
import { DEMO_ACCOUNTS, DEMO_THREADS } from "./orbital/demo-data";
import {
  buildRealAccounts,
  mapGmailToThreads,
  mapThreadStatusFromLabels,
  mergeThreadClassifications,
  parseFromField,
  shouldClassifyThread,
  stripHtmlAndDecode,
} from "./orbital/helpers";
import {
  loadScheduled,
  loadSnoozed,
  saveScheduled,
  saveSnoozed,
} from "./orbital/storage";

function applyLabelMutation(labelIds = [], addLabelIds = [], removeLabelIds = []) {
  const next = new Set(labelIds);
  removeLabelIds.forEach((label) => next.delete(label));
  addLabelIds.forEach((label) => next.add(label));
  return Array.from(next);
}

export default function Orbital() {
  const { data: session, status: authStatus } = useSession();

  const [threads, setThreads] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("inbox");
  const [mobilePanel, setMobilePanel] = useState("list");

  const [composeDraft, setComposeDraft] = useState(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gmailError, setGmailError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [classifyLoading, setClassifyLoading] = useState(false);

  const [snoozedThreads, setSnoozedThreads] = useState(() => loadSnoozed());
  const [scheduledMessages, setScheduledMessages] = useState(() => loadScheduled());

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiSearch, setAiSearch] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const composeOpen = Boolean(composeDraft);
  const isDemoRef = useRef(false);
  const classifyRunRef = useRef(0);

  useEffect(() => {
    isDemoRef.current = isDemo;
  }, [isDemo]);

  const activeThread = useMemo(() => {
    return (
      threads.find((thread) => thread.id === activeId) ||
      searchResults?.find((thread) => thread.id === activeId) ||
      null
    );
  }, [activeId, searchResults, threads]);

  // Update browser tab title with unread count so you know at a glance.
  useEffect(() => {
    const unread = threads.filter((t) => t.status === "needs_response").length;
    document.title = unread > 0 ? `(${unread}) Orbital` : "Orbital";
  }, [threads]);

  useEffect(() => {
    if (!activeId) return;
    const inThreads = threads.some((thread) => thread.id === activeId);
    const inSearch = searchResults?.some((thread) => thread.id === activeId);
    if (!inThreads && !inSearch) {
      setActiveId(null);
      setMobilePanel("list");
    }
  }, [activeId, searchResults, threads]);

  async function fetchLinkedAccountsSafe() {
    try {
      const response = await fetch("/api/linked-accounts");
      if (!response.ok) return [];
      const data = await response.json();
      return data.accounts || [];
    } catch {
      return [];
    }
  }

  async function classifyThreads(nextThreads) {
    const candidates = nextThreads
      .filter(shouldClassifyThread)
      .slice(0, 20)
      .map((thread) => ({
        id: thread.id,
        sender:
          thread.participants[0]?.name ||
          thread.participants[0]?.email ||
          "Unknown sender",
        subject: thread.subject,
        snippet: thread.preview,
      }));

    if (!candidates.length) {
      setClassifyLoading(false);
      setThreads((current) =>
        current.map((thread) =>
          thread._classifying ? { ...thread, _classifying: false } : thread
        )
      );
      return;
    }

    const runId = ++classifyRunRef.current;
    setClassifyLoading(true);

    try {
      const response = await fetch("/api/gmail/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads: candidates }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "AI triage unavailable");
      }

      if (runId !== classifyRunRef.current) return;
      setThreads((current) => mergeThreadClassifications(current, data.classifications || []));
    } catch (error) {
      if (runId !== classifyRunRef.current) return;
      console.error("Classification error:", error);
      setThreads((current) =>
        current.map((thread) =>
          thread._classifying ? { ...thread, _classifying: false } : thread
        )
      );
    } finally {
      if (runId === classifyRunRef.current) {
        setClassifyLoading(false);
      }
    }
  }

  async function refreshInbox() {
    if (!session?.access_token) return;

    setLoading(true);
    setGmailError(null);

    try {
      const [linkedAccounts, response] = await Promise.all([
        fetchLinkedAccountsSafe(),
        fetch("/api/gmail/messages?maxResults=25"),
      ]);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Gmail error ${response.status}`);
      }

      const data = await response.json();
      const nextAccounts = buildRealAccounts(session.user, linkedAccounts);
      const mappedThreads = mapGmailToThreads(data.messages || [], nextAccounts)
        .sort((left, right) => right.lastActivityTs - left.lastActivityTs)
        .map((thread) =>
          shouldClassifyThread(thread) && !isDemoRef.current
            ? { ...thread, _classifying: true }
            : thread
        );

      setAccounts(nextAccounts);
      setThreads(mappedThreads);

      if (!isDemoRef.current) {
        void classifyThreads(mappedThreads);
      } else {
        setClassifyLoading(false);
      }
    } catch (error) {
      setGmailError(error.message || "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query) {
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setActiveSearchQuery(query);

    try {
      const params = new URLSearchParams({ q: query });
      if (aiSearch) params.set("naturalLanguage", "true");

      const response = await fetch(`/api/gmail/search?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Search error ${response.status}`);
      }

      const mapped = mapGmailToThreads(data.messages || [], accounts).sort(
        (left, right) => right.lastActivityTs - left.lastActivityTs
      );

      setSearchResults(mapped);
      setSearchError(null);
    } catch (error) {
      setSearchError(error.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setSearchResults(null);
    setSearchError(null);
    setSearchLoading(false);
    setActiveSearchQuery("");
    setSearch("");
  }

  function openCompose(prefill = {}) {
    setComposeDraft({
      key: Date.now(),
      to: prefill.to || "",
      subject: prefill.subject || "",
      body: prefill.body || "",
      accountId: prefill.accountId || "",
    });
  }

  function closeCompose() {
    setComposeDraft(null);
  }

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "authenticated" && session?.error === "RefreshAccessTokenError") {
      setShowSignIn(true);
      setGmailError("Session expired. Please sign in again.");
      return;
    }

    if (authStatus === "authenticated" && session?.access_token) {
      setIsDemo(false);
      setShowSignIn(false);
      void refreshInbox();
      return;
    }

    if (authStatus === "unauthenticated") {
      setShowSignIn(true);
      setThreads([]);
      setAccounts([]);
    }
  }, [
    authStatus,
    session?.access_token,
    session?.error,
    session?.user?.email,
    session?.user?.name,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    function checkTimedItems() {
      const now = Date.now();
      const snoozed = loadSnoozed();
      const dueThreads = snoozed.filter((item) => item.snoozeUntil <= now);

      if (dueThreads.length > 0) {
        const remaining = snoozed.filter((item) => item.snoozeUntil > now);
        saveSnoozed(remaining);
        setSnoozedThreads(remaining);
        setThreads((current) => {
          const ids = new Set(current.map((thread) => thread.id));
          const toAdd = dueThreads
            .filter((item) => !ids.has(item.thread.id))
            .map((item) => ({
              ...item.thread,
              lastActivityTs: now,
              lastActivity: "Just now",
            }));
          return toAdd.length ? [...toAdd, ...current] : current;
        });
      }

      if (isDemoRef.current) return;

      const scheduled = loadScheduled();
      const dueMessages = scheduled.filter(
        (message) => message.status === "pending" && message.scheduledAt <= now
      );

      dueMessages.forEach((message) => {
        fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: message.to,
            subject: message.subject,
            body: message.body,
            fromEmail: message.fromEmail,
            ...(message.replyToMessageId
              ? { replyToMessageId: message.replyToMessageId }
              : {}),
          }),
        })
          .then((response) => {
            setScheduledMessages((current) => {
              const next = current.map((entry) =>
                entry.id === message.id
                  ? { ...entry, status: response.ok ? "sent" : "failed" }
                  : entry
              );
              saveScheduled(next);
              return next;
            });
          })
          .catch(() => {
            setScheduledMessages((current) => {
              const next = current.map((entry) =>
                entry.id === message.id ? { ...entry, status: "failed" } : entry
              );
              saveScheduled(next);
              return next;
            });
          });
      });
    }

    checkTimedItems();
    const interval = window.setInterval(checkTimedItems, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function handleSnooze(threadId, snoozeUntil) {
    const thread =
      threads.find((entry) => entry.id === threadId) ||
      searchResults?.find((entry) => entry.id === threadId);
    if (!thread) return;

    const next = [...snoozedThreads, { threadId, snoozeUntil, thread }];
    setSnoozedThreads(next);
    saveSnoozed(next);
    setThreads((current) => current.filter((entry) => entry.id !== threadId));
    setSearchResults((current) =>
      Array.isArray(current) ? current.filter((entry) => entry.id !== threadId) : current
    );
    setActiveId(null);
    if (mobilePanel === "detail") setMobilePanel("list");
  }

  function handleUnsnooze(threadId) {
    const item = snoozedThreads.find((entry) => entry.threadId === threadId);
    if (!item) return;

    const next = snoozedThreads.filter((entry) => entry.threadId !== threadId);
    setSnoozedThreads(next);
    saveSnoozed(next);
    setThreads((current) => [
      { ...item.thread, lastActivityTs: Date.now(), lastActivity: "Just now" },
      ...current,
    ]);
  }

  function handleSchedule(message) {
    const nextMessage = {
      ...message,
      id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "pending",
      created: Date.now(),
    };

    const next = [...scheduledMessages, nextMessage];
    setScheduledMessages(next);
    saveScheduled(next);
  }

  function handleCancelScheduled(id) {
    const next = scheduledMessages.filter((message) => message.id !== id);
    setScheduledMessages(next);
    saveScheduled(next);
  }

  function enterDemo() {
    setIsDemo(true);
    setShowSignIn(false);
    setAccounts(DEMO_ACCOUNTS);
    setThreads(DEMO_THREADS);
    setClassifyLoading(false);
  }

  function handleSetFilter(nextFilter) {
    setFilter(nextFilter);
    setActiveAccountId(null);
    clearSearch();
  }

  async function persistThreadLabels(thread, addLabelIds = [], removeLabelIds = []) {
    if (isDemoRef.current || (!addLabelIds.length && !removeLabelIds.length)) return;

    if (!isOnline) {
      throw new Error("You're offline. Reconnect to sync Gmail actions.");
    }

    const response = await fetch(`/api/gmail/threads/${thread._realThreadId || thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountEmail: thread._accountEmail,
        addLabelIds,
        removeLabelIds,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to sync Gmail thread");
    }
  }

  function handleStatusChange(id, status) {
    const thread =
      threads.find((entry) => entry.id === id) ||
      searchResults?.find((entry) => entry.id === id);
    if (!thread) return;

    const previous = {
      status: thread.status,
      labels: thread._labels || [],
    };

    const addLabelIds = [];
    const removeLabelIds = [];

    if (status === "archived") removeLabelIds.push("INBOX");
    if (status === "resolved") removeLabelIds.push("UNREAD");
    if (status === "needs_response") {
      addLabelIds.push("INBOX", "UNREAD");
    }

    const nextLabels = applyLabelMutation(previous.labels, addLabelIds, removeLabelIds);
    setThreads((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, status, _labels: nextLabels } : entry
      )
    );
    setSearchResults((current) =>
      Array.isArray(current)
        ? current.map((entry) =>
            entry.id === id ? { ...entry, status, _labels: nextLabels } : entry
          )
        : current
    );

    if (!addLabelIds.length && !removeLabelIds.length) return;

    void persistThreadLabels(thread, addLabelIds, removeLabelIds).catch((error) => {
      setThreads((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, status: previous.status, _labels: previous.labels }
            : entry
        )
      );
      setSearchResults((current) =>
        Array.isArray(current)
          ? current.map((entry) =>
              entry.id === id
                ? { ...entry, status: previous.status, _labels: previous.labels }
                : entry
            )
          : current
      );
      setGmailError(error.message || "Failed to sync Gmail action");
    });
  }

  function handleToggleStar(id) {
    const thread =
      threads.find((entry) => entry.id === id) ||
      searchResults?.find((entry) => entry.id === id);
    if (!thread) return;

    const previousStarred = thread.starred;
    const previousLabels = thread._labels || [];
    const addLabelIds = previousStarred ? [] : ["STARRED"];
    const removeLabelIds = previousStarred ? ["STARRED"] : [];
    const nextLabels = applyLabelMutation(previousLabels, addLabelIds, removeLabelIds);

    setThreads((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, starred: !previousStarred, _labels: nextLabels }
          : entry
      )
    );
    setSearchResults((current) =>
      Array.isArray(current)
        ? current.map((entry) =>
            entry.id === id
              ? { ...entry, starred: !previousStarred, _labels: nextLabels }
              : entry
          )
        : current
    );

    void persistThreadLabels(thread, addLabelIds, removeLabelIds).catch((error) => {
      setThreads((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                starred: previousStarred,
                _labels: previousLabels,
              }
            : entry
        )
      );
      setSearchResults((current) =>
        Array.isArray(current)
          ? current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    starred: previousStarred,
                    _labels: previousLabels,
                  }
                : entry
            )
          : current
      );
      setGmailError(error.message || "Failed to update starring");
    });
  }

  function handleReplySent(threadId, { body, status = "waiting" }) {
    const thread =
      threads.find((entry) => entry.id === threadId) ||
      searchResults?.find((entry) => entry.id === threadId);
    const account = accounts.find((entry) => entry.id === thread?.accountId);
    const now = Date.now();

    const updater = (entry) => {
      if (entry.id !== threadId) return entry;

      return {
        ...entry,
        status,
        preview: stripHtmlAndDecode(body),
        lastActivityTs: now,
        lastActivity: "Just now",
        messages: [
          ...entry.messages,
          {
            id: `local-${now}`,
            from: {
              name: account?.name || "You",
              email: account?.email || session?.user?.email || "",
            },
            time: new Date(now).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            body,
            labelIds: entry._labels || [],
            inlineAttachments: {},
          },
        ],
      };
    };

    setThreads((current) => current.map(updater));
    setSearchResults((current) =>
      Array.isArray(current) ? current.map(updater) : current
    );
  }

  async function handleSelect(id) {
    setActiveId(id);
    setMobilePanel("detail");

    if (isDemoRef.current) return;

    const thread =
      threads.find((entry) => entry.id === id) ||
      searchResults?.find((entry) => entry.id === id);
    if (!thread || thread._fullLoaded) return;

    setThreads((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, _loadingFull: true } : entry
      )
    );
    setSearchResults((current) =>
      Array.isArray(current)
        ? current.map((entry) =>
            entry.id === id ? { ...entry, _loadingFull: true } : entry
          )
        : current
    );

    const accountParam = thread._accountEmail
      ? `?account=${encodeURIComponent(thread._accountEmail)}`
      : "";

    try {
      const response = await fetch(
        `/api/gmail/threads/${thread._realThreadId || id}${accountParam}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch thread");
      }

      if (!data.thread?.messages?.length) {
        setThreads((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, _loadingFull: false } : entry
          )
        );
        setSearchResults((current) =>
          Array.isArray(current)
            ? current.map((entry) =>
                entry.id === id ? { ...entry, _loadingFull: false } : entry
              )
            : current
        );
        return;
      }

      const fullMessages = data.thread.messages.map((message) => ({
        id: message.id,
        from: parseFromField(message.from || ""),
        time: message.internalDate
          ? new Date(Number(message.internalDate)).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : message.date || "",
        body: message.body || message.snippet || "",
        labelIds: message.labelIds || [],
        inlineAttachments: message.inlineAttachments || {},
      }));

      const lastMessage = data.thread.messages[data.thread.messages.length - 1];
      const labels = lastMessage?.labelIds || [];

      const updater = (entry) =>
        entry.id === id
          ? {
              ...entry,
              messages: fullMessages,
              starred: labels.includes("STARRED"),
              status: mapThreadStatusFromLabels(labels),
              _labels: labels,
              _fullLoaded: true,
              _loadingFull: false,
            }
          : entry;

      setThreads((current) => current.map(updater));
      setSearchResults((current) =>
        Array.isArray(current) ? current.map(updater) : current
      );
    } catch (error) {
      console.error("Thread fetch error:", error);
      setThreads((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, _loadingFull: false } : entry
        )
      );
      setSearchResults((current) =>
        Array.isArray(current)
          ? current.map((entry) =>
              entry.id === id ? { ...entry, _loadingFull: false } : entry
            )
          : current
      );
      setGmailError(error.message || "Failed to fetch thread");
    }
  }

  function handleAddAccount() {
    window.location.href = "/api/auth/link-account";
  }

  function handleCommandCompose(open, email) {
    if (!open) {
      closeCompose();
      return;
    }
    openCompose(email ? { to: email } : {});
  }

  const displayedThreads = useMemo(() => {
    if (!activeAccountId) return threads;
    return threads.filter((thread) => thread.accountId === activeAccountId);
  }, [activeAccountId, threads]);

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCmdPaletteOpen((current) => !current);
        return;
      }

      const tagName = event.target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        event.target?.isContentEditable
      ) {
        return;
      }

      const keyboardThreads = (searchResults !== null ? searchResults : displayedThreads)
        .filter((thread) =>
          filter === "starred"
            ? thread.starred
            : filter === "all"
              ? true
              : thread.status === filter
        )
        .sort((left, right) => right.lastActivityTs - left.lastActivityTs)
        .map((thread) => thread.id);

      if (event.key === "c") {
        openCompose();
        return;
      }

      if (event.key === "?") {
        setShortcutsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        closeCompose();
        setCmdPaletteOpen(false);
        return;
      }

      if (!activeId) return;

      if (event.key === "r") {
        window.dispatchEvent(new Event("orbital:openReply"));
        return;
      }

      const index = keyboardThreads.indexOf(activeId);
      if (event.key === "j" && index < keyboardThreads.length - 1) {
        void handleSelect(keyboardThreads[index + 1]);
      }
      if (event.key === "k" && index > 0) {
        void handleSelect(keyboardThreads[index - 1]);
      }
      if (event.key === "e") handleStatusChange(activeId, "archived");
      if (event.key === "s") handleToggleStar(activeId);
      if (event.key === "1") handleStatusChange(activeId, "needs_response");
      if (event.key === "2") handleStatusChange(activeId, "waiting");
      if (event.key === "3") handleStatusChange(activeId, "resolved");
      if (event.key === "4") handleStatusChange(activeId, "archived");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId, displayedThreads, filter, searchResults, shortcutsOpen]);

  if (showSignIn) {
    return <SignInView onDemo={enterDemo} />;
  }

  if (authStatus === "loading") {
    return <LoadingView />;
  }

  const isMobileDetail = mobilePanel === "detail" && Boolean(activeThread);
  const isSettingsView = view === "settings";

  return (
    <PanelErrorBoundary>
      <>
        <div className="flex h-full overflow-hidden">
          <div className="hidden md:flex">
            <Sidebar
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={setActiveAccountId}
              onAddAccount={handleAddAccount}
              filter={filter}
              onSetFilter={handleSetFilter}
              view={view}
              onSetView={setView}
              session={session}
              snoozedCount={snoozedThreads.length}
              scheduledCount={
                scheduledMessages.filter((message) => message.status === "pending")
                  .length
              }
            />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {isSettingsView ? (
              <SettingsView
                accounts={accounts}
                session={session}
                onAddAccount={handleAddAccount}
                onBack={() => setView("inbox")}
              />
            ) : (
              <div className="flex flex-1 overflow-hidden">
                <div
                  className={`w-full flex-shrink-0 overflow-hidden border-r border-[#1e2028] md:w-80 lg:w-96 ${
                    isMobileDetail ? "hidden md:flex" : "flex"
                  } flex-col`}
                >
                  <MobileHeader isDemo={isDemo} onSettings={() => setView("settings")} />

                  <PanelErrorBoundary
                    resetKey={`${filter}:${activeAccountId || "all"}:${searchResults ? "search" : "inbox"}`}
                    title="Inbox panel crashed"
                    description="Reload this panel to continue browsing threads."
                  >
                    <div className="flex flex-1 flex-col overflow-hidden">
                      {filter === "snoozed" ? (
                        <SnoozedPanel
                          snoozedThreads={snoozedThreads}
                          accounts={accounts}
                          onUnsnooze={handleUnsnooze}
                        />
                      ) : filter === "scheduled" ? (
                        <ScheduledPanel
                          scheduledMessages={scheduledMessages}
                          onCancel={handleCancelScheduled}
                        />
                      ) : (
                        <ThreadListPanel
                          threads={displayedThreads}
                          accounts={accounts}
                          activeId={activeId}
                          filter={filter}
                          onSetFilter={handleSetFilter}
                          search={search}
                          onSearch={setSearch}
                          onSelect={handleSelect}
                          loading={loading}
                          onRefresh={isDemo ? () => {} : refreshInbox}
                          isDemo={isDemo}
                          onSubmitSearch={performSearch}
                          searchResults={searchResults}
                          searchLoading={searchLoading}
                          searchError={searchError}
                          aiSearch={aiSearch}
                          onToggleAiSearch={() => setAiSearch((value) => !value)}
                          activeSearchQuery={activeSearchQuery}
                          onClearSearch={clearSearch}
                          isClassifying={classifyLoading}
                        />
                      )}
                    </div>
                  </PanelErrorBoundary>

                  <MobileBottomNav
                    filter={filter}
                    onSetFilter={handleSetFilter}
                    onCompose={() => openCompose()}
                    view={view}
                    onSetView={setView}
                  />
                </div>

                <div
                  className={`flex-1 flex-col overflow-hidden ${
                    isMobileDetail ? "flex" : "hidden md:flex"
                  }`}
                >
                  {activeThread ? (
                    <PanelErrorBoundary
                      resetKey={activeThread.id}
                      title="Thread view crashed"
                      description="Try reopening the conversation."
                    >
                      <ThreadDetail
                        key={activeThread.id}
                        thread={activeThread}
                        accounts={accounts}
                        onBack={() => setMobilePanel("list")}
                        onStatusChange={handleStatusChange}
                        onToggleStar={handleToggleStar}
                        onSnooze={handleSnooze}
                        isMobile={isMobileDetail}
                        isDemo={isDemo}
                        isOnline={isOnline}
                        onReplySend={(payload) => handleReplySent(activeThread.id, payload)}
                      />
                    </PanelErrorBoundary>
                  ) : (
                    <EmptyThreadState
                      onOpenCommandPalette={() => setCmdPaletteOpen(true)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => isOnline && openCompose()}
          disabled={!isOnline}
          title={!isOnline ? "Connect to internet to send" : undefined}
          className="fixed bottom-6 right-6 z-20 hidden items-center gap-2 rounded-2xl bg-[#5B8EF8] px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#4a7def] disabled:cursor-not-allowed disabled:opacity-40 md:flex"
        >
          <Edit3 size={14} />
          Compose
        </button>

        {gmailError ? (
          <div className="fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-red-500/20 bg-[#1c1418] px-4 py-3 shadow-2xl anim-slide-up">
            <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
            <p className="flex-1 text-[12px] text-red-300">
              {gmailError.includes("Unauthorized") || gmailError.includes("expired") ? (
                <>
                  Session expired.{" "}
                  <button onClick={() => signIn("google")} className="underline">
                    Sign in again
                  </button>
                </>
              ) : (
                gmailError
              )}
            </p>
            <button
              onClick={() => setGmailError(null)}
              className="flex-shrink-0 text-[#5c6270] hover:text-[#a0a4b0]"
            >
              ×
            </button>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-500/20 bg-[#1a1520] px-4 py-2 anim-slide-up">
            <WifiOff size={13} className="flex-shrink-0 text-amber-400" />
            <span className="text-[12px] font-medium text-amber-300">
              You&apos;re offline — Gmail actions are temporarily disabled
            </span>
          </div>
        ) : null}

        {composeOpen ? (
          <PanelErrorBoundary
            resetKey={composeDraft?.key}
            title="Composer crashed"
            description="Reopen the composer to keep going."
          >
            <ComposeModal
              accounts={accounts}
              isDemo={isDemo}
              isOnline={isOnline}
              onClose={closeCompose}
              onSchedule={handleSchedule}
              initialTo={composeDraft?.to || ""}
              initialSubject={composeDraft?.subject || ""}
              initialBody={composeDraft?.body || ""}
              initialAccountId={composeDraft?.accountId || ""}
            />
          </PanelErrorBoundary>
        ) : null}

        {shortcutsOpen ? (
          <ShortcutsModal onClose={() => setShortcutsOpen(false)} />
        ) : null}

        <CommandPalette
          isOpen={cmdPaletteOpen}
          onClose={() => setCmdPaletteOpen(false)}
          accounts={accounts}
          activeThread={activeThread}
          threads={threads}
          onSetFilter={handleSetFilter}
          onSetView={setView}
          onSetCompose={handleCommandCompose}
          onStatusChange={handleStatusChange}
          onToggleStar={handleToggleStar}
          onSelectAccount={setActiveAccountId}
        />

        <button
          onClick={() => setCmdPaletteOpen(true)}
          className="fixed bottom-6 left-6 z-20 hidden items-center gap-1.5 rounded-lg border border-[#1e2028] bg-[#111318] px-2.5 py-1.5 text-[11px] text-[#3a3f4c] transition-all hover:border-[#2a2d38] hover:text-[#6b7280] md:flex"
          title="Open command palette"
        >
          <kbd className="font-mono text-[10px]">⌘K</kbd>
        </button>
      </>
    </PanelErrorBoundary>
  );
}
