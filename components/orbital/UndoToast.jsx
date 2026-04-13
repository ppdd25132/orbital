"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, Undo2 } from "lucide-react";

const UNDO_WINDOW_MS = 5000;

export default function UndoToast({ message, onUndo, onExpire }) {
  const [remaining, setRemaining] = useState(UNDO_WINDOW_MS);
  const startRef = useRef(Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, UNDO_WINDOW_MS - elapsed);
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpire?.();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onExpire]);

  const progress = remaining / UNDO_WINDOW_MS;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-500/20 bg-[#131820] px-4 py-3 shadow-2xl anim-slide-up md:bottom-8">
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="#1e2028"
            strokeWidth="2.5"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 14}
            strokeDashoffset={2 * Math.PI * 14 * (1 - progress)}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-100"
          />
        </svg>
        <span className="text-[10px] font-bold tabular-nums text-emerald-400">
          {seconds}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#e2e4e9]">
          {message || "Message sent"}
        </p>
        <p className="text-[11px] text-[#4a4f5c]">
          Sending in {seconds}s…
        </p>
      </div>
      <button
        onClick={() => {
          expiredRef.current = true;
          onUndo?.();
        }}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-[#2a2d38] bg-[#1a1d25] px-3 text-[12px] font-medium text-[#c8ccd4] transition-colors hover:border-[#3a3f4c] hover:bg-[#22252e]"
      >
        <Undo2 size={12} />
        Undo
      </button>
    </div>
  );
}
