"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { STATUS } from "./constants";
import { initials } from "./helpers";

export function Avatar({ name, email, color, size = 32 }) {
  const label = name ? initials(name) : (email || "?").slice(0, 2).toUpperCase();
  const background = color || "#5B8EF8";

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full select-none font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: background,
        fontSize: Math.round(size * 0.37),
      }}
    >
      {label}
    </div>
  );
}

export function StatusBadge({ status, size = "sm", loading = false }) {
  if (loading) {
    return <span className="skeleton inline-flex h-5 w-16 rounded-full" />;
  }

  const config = STATUS[status];
  if (!config) return null;

  const { Icon, label, color, bg, bdr } = config;

  if (size === "xs") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${color} ${bg} ${bdr}`}
      >
        <Icon size={9} />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${color} ${bg} ${bdr}`}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin flex-shrink-0"
      style={{ animationDuration: "0.7s" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="31.4"
        strokeDashoffset="10"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AIDraftSkeleton() {
  return (
    <div className="space-y-3 px-4 py-5">
      <div className="flex items-center gap-2 text-[12px] text-[#5c6270]">
        <Sparkles size={13} className="text-[#5B8EF8]" />
        <span>Generating draft…</span>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3.5 w-[82%]" />
        <div className="skeleton h-3.5 w-[96%]" />
        <div className="skeleton h-3.5 w-[74%]" />
        <div className="skeleton h-3.5 w-[62%]" />
      </div>
    </div>
  );
}

export function ThreadListSkeleton({ count = 5 }) {
  return (
    <div className="px-4 pt-3 space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="py-1">
          <div className="mb-2 flex justify-between">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-10" />
          </div>
          <div className="skeleton mb-1.5 h-3 w-44" />
          <div className="skeleton h-2.5 w-36" />
        </div>
      ))}
    </div>
  );
}

export function InlineError({ message, actionLabel, onAction }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
      <AlertCircle size={12} />
      <span className="flex-1">{message}</span>
      {onAction && actionLabel ? (
        <button onClick={onAction} className="font-semibold text-red-300 underline">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
