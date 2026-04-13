"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CornerDownRight,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AIDraftSkeleton, InlineError, Spinner } from "./shared";

async function generateDraft(thread, accounts, tone = "professional") {
  const account = accounts.find((item) => item.id === thread.accountId);

  try {
    const response = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadMessages: thread.messages.map((message) => ({
          from: {
            name: message.from.name,
            email: message.from.email,
          },
          time: message.time,
          body: message.body,
        })),
        userName: account?.name || "",
        userEmail: account?.email || "",
        tone,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return data.error || "Draft generation unavailable. Please compose manually.";
    }

    return (
      data.content?.map((block) => block.text || "").join("") ||
      "Unable to generate draft."
    );
  } catch {
    return "Draft generation unavailable. Please compose manually.";
  }
}

export default function ReplyBox({
  thread,
  accounts,
  isDemo,
  isOnline = true,
  onSendSuccess,
}) {
  const [open, setOpen] = useState(false);
  const [replyAll, setReplyAll] = useState(false);
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [tone, setTone] = useState("professional");
  const textareaRef = useRef(null);

  const account = accounts.find((item) => item.id === thread.accountId);
  const lastMessage = thread.messages[thread.messages.length - 1];
  const replyTo = lastMessage?.from?.email;

  // CC = every participant except the sender we're replying to and ourselves
  const ccEmails = thread.participants
    .map((p) => p.email)
    .filter((email) => email && email !== replyTo && email !== account?.email);
  const ccString = ccEmails.join(", ");
  const hasMultipleRecipients = ccEmails.length > 0;

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setReplyAll(false);
    setBody("");
    setSent(false);
    setError(null);
    setAiUsed(false);
    setTone("professional");
  }, [thread.id]);

  useEffect(() => {
    async function handleOpenAIDraft() {
      await handleGenerate();
    }

    function handleOpenReply() {
      setOpen(true);
    }

    function handleOpenReplyWithText(event) {
      setBody(event.detail || "");
      setOpen(true);
      setAiUsed(true);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    }

    window.addEventListener("orbital:openReply", handleOpenReply);
    window.addEventListener("orbital:openReplyWithText", handleOpenReplyWithText);
    window.addEventListener("orbital:openAIDraft", handleOpenAIDraft);

    return () => {
      window.removeEventListener("orbital:openReply", handleOpenReply);
      window.removeEventListener("orbital:openReplyWithText", handleOpenReplyWithText);
      window.removeEventListener("orbital:openAIDraft", handleOpenAIDraft);
    };
  }, [thread.id, tone]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setOpen(true);
    setDrafting(true);
    setAiUsed(true);
    setError(null);

    const draft = await generateDraft(thread, accounts, tone);
    setBody(draft);
    setDrafting(false);
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleSend() {
    if (!body.trim()) return;

    if (isDemo) {
      setSent(true);
      setBody("");
      setOpen(false);
      onSendSuccess?.({ body, status: "waiting" });
      window.setTimeout(() => setSent(false), 2500);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo,
          cc: replyAll && ccString ? ccString : undefined,
          subject: `Re: ${thread.subject}`,
          body,
          replyToMessageId: lastMessage?.id,
          fromEmail: account?.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Send failed (${response.status})`);
      }

      setSent(true);
      setBody("");
      setOpen(false);
      onSendSuccess?.({ body, status: "waiting" });
      window.setTimeout(() => setSent(false), 2500);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-shrink-0 items-center gap-2 border-t border-emerald-500/20 bg-emerald-500/10 px-5 py-4 anim-fade">
        <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">Sent!</span>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="safe-area-inset-bottom flex flex-shrink-0 items-center gap-2.5 border-t border-[#1e2028] px-4 py-3.5">
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-[#1e2028] bg-[#16181f] px-3.5 py-2.5 text-left text-[13px] text-[#3a3f4c] transition-all hover:border-[#2a2d3a] hover:text-[#5c6270]"
        >
          <CornerDownRight size={13} className="flex-shrink-0" />
          Reply to {lastMessage?.from?.name?.split(" ")[0] || "thread"}…
        </button>
        {hasMultipleRecipients ? (
          <button
            onClick={() => { setReplyAll(true); setOpen(true); }}
            className="flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-[#1e2028] bg-[#16181f] px-3 py-2.5 text-[13px] text-[#3a3f4c] transition-all hover:border-[#2a2d3a] hover:text-[#5c6270]"
            title="Reply All"
          >
            <Users size={13} />
          </button>
        ) : null}
        <button
          onClick={handleGenerate}
          disabled={!isOnline}
          className="flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-blue-500/20 bg-[#172233] px-3 py-2.5 text-[13px] font-medium text-[#5B8EF8] transition-all hover:border-blue-500/35 hover:bg-[#1c2c41] disabled:opacity-40"
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">AI Draft</span>
        </button>
      </div>
    );
  }

  return (
    <div className="safe-area-inset-bottom flex-shrink-0 border-t border-[#1e2028] anim-slide-up">
      <div className="flex items-center justify-between border-b border-[#1a1c22] px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2 text-[11px] text-[#4a4f5c]">
            <span className="flex-shrink-0">To:</span>
            <span className="truncate text-[#7a7f8e]">{replyTo}</span>
            {aiUsed ? (
              <div className="flex flex-shrink-0 items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-[#5B8EF8]">
                <Sparkles size={9} /> AI
              </div>
            ) : null}
          </div>
          {replyAll && ccString ? (
            <div className="flex items-center gap-2 text-[11px] text-[#4a4f5c]">
              <span className="flex-shrink-0">CC:</span>
              <span className="truncate text-[#5c6270]">{ccString}</span>
            </div>
          ) : null}
        </div>
        <div className="ml-2 flex flex-shrink-0 items-center gap-1">
          {hasMultipleRecipients ? (
            <button
              onClick={() => setReplyAll((v) => !v)}
              title={replyAll ? "Switch to Reply" : "Switch to Reply All"}
              className={`flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium transition-colors ${
                replyAll
                  ? "bg-blue-500/15 text-[#5B8EF8]"
                  : "text-[#3a3f4c] hover:bg-[#1e2028] hover:text-[#8b8f9a]"
              }`}
            >
              <Users size={11} />
              {replyAll ? "All" : "All?"}
            </button>
          ) : null}
          <button
            onClick={() => {
              setOpen(false);
              setBody("");
              setError(null);
              setAiUsed(false);
              setReplyAll(false);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-[#3a3f4c] transition-colors hover:bg-[#1e2028] hover:text-[#8b8f9a]"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {drafting ? (
        <AIDraftSkeleton />
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Reply as ${account?.email || "you"}…`}
            rows={5}
            className="w-full resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
          />
          {error ? (
            <InlineError
              message={error}
              actionLabel={error.includes("Unauthorized") ? "Sign in" : undefined}
              onAction={
                error.includes("Unauthorized")
                  ? () => window.location.assign("/api/auth/signin")
                  : undefined
              }
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1a1c22] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={!isOnline}
                className="flex min-h-[36px] items-center gap-1.5 px-1 text-[12px] text-[#5B8EF8] transition-colors hover:text-[#7aaafe] disabled:opacity-40"
              >
                <Sparkles size={12} />
                {aiUsed ? "Regenerate" : "Draft with AI"}
              </button>
              <div className="flex items-center gap-0.5 border-l border-[#1e2028] pl-2">
                {["professional", "casual", "brief"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setTone(value)}
                    className={`rounded border px-2 py-1 text-[10px] font-medium capitalize transition-colors ${
                      tone === value
                        ? "border-blue-500/30 bg-blue-500/15 text-[#5B8EF8]"
                        : "border-transparent text-[#3a3f4c] hover:text-[#5c6270]"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !body.trim() || !isOnline}
              title={!isOnline ? "Connect to internet to send" : undefined}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#5B8EF8] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#4a7def] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? <Spinner size={13} /> : <Send size={12} />}
              {sending ? "Sending…" : replyAll && ccString ? "Send All" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
