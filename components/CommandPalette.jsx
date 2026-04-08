"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Inbox, Star, CheckCircle2, Archive, Clock, Settings,
  CornerDownRight, Sparkles, PenLine, X, Search, Edit3,
  UserCircle2,
} from "lucide-react";

/* ── Fuzzy match helpers ──────────────────────────────────────────── */
function fuzzyMatch(str, query) {
  str = str.toLowerCase();
  query = query.toLowerCase();
  let si = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const idx = str.indexOf(query[qi], si);
    if (idx === -1) return false;
    si = idx + 1;
  }
  return true;
}

function fuzzyScore(str, query) {
  str = str.toLowerCase();
  query = query.toLowerCase();
  let score = 0;
  let si = 0;
  let lastIdx = -2;
  for (let qi = 0; qi < query.length; qi++) {
    const idx = str.indexOf(query[qi], si);
    if (idx === -1) return -Infinity;
    if (idx === lastIdx + 1) score += 2;    // consecutive bonus
    if (idx === 0 && qi === 0) score += 5;  // prefix bonus
    score += 1;
    lastIdx = idx;
    si = idx + 1;
  }
  return score;
}

/* ── CommandPalette ───────────────────────────────────────────────── */
export default function CommandPalette({
  isOpen,
  onClose,
  accounts,
  activeThread,
  threads,
  onSetFilter,
  onSetView,
  onSetCompose,
  onStatusChange,
  onToggleStar,
  onSelectAccount,
}) {
  const [query,       setQuery]       = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  /* ── Build full command list ─────────────────────────────────── */
  const allCommands = useMemo(() => {
    const cmds = [];

    // Navigation
    cmds.push({ id: "nav-inbox",    group: "Navigation", label: "Go to Inbox",    Icon: Inbox,        shortcut: null, action: () => { onSetFilter("all");            onSetView("inbox"); } });
    cmds.push({ id: "nav-starred",  group: "Navigation", label: "Go to Starred",  Icon: Star,         shortcut: null, action: () => { onSetFilter("starred");        onSetView("inbox"); } });
    cmds.push({ id: "nav-done",     group: "Navigation", label: "Go to Done",     Icon: CheckCircle2, shortcut: "3",  action: () => { onSetFilter("resolved");       onSetView("inbox"); } });
    cmds.push({ id: "nav-archived", group: "Navigation", label: "Go to Archived", Icon: Archive,      shortcut: "4",  action: () => { onSetFilter("archived");       onSetView("inbox"); } });
    cmds.push({ id: "nav-waiting",  group: "Navigation", label: "Go to Waiting",  Icon: Clock,        shortcut: "2",  action: () => { onSetFilter("waiting");        onSetView("inbox"); } });
    cmds.push({ id: "nav-settings", group: "Navigation", label: "Go to Settings", Icon: Settings,     shortcut: null, action: () => {                                onSetView("settings"); } });

    // Compose
    cmds.push({ id: "compose-new", group: "Compose", label: "New Message", Icon: Edit3, shortcut: "C", action: () => onSetCompose(true) });

    // Recent contacts → "New Message to …"
    const seen = new Set();
    outer: for (const t of (threads || []).slice(0, 30)) {
      for (const p of (t.participants || [])) {
        if (!p.email || seen.has(p.email)) continue;
        seen.add(p.email);
        const contact = p;
        cmds.push({
          id: `compose-to-${contact.email}`,
          group: "Compose",
          label: `New Message to ${contact.name || contact.email}`,
          Icon: UserCircle2,
          shortcut: null,
          action: () => onSetCompose(true, contact.email),
        });
        if (seen.size >= 5) break outer;
      }
    }

    // Thread actions — only when a thread is selected
    if (activeThread) {
      const tid = activeThread.id;
      cmds.push({ id: "thread-reply",    group: "Thread", label: "Reply",               Icon: CornerDownRight, shortcut: "R",  action: () => window.dispatchEvent(new CustomEvent("orbital:openReply")) });
      cmds.push({ id: "thread-ai",       group: "Thread", label: "Reply with AI Draft", Icon: Sparkles,        shortcut: null, action: () => window.dispatchEvent(new CustomEvent("orbital:openAIDraft")) });
      cmds.push({ id: "thread-archive",  group: "Thread", label: "Archive",             Icon: Archive,         shortcut: "E",  action: () => onStatusChange(tid, "archived") });
      cmds.push({ id: "thread-star",     group: "Thread", label: activeThread.starred ? "Unstar" : "Star", Icon: Star, shortcut: "S", action: () => onToggleStar(tid) });
      cmds.push({ id: "thread-done",     group: "Thread", label: "Mark as Done",        Icon: CheckCircle2,    shortcut: "3",  action: () => onStatusChange(tid, "resolved") });
      cmds.push({ id: "thread-waiting",  group: "Thread", label: "Move to Waiting",     Icon: Clock,           shortcut: "2",  action: () => onStatusChange(tid, "waiting") });
      cmds.push({ id: "thread-needs",    group: "Thread", label: "Mark Needs Reply",    Icon: PenLine,         shortcut: "1",  action: () => onStatusChange(tid, "needs_response") });
    }

    // Account switching
    for (const acct of (accounts || [])) {
      cmds.push({
        id: `acct-${acct.id}`,
        group: "Accounts",
        label: `Switch to ${acct.label || acct.email}`,
        Icon: UserCircle2,
        shortcut: null,
        acctColor: acct.color,
        action: () => { onSelectAccount(acct.id); onSetView("inbox"); },
      });
    }

    return cmds;
  }, [activeThread, accounts, threads, onSetFilter, onSetView, onSetCompose, onStatusChange, onToggleStar, onSelectAccount]);

  /* ── Filtered + scored list ──────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return allCommands;
    return allCommands
      .filter(cmd => fuzzyMatch(cmd.label, q))
      .sort((a, b) => fuzzyScore(b.label, q) - fuzzyScore(a.label, q));
  }, [allCommands, query]);

  /* ── Grouped for display ─────────────────────────────────────── */
  const grouped = useMemo(() => {
    const out = {};
    for (const cmd of filtered) {
      if (!out[cmd.group]) out[cmd.group] = [];
      out[cmd.group].push(cmd);
    }
    return out;
  }, [filtered]);

  /* ── Reset on open ───────────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      // Use rAF so the modal is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  /* ── Scroll selected item into view ─────────────────────────── */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  /* ── Execute ─────────────────────────────────────────────────── */
  const execute = useCallback((cmd) => {
    onClose();
    // Small delay so the modal unmounts before the action runs
    setTimeout(() => cmd.action(), 30);
  }, [onClose]);

  /* ── Keyboard navigation ─────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === "Escape")    { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && filtered[selectedIdx]) { e.preventDefault(); execute(filtered[selectedIdx]); return; }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, filtered, selectedIdx, execute, onClose]);

  if (!isOpen) return null;

  // Build flat index map across groups (so data-idx matches selectedIdx)
  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Palette container */}
      <div className="relative w-full max-w-[520px] bg-[#111318] border border-[#2a2d38] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden anim-command-palette">

        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e2028]">
          <Search size={15} className="text-[#4a4f5c] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-[14px] text-[#e2e4e9] placeholder-[#3a3f4c] focus:outline-none"
          />
          {query && (
            <button
              onMouseDown={e => { e.preventDefault(); setQuery(""); }}
              className="text-[#3a3f4c] hover:text-[#6b7280] transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded bg-[#1a1c22] border border-[#2a2d38] text-[10px] text-[#3a3f4c] font-mono leading-none">
            esc
          </kbd>
        </div>

        {/* ── Results list ── */}
        <div ref={listRef} className="overflow-y-auto max-h-[min(60vh,380px)] pb-1.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#3a3f4c]">
              No commands found
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, cmds]) => (
              <div key={groupName}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-[#2e3240] uppercase tracking-widest select-none">
                  {groupName}
                </p>
                {cmds.map(cmd => {
                  const idx  = flatIdx++;
                  const isSel = idx === selectedIdx;
                  const { Icon, acctColor } = cmd;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => execute(cmd)}
                      className={`w-[calc(100%-12px)] mx-1.5 flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                        ${isSel ? "bg-[#1a1f2e] text-[#e2e4e9]" : "text-[#8b8f9a]"}`}
                    >
                      {/* Icon or account colour dot */}
                      {acctColor ? (
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ background: acctColor }}
                        />
                      ) : (
                        <Icon
                          size={14}
                          className={`flex-shrink-0 ${isSel ? "text-[#5B8EF8]" : "text-[#4a4f5c]"}`}
                        />
                      )}

                      <span className="flex-1 text-[13px] truncate">{cmd.label}</span>

                      {/* Shortcut hint */}
                      {cmd.shortcut && (
                        <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex-shrink-0
                          ${isSel
                            ? "bg-[#1e2a3a] border-blue-500/30 text-[#5B8EF8]"
                            : "bg-[#16181f] border-[#2a2d38] text-[#3a3f4c]"
                          }`}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer hint ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1a1c22]">
          <div className="flex items-center gap-3 text-[10px] text-[#2a2d38]">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">↵</kbd>
              select
            </span>
          </div>
          <span className="text-[10px] text-[#2a2d38]">
            {filtered.length} command{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
