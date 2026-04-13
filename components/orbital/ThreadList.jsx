"use client";

import {
  BellOff,
  CalendarClock,
  Check,
  CheckCircle2,
  Edit3,
  Inbox,
  Search,
  Settings,
  Sparkles,
  Star,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { MOBILE_NAV } from "./constants";
import { formatSnoozeTime } from "./helpers";
import { StatusBadge, ThreadListSkeleton } from "./shared";

function ThreadItem({ thread, accounts, isActive, onSelect, onArchive, onToggleStar }) {
  const account = accounts.find((item) => item.id === thread.accountId);
  const isUnread = thread.status === "needs_response";
  const sender = thread.participants[0];

  return (
    <button
      onClick={() => onSelect(thread.id)}
      className={`group/item flex min-h-[84px] w-full items-stretch border-b border-[#171920] text-left transition-colors ${
        isActive ? "bg-[#1a1f2e]" : "hover:bg-[#14161e] active:bg-[#16181f]"
      }`}
    >
      <div
        className="w-[3px] flex-shrink-0 transition-colors"
        style={{ background: isActive ? account?.color || "#5B8EF8" : "transparent" }}
      />
      <div className="flex-1 min-w-0 px-4 py-3.5">
        <div className="mb-1 flex items-center gap-2">
          {isUnread ? (
            <div className="h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[#5B8EF8]" />
          ) : null}
          <span
            className={`flex-1 truncate text-[13px] leading-tight ${
              isUnread ? "font-semibold text-[#e2e4e9]" : "font-medium text-[#7a7f8e]"
            }`}
          >
            {sender?.name || sender?.email || "Unknown"}
          </span>
          {thread.messages.length > 1 ? (
            <span className="flex-shrink-0 rounded-full bg-[#1e2028] px-1.5 py-0.5 text-[10px] font-medium text-[#3a3f4c]">
              {thread.messages.length}
            </span>
          ) : null}
          <span className="ml-1 flex-shrink-0 text-[11px] text-[#3a3f4c]">
            {thread.lastActivity}
          </span>
          {thread.starred ? (
            <Star size={10} className="flex-shrink-0 fill-amber-400 text-amber-400" />
          ) : null}
        </div>

        <p
          className={`truncate text-[12px] leading-tight ${
            isUnread ? "font-medium text-[#b0b4be]" : "text-[#5c6270]"
          }`}
        >
          {thread.subject}
        </p>

        <div className="relative mt-1.5 flex items-center gap-2">
          <p className="flex-1 truncate text-[11px] text-[#3a3f4c] group-hover/item:pr-16">{thread.preview}</p>
          {thread.status !== "needs_response" || thread._classifying ? (
            <StatusBadge
              status={thread.status}
              size="xs"
              loading={thread._classifying}
            />
          ) : null}
          {/* Hover quick-actions: archive + star without opening thread */}
          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover/item:flex">
            {onArchive && thread.status !== "archived" ? (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onArchive(thread.id); }}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1e2028] text-[#4a4f5c] transition-colors hover:bg-[#2a2d38] hover:text-[#c8ccd4]"
                title="Archive"
              >
                <Check size={11} />
              </span>
            ) : null}
            {onToggleStar ? (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onToggleStar(thread.id); }}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                  thread.starred
                    ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                    : "bg-[#1e2028] text-[#4a4f5c] hover:bg-[#2a2d38] hover:text-amber-400"
                }`}
                title={thread.starred ? "Unstar" : "Star"}
              >
                <Star size={11} className={thread.starred ? "fill-current" : ""} />
              </span>
            ) : null}
          </div>
        </div>

        {account ? (
          <div className="mt-1.5 flex items-center gap-1">
            <div
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: account.color }}
            />
            <span className="text-[10px] text-[#2e3240]">{account.label}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function SnoozedPanel({ snoozedThreads, accounts, onUnsnooze }) {
  return (
    <div className="flex h-full flex-col bg-[#0c0d10]">
      <div className="px-4 pb-3 pt-4 border-b border-[#1e2028] flex-shrink-0">
        <h2 className="text-[14px] font-semibold tracking-tight text-[#e2e4e9]">
          Snoozed
        </h2>
        <p className="mt-0.5 text-[11px] text-[#3a3f4c]">
          Threads return to inbox when the time arrives.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {snoozedThreads.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center px-6 text-center">
            <BellOff size={20} className="mb-2 text-[#2e3240]" />
            <p className="text-sm font-medium text-[#3a3f4c]">No snoozed threads</p>
          </div>
        ) : (
          snoozedThreads.map((item) => {
            const account = accounts.find((entry) => entry.id === item.thread.accountId);
            const sender = item.thread.participants[0];
            return (
              <div
                key={item.threadId}
                className="flex items-start gap-3 border-b border-[#171920] px-4 py-3.5 transition-colors hover:bg-[#14161e]"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    {account ? (
                      <div
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: account.color }}
                      />
                    ) : null}
                    <span className="truncate text-[13px] font-medium text-[#7a7f8e]">
                      {sender?.name || sender?.email}
                    </span>
                  </div>
                  <p className="truncate text-[12px] text-[#5c6270]">{item.thread.subject}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <BellOff size={10} className="flex-shrink-0 text-amber-400" />
                    <span className="text-[11px] text-amber-400">
                      {formatSnoozeTime(item.snoozeUntil)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onUnsnooze(item.threadId)}
                  className="mt-0.5 flex-shrink-0 rounded-lg px-2 py-1 text-[11px] text-[#3a3f4c] transition-colors hover:bg-[#1e2028] hover:text-[#8b8f9a]"
                >
                  Unsnooze
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ScheduledPanel({ scheduledMessages, onCancel }) {
  const pending = scheduledMessages.filter((message) => message.status === "pending");
  const recent = scheduledMessages
    .filter((message) => message.status !== "pending")
    .slice(-5)
    .reverse();

  return (
    <div className="flex h-full flex-col bg-[#0c0d10]">
      <div className="px-4 pb-3 pt-4 border-b border-[#1e2028] flex-shrink-0">
        <h2 className="text-[14px] font-semibold tracking-tight text-[#e2e4e9]">
          Scheduled
        </h2>
        <p className="mt-0.5 text-[11px] text-[#3a3f4c]">
          Messages queued to send automatically.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && recent.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center px-6 text-center">
            <CalendarClock size={20} className="mb-2 text-[#2e3240]" />
            <p className="text-sm font-medium text-[#3a3f4c]">No scheduled messages</p>
          </div>
        ) : (
          <>
            {pending.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 border-b border-[#171920] px-4 py-3.5 transition-colors hover:bg-[#14161e]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[#b0b4be]">
                    {message.subject}
                  </p>
                  <p className="truncate text-[11px] text-[#5c6270]">To: {message.to}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <CalendarClock size={10} className="flex-shrink-0 text-[#5B8EF8]" />
                    <span className="text-[11px] text-[#5B8EF8]">
                      {formatSnoozeTime(message.scheduledAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onCancel(message.id)}
                  className="mt-0.5 flex-shrink-0 rounded-lg px-2 py-1 text-[11px] text-[#3a3f4c] transition-colors hover:bg-[#1e2028] hover:text-red-400"
                >
                  Cancel
                </button>
              </div>
            ))}

            {recent.length > 0 ? (
              <div className="px-4 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#2e3240]">
                  Recent
                </p>
                {recent.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 border-b border-[#171920] py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-[#4a4f5c]">
                        {message.subject}
                      </p>
                      <p className="truncate text-[11px] text-[#3a3f4c]">To: {message.to}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        message.status === "sent"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {message.status === "sent" ? "Sent" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function MobileBottomNav({ filter, onSetFilter, onCompose, view, onSetView }) {
  return (
    <nav className="safe-area-inset-bottom flex items-center justify-around border-t border-[#1e2028] bg-[#111318] md:hidden flex-shrink-0">
      {MOBILE_NAV.map(({ id, Icon, label }) => {
        const active = filter === id && view !== "settings";
        return (
          <button
            key={id}
            onClick={() => {
              onSetFilter(id);
              onSetView("inbox");
            }}
            className={`flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
              active ? "text-[#5B8EF8]" : "text-[#3a3f4c]"
            }`}
          >
            <Icon size={17} />
            <span
              className={`text-[9px] font-semibold tracking-wide ${
                active ? "text-[#5B8EF8]" : "text-[#2e3240]"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
      <button
        onClick={onCompose}
        className="flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 py-2"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B8EF8] shadow shadow-blue-500/25">
          <Edit3 size={15} className="text-white" />
        </div>
      </button>
    </nav>
  );
}

export function MobileHeader({ isDemo, onSettings }) {
  return (
    <div className="safe-area-top flex flex-shrink-0 items-center justify-between border-b border-[#1e2028] bg-[#111318] px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B8EF8] to-[#7AAAFE]">
          <Zap size={12} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-[#e2e4e9]">Orbital</span>
        {isDemo ? (
          <span className="rounded border border-amber-500/20 bg-[#2a1a05] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-400">
            DEMO
          </span>
        ) : null}
      </div>
      <button
        onClick={onSettings}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#5c6270] transition-colors hover:bg-[#16181f] hover:text-[#c8ccd4]"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}

export default function ThreadListPanel({
  threads,
  accounts,
  activeId,
  filter,
  onSetFilter,
  search,
  onSearch,
  onSelect,
  loading,
  onRefresh,
  isDemo,
  onSubmitSearch,
  searchResults,
  searchLoading,
  searchError,
  aiSearch,
  onToggleAiSearch,
  activeSearchQuery,
  onClearSearch,
  isClassifying = false,
  onArchive,
  onToggleStar,
}) {
  const chipCounts = {
    needs_response: threads.filter((t) => t.status === "needs_response").length,
    waiting: threads.filter((t) => t.status === "waiting").length,
    resolved: threads.filter((t) => t.status === "resolved").length,
    starred: threads.filter((t) => t.starred).length,
  };

  const chips = [
    { id: "all", label: "All" },
    { id: "needs_response", label: "Reply" },
    { id: "waiting", label: "Waiting" },
    { id: "resolved", label: "Done" },
    { id: "starred", label: "Starred" },
  ];

  const isSearchMode = searchResults !== null;
  const visible = (() => {
    if (isSearchMode) return searchResults || [];

    let nextThreads = [...threads];
    if (filter === "starred") nextThreads = nextThreads.filter((thread) => thread.starred);
    else if (filter === "archived") {
      nextThreads = nextThreads.filter((thread) => thread.status === "archived");
    } else if (filter !== "all") {
      nextThreads = nextThreads.filter((thread) => thread.status === filter);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      nextThreads = nextThreads.filter(
        (thread) =>
          thread.subject.toLowerCase().includes(query) ||
          thread.preview.toLowerCase().includes(query) ||
          thread.participants.some(
            (participant) =>
              participant.name.toLowerCase().includes(query) ||
              participant.email.toLowerCase().includes(query)
          )
      );
    }

    return nextThreads.sort((left, right) => right.lastActivityTs - left.lastActivityTs);
  })();

  const titles = {
    all: "All Mail",
    needs_response: "Needs Reply",
    waiting: "Waiting",
    starred: "Starred",
    resolved: "Done",
    archived: "Archived",
  };

  function handleSearchKeyDown(event) {
    if (event.key === "Enter" && search.trim() && !isDemo) {
      onSubmitSearch(search);
    }
    if (event.key === "Escape" && isSearchMode) {
      onClearSearch();
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#0c0d10]">
      <div className="px-4 pb-2 pt-4 flex-shrink-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold tracking-tight text-[#e2e4e9]">
              {isSearchMode ? (
                <span className="text-[#5B8EF8]">Search Results</span>
              ) : (
                titles[filter] || "Inbox"
              )}
            </h2>
            {isClassifying && !isSearchMode ? (
              <p className="mt-1 text-[11px] text-[#4a4f5c]">
                AI triage is updating thread states…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {isDemo ? (
              <span className="rounded border border-amber-500/20 bg-[#2a1a05] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400">
                DEMO
              </span>
            ) : null}
            {!isSearchMode ? (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#3a3f4c] transition-colors hover:bg-[#16181f] hover:text-[#8b8f9a] disabled:opacity-50"
                title="Refresh"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3a3f4c]"
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={
              aiSearch
                ? "Describe what you're looking for…"
                : "Search threads… (Enter to search)"
            }
            className={`w-full rounded-lg border bg-[#16181f] py-2 pl-8 text-[13px] text-[#c8ccd4] placeholder-[#2e3240] transition-colors focus:outline-none ${
              isSearchMode
                ? "border-[#5B8EF8]/30 pr-8 focus:border-[#5B8EF8]/50"
                : "border-[#1e2028] pr-16 focus:border-[#2a3040]"
            }`}
          />
          {!isSearchMode && !isDemo ? (
            <button
              onClick={onToggleAiSearch}
              title={
                aiSearch
                  ? "AI search on — queries interpreted as natural language"
                  : "AI search off — queries use Gmail syntax"
              }
              className={`absolute right-7 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded transition-colors ${
                aiSearch ? "text-[#5B8EF8]" : "text-[#2e3240] hover:text-[#5c6270]"
              }`}
            >
              <Sparkles size={11} />
            </button>
          ) : null}
          {search || isSearchMode ? (
            <button
              onClick={() => {
                onSearch("");
                if (isSearchMode) onClearSearch();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a4f5c] hover:text-[#8b8f9a]"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        {isSearchMode ? (
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {aiSearch ? (
                <span className="flex flex-shrink-0 items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#5B8EF8]">
                  <Sparkles size={8} />
                  AI
                </span>
              ) : null}
              <span className="truncate text-[11px] text-[#3a3f4c]">
                {searchLoading
                  ? aiSearch
                    ? "Interpreting query and searching…"
                    : "Searching…"
                  : searchError
                    ? searchError
                    : `${visible.length} result${visible.length !== 1 ? "s" : ""} for "${activeSearchQuery}"`}
              </span>
            </div>
            <button
              onClick={onClearSearch}
              className="ml-2 flex-shrink-0 text-[11px] text-[#5B8EF8] hover:text-[#7CA4F8]"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {aiSearch && !isDemo ? (
              <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-[#5B8EF8]">
                <Sparkles size={9} />
                AI on
              </span>
            ) : null}
            {chips.map(({ id, label }) => {
              const count = chipCounts[id] || 0;
              return (
                <button
                  key={id}
                  onClick={() => onSetFilter(id)}
                  className={`flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filter === id
                      ? "border-blue-500/25 bg-[#1a2a4a] text-[#5B8EF8]"
                      : "border-transparent text-[#3a3f4c] hover:text-[#6b7280]"
                  }`}
                >
                  {label}
                  {count > 0 ? (
                    <span
                      className={`ml-1 rounded-full px-1 text-[9px] font-bold ${
                        filter === id ? "bg-blue-500/20 text-[#5B8EF8]" : "bg-[#1e2028] text-[#4a4f5c]"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {(loading && visible.length === 0 && !isSearchMode) || searchLoading ? (
          <ThreadListSkeleton />
        ) : visible.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center px-6 text-center anim-fade">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#16181f]">
              <Inbox size={17} className="text-[#2e3240]" />
            </div>
            <p className="text-sm font-medium text-[#3a3f4c]">
              {isSearchMode ? "No results found" : "Nothing here"}
            </p>
            <p className="mt-1 text-xs text-[#2e3240]">
              {isSearchMode
                ? "Try a different search query"
                : search
                  ? "Try a different search"
                  : "You're all caught up"}
            </p>
            {isSearchMode ? (
              <button
                onClick={onClearSearch}
                className="mt-3 text-xs text-[#5B8EF8] hover:text-[#7CA4F8]"
              >
                Back to inbox
              </button>
            ) : null}
          </div>
        ) : (
          <div className="anim-fade">
            {visible.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                accounts={accounts}
                isActive={thread.id === activeId}
                onSelect={onSelect}
                onArchive={onArchive}
                onToggleStar={onToggleStar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
