"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Edit3, Send, Sparkles, Zap } from "lucide-react";
import { Spinner } from "./shared";

// Fetch 3 short AI-generated reply suggestions for the thread.
async function fetchSuggestions(thread, accounts) {
  const account = accounts.find((a) => a.id === thread.accountId);
  const response = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "suggestions",
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
  return data.suggestions || [];
}

export default function QuickReplies({
  thread,
  accounts,
  isDemo,
  isOnline,
  onSendSuccess,
  onEditSuggestion,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null); // index of chip being sent
  const [sent, setSent] = useState(null); // index of chip that was sent
  const threadIdRef = useRef(null);
  const account = accounts.find((a) => a.id === thread.accountId);
  const lastMessage = thread.messages[thread.messages.length - 1];
  const replyTo = lastMessage?.from?.email;

  // Only show for threads that aren't from us (no point replying to yourself)
  const accountEmails = accounts.map((a) => a.email);
  const lastIsFromMe = accountEmails.includes(lastMessage?.from?.email);

  useEffect(() => {
    if (thread.id === threadIdRef.current) return;
    threadIdRef.current = thread.id;
    setSuggestions([]);
    setSent(null);
    setSending(null);

    // Don't fetch suggestions for:
    // - threads where last message is from us
    // - threads still loading full messages
    // - demo mode (optional: you could enable for demo)
    // - offline
    if (lastIsFromMe || thread._loadingFull || !isOnline) return;

    setLoading(true);
    fetchSuggestions(thread, accounts)
      .then((results) => {
        if (threadIdRef.current === thread.id) {
          setSuggestions(results);
        }
      })
      .catch(() => {
        // Silently fail - quick replies are a nice-to-have
      })
      .finally(() => {
        if (threadIdRef.current === thread.id) setLoading(false);
      });
  }, [thread.id, thread._loadingFull, thread.messages.length]);

  async function handleQuickSend(index) {
    const text = suggestions[index];
    if (!text || sending !== null) return;

    if (isDemo) {
      setSent(index);
      onSendSuccess?.({ body: text, status: "waiting" });
      return;
    }

    setSending(index);
    try {
      // Build CC list (reply-all for multi-participant threads)
      const ccEmails = thread.participants
        .map((p) => p.email)
        .filter((email) => email && email !== replyTo && email !== account?.email);

      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo,
          cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
          subject: `Re: ${thread.subject}`,
          body: text,
          replyToMessageId: lastMessage?.id,
          fromEmail: account?.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Send failed");
      }

      setSent(index);
      onSendSuccess?.({ body: text, status: "waiting" });
    } catch {
      // On error, fall back to opening in the editor
      onEditSuggestion?.(text);
    } finally {
      setSending(null);
    }
  }

  // Don't render if last message is from us or if thread is loading
  if (lastIsFromMe || thread._loadingFull) return null;

  // Show nothing if we have no suggestions and aren't loading
  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-[#1a1c22] px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
        <Zap size={10} className="text-[#5B8EF8]" />
        Quick replies
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-[11px] text-[#4a4f5c]">
          <Spinner size={11} />
          <span>Generating suggestions…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {suggestions.map((text, index) => (
            <div
              key={index}
              className={`group flex items-center gap-2 rounded-xl border transition-all ${
                sent === index
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-[#1e2028] bg-[#14161e] hover:border-[#2a3040] hover:bg-[#1a1f2e]"
              }`}
            >
              <button
                onClick={() => handleQuickSend(index)}
                disabled={sending !== null || sent !== null || !isOnline}
                className="flex min-h-[40px] flex-1 items-center gap-2 px-3 py-2 text-left text-[12px] leading-snug text-[#8b8f9a] transition-colors hover:text-[#c8ccd4] disabled:opacity-50"
                title="Click to send immediately"
              >
                {sending === index ? (
                  <Spinner size={11} />
                ) : sent === index ? (
                  <CheckCircle2 size={12} className="flex-shrink-0 text-emerald-400" />
                ) : (
                  <Send size={10} className="flex-shrink-0 text-[#3a3f4c] group-hover:text-[#5B8EF8]" />
                )}
                <span className={sent === index ? "text-emerald-400" : ""}>
                  {sent === index ? "Sent!" : text}
                </span>
              </button>
              {sent !== index ? (
                <button
                  onClick={() => onEditSuggestion?.(text)}
                  disabled={sending !== null || sent !== null}
                  className="flex-shrink-0 px-2.5 py-2 text-[#2e3240] transition-colors hover:text-[#5B8EF8]"
                  title="Edit before sending"
                >
                  <Edit3 size={11} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
