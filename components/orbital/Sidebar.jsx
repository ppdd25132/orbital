"use client";

import { Check, ChevronDown, LogOut, Plus, Settings, Zap } from "lucide-react";
import { signOut } from "next-auth/react";
import { SIDEBAR_NAV } from "./constants";
import { Avatar } from "./shared";

export default function Sidebar({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  filter,
  onSetFilter,
  view,
  onSetView,
  session,
  snoozedCount,
  scheduledCount,
}) {
  const counts = {
    snoozed: snoozedCount,
    scheduled: scheduledCount,
  };

  return (
    <aside className="flex h-full w-56 flex-shrink-0 select-none flex-col border-r border-[#1e2028] bg-[#111318]">
      <div className="flex flex-shrink-0 items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B8EF8] to-[#7AAAFE] shadow shadow-blue-500/20">
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[#e2e4e9]">
          Orbital
        </span>
      </div>

      <nav className="flex-shrink-0 space-y-0.5 px-2">
        {SIDEBAR_NAV.map(({ id, Icon, label }) => {
          const active = filter === id && view !== "settings";
          const count = counts[id] || 0;
          return (
            <button
              key={id}
              onClick={() => {
                onSetFilter(id);
                onSetView("inbox");
              }}
              className={`flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#1a1f2e] text-[#5B8EF8]"
                  : "text-[#6b7280] hover:bg-[#16181f] hover:text-[#b0b4be]"
              }`}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {count > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active
                      ? "bg-[#5B8EF8]/20 text-[#5B8EF8]"
                      : "bg-[#1e2028] text-[#4a4f5c]"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-2">
        <button className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c] transition-colors hover:text-[#5c6270]">
          <span>Accounts</span>
          <ChevronDown size={11} />
        </button>
        <div className="mt-1 space-y-0.5">
          {accounts.map((account) => {
            const active = activeAccountId === account.id;
            return (
              <button
                key={account.id}
                onClick={() => onSelectAccount(active ? null : account.id)}
                className={`flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? "bg-[#16181f] text-[#c8ccd4]"
                    : "text-[#6b7280] hover:bg-[#16181f] hover:text-[#a0a4b0]"
                }`}
              >
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: account.color }}
                />
                <span className="truncate">{account.label}</span>
                {active ? (
                  <Check size={11} className="ml-auto flex-shrink-0 text-[#5B8EF8]" />
                ) : null}
              </button>
            );
          })}

          <button
            onClick={onAddAccount}
            className="flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#5B8EF8] transition-colors hover:bg-[#1a1f2e]"
          >
            <Plus size={13} className="flex-shrink-0" />
            Connect account
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-[#1e2028] px-2 pb-4 pt-2">
        <button
          onClick={() => onSetView(view === "settings" ? "inbox" : "settings")}
          className={`flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
            view === "settings"
              ? "bg-[#16181f] text-[#c8ccd4]"
              : "text-[#6b7280] hover:bg-[#16181f] hover:text-[#a0a4b0]"
          }`}
        >
          <Settings size={14} className="flex-shrink-0" />
          Settings
        </button>

        {session?.user ? (
          <div className="group mt-0.5 flex items-center gap-2.5 px-3 py-2">
            <Avatar
              name={session.user.name || session.user.email}
              size={22}
              color="#5B8EF8"
            />
            <p className="flex-1 truncate text-[11px] text-[#5c6270]">
              {session.user.name || session.user.email}
            </p>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="text-[#3a3f4c] opacity-0 transition-all group-hover:opacity-100 hover:text-[#6b7280]"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
