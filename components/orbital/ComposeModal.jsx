"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Send,
  X,
} from "lucide-react";
import { formatSnoozeTime } from "./helpers";
import ScheduleMenu from "./ScheduleMenu";
import { InlineError, Spinner } from "./shared";

export default function ComposeModal({
  accounts,
  isDemo,
  isOnline = true,
  onClose,
  onSchedule,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  initialAccountId = "",
}) {
  const defaultAccountId = initialAccountId || accounts[0]?.id || "";
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(null);
  const scheduleButtonRef = useRef(null);

  useEffect(() => {
    setTo(initialTo);
    setSubject(initialSubject);
    setBody(initialBody);
    setAccountId(initialAccountId || accounts[0]?.id || "");
  }, [accounts, initialAccountId, initialBody, initialSubject, initialTo]);

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId),
    [accountId, accounts]
  );

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    if (isDemo) {
      setSent(true);
      window.setTimeout(onClose, 1500);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          body,
          fromEmail: account?.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Send failed");
      }

      setSent(true);
      window.setTimeout(onClose, 1500);
    } catch (sendError) {
      setError(sendError.message);
      setSending(false);
    }
  }

  function handleScheduleSend(scheduledAt) {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setScheduledFor(scheduledAt);
    onSchedule({
      to,
      subject,
      body,
      fromEmail: account?.email,
      scheduledAt,
    });
    setSent(true);
    window.setTimeout(onClose, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="safe-area-inset-bottom relative flex max-h-[90vh] w-full flex-col bg-[#111318] shadow-2xl anim-slide-up sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-[#1e2028]">
        {sent ? (
          <div className="flex flex-col items-center justify-center gap-3 px-8 py-12 anim-fade">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                scheduledFor
                  ? "border-blue-500/20 bg-blue-500/15"
                  : "border-emerald-500/20 bg-emerald-500/15"
              }`}
            >
              {scheduledFor ? (
                <CalendarClock size={22} className="text-[#5B8EF8]" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald-400" />
              )}
            </div>
            <p className="text-[15px] font-semibold text-[#e2e4e9]">
              {scheduledFor ? "Message scheduled" : "Message sent"}
            </p>
            {scheduledFor ? (
              <p className="text-[12px] text-[#5c6270]">
                {formatSnoozeTime(scheduledFor)}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="safe-area-top flex flex-shrink-0 items-center justify-between border-b border-[#1e2028] px-5 py-4">
              <h3 className="text-[14px] font-semibold text-[#e2e4e9]">New Message</h3>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4a4f5c] transition-colors hover:bg-[#1e2028] hover:text-[#8b8f9a]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 border-b border-[#171920] px-5 py-3">
                <span className="w-10 flex-shrink-0 text-[11px] font-medium text-[#3a3f4c]">
                  From
                </span>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="flex-1 cursor-pointer appearance-none bg-transparent text-[13px] text-[#c8ccd4] focus:outline-none"
                >
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id} className="bg-[#1a1c22]">
                      {item.name} &lt;{item.email}&gt;
                    </option>
                  ))}
                </select>
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: account?.color }}
                />
              </div>

              <div className="flex items-center gap-3 border-b border-[#171920] px-5 py-3">
                <span className="w-10 flex-shrink-0 text-[11px] font-medium text-[#3a3f4c]">
                  To
                </span>
                <input
                  type="email"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 border-b border-[#171920] px-5 py-3">
                <span className="w-10 flex-shrink-0 text-[11px] font-medium text-[#3a3f4c]">
                  Re
                </span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject"
                  className="flex-1 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
                />
              </div>

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your message…"
                rows={8}
                className="w-full resize-none bg-transparent px-5 py-4 text-[13px] leading-relaxed text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
              />
            </div>

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

            <div className="safe-area-inset-bottom flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2028] px-5 py-4">
              <button
                onClick={onClose}
                className="min-h-[44px] px-2 text-[13px] text-[#4a4f5c] transition-colors hover:text-[#8b8f9a]"
              >
                Discard
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    ref={scheduleButtonRef}
                    onClick={() => setScheduleOpen((value) => !value)}
                    disabled={sending || !isOnline}
                    title="Schedule send"
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#2d446f] bg-[#18263c] px-4 py-2.5 text-[13px] font-semibold text-[#8fb4ff] transition-colors hover:bg-[#1d304b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CalendarClock size={14} />
                    <span>Send later</span>
                    <ChevronDown size={14} />
                  </button>
                  {scheduleOpen ? (
                    <ScheduleMenu
                      triggerRef={scheduleButtonRef}
                      onSchedule={(timestamp) => {
                        setScheduleOpen(false);
                        handleScheduleSend(timestamp);
                      }}
                      onClose={() => setScheduleOpen(false)}
                    />
                  ) : null}
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !to.trim() || !subject.trim() || !body.trim() || !isOnline}
                  title={!isOnline ? "Connect to internet to send" : undefined}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#5B8EF8] px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#4a7def] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? <Spinner size={14} /> : <Send size={13} />}
                  {sending ? "Sending…" : "Send now"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
