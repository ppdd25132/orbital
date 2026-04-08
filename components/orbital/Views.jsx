"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Inbox,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Avatar, Spinner } from "./shared";

export function SignInView({ onDemo }) {
  return (
    <div className="safe-area-top flex h-full flex-col items-center justify-center overflow-y-auto bg-[#0c0d10] px-6 py-10 text-center anim-fade">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B8EF8] to-[#7AAAFE] shadow-lg shadow-blue-500/20">
          <Zap size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#e2e4e9]">Orbital</h1>
        <p className="mt-1.5 text-sm text-[#5c6270]">All your email, one inbox.</p>
      </div>

      <div className="mb-8 w-full max-w-xs space-y-3 text-left">
        {[
          { Icon: Inbox, text: "Unified inbox across all Gmail accounts" },
          { Icon: Sparkles, text: "AI-powered draft generation and triage" },
          { Icon: CheckCircle2, text: "Fast status tracking across threads" },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-[#8b8f9a]">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1a1c22]">
              <Icon size={14} className="text-[#5B8EF8]" />
            </div>
            {text}
          </div>
        ))}
      </div>

      <button
        onClick={() => signIn("google")}
        className="flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#1a1a1a] shadow transition-all hover:bg-gray-100 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      <button
        onClick={onDemo}
        className="mt-3 min-h-[44px] px-4 text-sm text-[#5c6270] transition-colors hover:text-[#8b8f9a]"
      >
        Try demo instead
      </button>
    </div>
  );
}

export function SettingsView({ accounts, session, onAddAccount, onBack }) {
  return (
    <div className="flex h-full flex-col bg-[#0c0d10]">
      <div className="safe-area-top flex flex-shrink-0 items-center gap-3 border-b border-[#1e2028] px-5 py-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6b7280] transition-colors hover:bg-[#16181f] hover:text-[#c8ccd4] md:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-[15px] font-semibold text-[#e2e4e9]">Settings</h2>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 overflow-y-auto px-5 py-6">
        <section>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
            Connected Accounts
          </h3>
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 rounded-xl border border-[#1e2028] bg-[#111318] px-4 py-3.5"
              >
                <Avatar name={account.name} size={34} color={account.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#c8ccd4]">
                    {account.label}
                  </p>
                  <p className="truncate text-[11px] text-[#4a4f5c]">{account.email}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
                  <div className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400">Active</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onAddAccount}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2a2d38] px-4 py-3 text-[13px] font-semibold text-[#5B8EF8] transition-all hover:border-blue-500/30 hover:bg-[#1a1f2e]"
          >
            <Plus size={14} />
            Connect another account
          </button>
        </section>

        {session?.user ? (
          <section>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
              Signed In As
            </h3>
            <div className="flex items-center gap-3 rounded-xl border border-[#1e2028] bg-[#111318] px-4 py-3.5">
              <Avatar name={session.user.name} size={34} color="#5B8EF8" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#c8ccd4]">{session.user.name}</p>
                <p className="text-[11px] text-[#4a4f5c]">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#2a2d38] px-3 py-1.5 text-[12px] text-[#5c6270] transition-all hover:border-[#3a3d4a] hover:text-[#a0a4b0]"
              >
                <LogOut size={12} />
                Sign out
              </button>
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
            About
          </h3>
          <div className="space-y-3 rounded-xl border border-[#1e2028] bg-[#111318] px-4 py-3">
            {[
              { label: "Version", value: "0.3.0" },
              {
                label: "Gmail API",
                value: (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                    Connected
                  </span>
                ),
              },
              {
                label: "AI Drafts",
                value: (
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] text-[#5B8EF8]">
                    Enabled
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#5c6270]">{label}</span>
                <span className="text-[13px] text-[#4a4f5c]">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function EmptyThreadState({ onOpenCommandPalette }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0c0d10] px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1e2028] bg-[#111318]">
        <Mail size={22} className="text-[#1e2028]" />
      </div>
      <p className="text-[14px] font-semibold text-[#2e3240]">Select a thread</p>
      <p className="mt-1 mb-6 text-[12px] text-[#1e2028]">
        Choose a conversation to read it here
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-[#2a2d38]">
          <kbd className="rounded border border-[#2a2d38] bg-[#16181f] px-1.5 py-0.5 font-mono">
            c
          </kbd>
          <span>to compose</span>
          <span className="mx-1">·</span>
          <kbd className="rounded border border-[#2a2d38] bg-[#16181f] px-1.5 py-0.5 font-mono">
            j/k
          </kbd>
          <span>to navigate</span>
        </div>
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 text-[11px] text-[#2a2d38] transition-colors hover:text-[#5B8EF8]"
        >
          <kbd className="rounded border border-[#2a2d38] bg-[#16181f] px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
          <span>command palette</span>
        </button>
      </div>
    </div>
  );
}

export function LoadingView() {
  return (
    <div className="flex h-full items-center justify-center bg-[#0c0d10]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B8EF8] to-[#7AAAFE]">
          <Zap size={20} className="text-white" />
        </div>
        <Spinner size={20} />
      </div>
    </div>
  );
}
