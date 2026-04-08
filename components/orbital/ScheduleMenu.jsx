"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import {
  getLaterToday,
  getNextMondayMorning,
  getTomorrowMorning,
} from "./helpers";

export default function ScheduleMenu({ onSchedule, onClose }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  });
  const [customTime, setCustomTime] = useState("09:00");
  const menuRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [onClose]);

  function handleCustom() {
    const date = new Date(`${customDate}T${customTime}`);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return;
    onSchedule(date.getTime());
  }

  const options = [
    { label: "Send later today", sub: "In 3 hours", ts: getLaterToday() },
    { label: "Send tomorrow morning", sub: "9:00 AM", ts: getTomorrowMorning() },
    { label: "Send Monday morning", sub: "9:00 AM", ts: getNextMondayMorning() },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute bottom-14 right-0 z-50 w-64 rounded-xl border border-[#2a2d38] bg-[#151821] py-1.5 shadow-2xl anim-scale"
    >
      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#3a3f4c]">
        Schedule send…
      </p>
      {options.map((option) => (
        <button
          key={option.label}
          onClick={() => onSchedule(option.ts)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] text-[#7a7f8e] transition-colors hover:bg-[#22252e] hover:text-[#c8ccd4]"
        >
          <span>{option.label}</span>
          <span className="text-[10px] text-[#3a3f4c]">{option.sub}</span>
        </button>
      ))}
      <div className="mx-3 mt-1 border-t border-[#1e2028] pt-1">
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex min-h-[44px] w-full items-center gap-2 py-2.5 text-[13px] text-[#7a7f8e] transition-colors hover:text-[#c8ccd4]"
          >
            <Calendar size={12} className="flex-shrink-0" />
            Pick date &amp; time
          </button>
        ) : (
          <div className="space-y-2 py-2">
            <input
              type="date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-[#2a2d38] bg-[#111318] px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:border-[#3a4050] focus:outline-none"
            />
            <input
              type="time"
              value={customTime}
              onChange={(event) => setCustomTime(event.target.value)}
              className="w-full rounded-lg border border-[#2a2d38] bg-[#111318] px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:border-[#3a4050] focus:outline-none"
            />
            <button
              onClick={handleCustom}
              className="w-full rounded-lg bg-[#5B8EF8] py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#4a7def]"
            >
              Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
