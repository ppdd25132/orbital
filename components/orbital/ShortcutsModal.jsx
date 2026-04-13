"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const GROUPS = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["J", "→"], description: "Next thread" },
      { keys: ["K", "←"], description: "Previous thread" },
      { keys: ["Esc"], description: "Close compose / palette" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["R"], description: "Reply to thread" },
      { keys: ["C"], description: "Compose new email" },
      { keys: ["E"], description: "Archive thread" },
      { keys: ["S"], description: "Star / unstar thread" },
    ],
  },
  {
    label: "Status",
    shortcuts: [
      { keys: ["1"], description: "Mark as Needs reply" },
      { keys: ["2"], description: "Mark as Waiting" },
      { keys: ["3"], description: "Mark as Done" },
      { keys: ["4"], description: "Archive" },
    ],
  },
  {
    label: "App",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded border border-[#2a2d38] bg-[#1a1d25] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#8b8f9a]">
      {children}
    </kbd>
  );
}

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" || event.key === "?") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 anim-fade"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2d38] bg-[#131520] shadow-2xl anim-scale">
        <div className="flex items-center justify-between border-b border-[#1e2028] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#e2e4e9]">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[#3a3f4c] transition-colors hover:bg-[#1e2028] hover:text-[#8b8f9a]"
          >
            <X size={13} />
          </button>
        </div>
        <div className="divide-y divide-[#1a1c22] overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {GROUPS.map((group) => (
            <div key={group.label} className="px-5 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between gap-4">
                    <span className="text-[13px] text-[#7a7f8e]">{shortcut.description}</span>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Key key={key}>{key}</Key>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#1e2028] px-5 py-3">
          <p className="text-[11px] text-[#2e3240]">Shortcuts work when not typing in a field.</p>
        </div>
      </div>
    </div>
  );
}
