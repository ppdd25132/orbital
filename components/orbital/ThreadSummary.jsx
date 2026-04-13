"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Spinner } from "./shared";

async function fetchSummary(thread, accounts) {
  const account = accounts.find((a) => a.id === thread.accountId);
  const response = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "summary",
      threadMessages: thread.messages.map((m) => ({
        from: { name: m.from.name, email: m.from.email },
        time: m.time,
        body: m.body,
      })),
      userName: account?.name || "",
      userEmail: account?.email || "",
    }),
  });
  const data = await response.json();
  return data.summary || null;
}

export default function ThreadSummary({ thread, accounts, isOnline }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const threadIdRef = useRef(null);

  useEffect(() => {
    if (thread.id === threadIdRef.current) return;
    threadIdRef.current = thread.id;
    setSummary(null);
    setCollapsed(false);

    // Only summarize threads with 3+ messages that are fully loaded
    if (thread.messages.length < 3 || thread._loadingFull || !isOnline) return;

    setLoading(true);
    fetchSummary(thread, accounts)
      .then((result) => {
        if (threadIdRef.current === thread.id) setSummary(result);
      })
      .catch(() => {})
      .finally(() => {
        if (threadIdRef.current === thread.id) setLoading(false);
      });
  }, [thread.id, thread._loadingFull, thread.messages.length]);

  if (!loading && !summary) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl border border-blue-500/15 bg-[#111827]/60">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
      >
        <Sparkles size={11} className="flex-shrink-0 text-[#5B8EF8]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5B8EF8]">
          AI Summary
        </span>
        <span className="ml-auto flex-shrink-0 text-[#3a3f4c]">
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>
      {!collapsed && (
        <div className="border-t border-blue-500/10 px-3.5 pb-3 pt-2">
          {loading ? (
            <div className="flex items-center gap-2 py-1 text-[11px] text-[#4a4f5c]">
              <Spinner size={11} />
              <span>Summarizing thread…</span>
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-[#8b8f9a]">
              {summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
