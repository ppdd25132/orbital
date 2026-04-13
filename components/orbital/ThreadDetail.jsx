"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BellOff,
  Check,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { ACCT_COLORS, STATUS } from "./constants";
import { isHtmlContent } from "./helpers";
import SnoozeMenu from "./SnoozeMenu";
import EmailBody from "./EmailBody";
import QuickReplies from "./QuickReplies";
import ReplyBox from "./ReplyBox";
import { Avatar, Spinner, StatusBadge } from "./shared";
import PanelErrorBoundary from "./ErrorBoundary";

export default function ThreadDetail({
  thread,
  accounts,
  onBack,
  onStatusChange,
  onToggleStar,
  onSnooze,
  isMobile,
  isDemo,
  isOnline = true,
  onReplySend,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const menuRef = useRef(null);
  const snoozeRef = useRef(null);
  const account = accounts.find((item) => item.id === thread.accountId);
  const accountEmails = accounts.map((item) => item.email);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (snoozeRef.current && !snoozeRef.current.contains(event.target)) {
        setSnoozeOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#0c0d10] anim-fade">
      <div className="safe-area-top flex flex-shrink-0 items-start gap-3 border-b border-[#1e2028] px-4 py-3.5">
        {isMobile ? (
          <button
            onClick={onBack}
            className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#5c6270] transition-colors hover:bg-[#16181f] hover:text-[#c8ccd4]"
          >
            <ArrowLeft size={16} />
          </button>
        ) : null}

        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#e2e4e9]">
            {thread.subject}
          </h2>
          {account ? (
            <div className="mt-1 flex items-center gap-1.5">
              <div
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: account.color }}
              />
              <span className="text-[11px] text-[#4a4f5c]">
                {account.label} · {account.email}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={() => onToggleStar(thread.id)}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[#16181f]"
            title={thread.starred ? "Unstar" : "Star"}
          >
            <Star
              size={15}
              className={
                thread.starred
                  ? "fill-amber-400 text-amber-400"
                  : "text-[#3a3f4c] hover:text-[#6b7280]"
              }
            />
          </button>

          <div ref={snoozeRef} className="relative">
            <button
              onClick={() => setSnoozeOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[#16181f]"
              title="Snooze"
            >
              <BellOff
                size={15}
                className={snoozeOpen ? "text-amber-400" : "text-[#3a3f4c] hover:text-[#6b7280]"}
              />
            </button>
            {snoozeOpen ? (
              <SnoozeMenu
                onSnooze={(timestamp) => {
                  onSnooze(thread.id, timestamp);
                  setSnoozeOpen(false);
                }}
                onClose={() => setSnoozeOpen(false)}
              />
            ) : null}
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[#3a3f4c] transition-colors hover:bg-[#16181f] hover:text-[#6b7280]"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-[#2a2d38] bg-[#151821] py-1.5 shadow-2xl anim-scale">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
                  Status
                </p>
                {Object.entries(STATUS).map(([key, { label, Icon, color }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onStatusChange(thread.id, key);
                      setMenuOpen(false);
                    }}
                    className={`flex min-h-[38px] w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[#22252e] ${
                      thread.status === key ? color : "text-[#7a7f8e]"
                    }`}
                  >
                    <Icon size={13} className="flex-shrink-0" />
                    {label}
                    {thread.status === key ? <Check size={11} className="ml-auto" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[#171920] px-4 py-2.5">
        <div className="flex -space-x-1.5">
          {thread.participants.slice(0, 4).map((participant) => (
            <Avatar
              key={participant.email}
              name={participant.name}
              size={22}
              color={
                ACCT_COLORS[
                  Math.abs((participant.email || "a").charCodeAt(0) - 97) %
                    ACCT_COLORS.length
                ]
              }
            />
          ))}
        </div>
        <p className="flex-1 truncate text-[11px] text-[#4a4f5c]">
          {thread.participants.map((participant) => participant.name || participant.email).join(", ")}
        </p>
        <StatusBadge status={thread.status} size="xs" />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {thread._loadingFull ? (
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-2.5 text-[12px] text-[#4a4f5c]">
              <Spinner size={13} />
              <span>Loading full messages…</span>
            </div>
            <div className="space-y-3">
              <div className="skeleton h-20 w-[78%] rounded-2xl" />
              <div className="ml-auto skeleton h-16 w-[72%] rounded-2xl" />
              <div className="skeleton h-24 w-[84%] rounded-2xl" />
            </div>
          </div>
        ) : null}

        {thread.messages.map((message) => {
          const isMe = accountEmails.includes(message.from.email);
          const avatarColor = isMe
            ? account?.color || "#5B8EF8"
            : ACCT_COLORS[
                Math.abs((message.from.email || "a").charCodeAt(0) - 97) %
                  ACCT_COLORS.length
              ];
          const htmlMessage = isHtmlContent(message.body);

          return (
            <div
              key={message.id}
              className={`flex gap-3 anim-fade ${isMe ? "flex-row-reverse" : ""}`}
            >
              <Avatar name={message.from.name} size={30} color={avatarColor} />
              <div
                className={`flex max-w-[88%] min-w-0 flex-1 flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`mb-1.5 flex items-baseline gap-2 ${
                    isMe ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="text-[12px] font-semibold text-[#b0b4be]">
                    {isMe ? "You" : message.from.name}
                  </span>
                  <span className="text-[10px] text-[#2e3240]">{message.time}</span>
                </div>
                <div
                  className={`text-[13px] leading-relaxed ${
                    isMe
                      ? htmlMessage
                        ? "rounded-2xl rounded-tr-md bg-[#1b2941] p-1.5"
                        : "rounded-2xl rounded-tr-md bg-[#1a2a4a] px-4 py-3 text-[#b8c8e8]"
                      : htmlMessage
                        ? "rounded-2xl rounded-tl-md bg-[#14171d] p-1.5"
                        : "rounded-2xl rounded-tl-md bg-[#161820] px-4 py-3 text-[#a8acb8]"
                  }`}
                >
                  <EmailBody
                    body={message.body}
                    attachments={message.inlineAttachments}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <QuickReplies
        thread={thread}
        accounts={accounts}
        isDemo={isDemo}
        isOnline={isOnline}
        onSendSuccess={onReplySend}
        onEditSuggestion={(text) => {
          // Dispatch event to open reply box with pre-filled text
          window.dispatchEvent(
            new CustomEvent("orbital:openReplyWithText", { detail: text })
          );
        }}
      />

      <PanelErrorBoundary
        resetKey={thread.id}
        title="Reply box crashed"
        description="The message composer hit an unexpected error."
      >
        <ReplyBox
          thread={thread}
          accounts={accounts}
          isDemo={isDemo}
          isOnline={isOnline}
          onSendSuccess={onReplySend}
        />
      </PanelErrorBoundary>
    </div>
  );
}
