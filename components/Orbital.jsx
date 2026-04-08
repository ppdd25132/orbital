"use client";
import { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import CommandPalette from "./CommandPalette";
import {
  Mail, CheckCircle2, RefreshCw, Plus, Sparkles, Inbox,
  Eye, PenLine, Loader2, X, Check, Clock, Search,
  ArrowLeft, Star, Archive, Settings, MoreHorizontal,
  AlertCircle, LogOut, Send, Edit3, ChevronDown,
  Zap, CornerDownRight, WifiOff, BellOff, Calendar, CalendarClock
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   STORAGE
   ═══════════════════════════════════════════════════════════════════ */
const STORE_KEY = "orbital-v2-state";
function loadState() {
  try {
    if (typeof window === "undefined") return null;
    const r = localStorage.getItem(STORE_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function saveState(s) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

const SNOOZE_KEY = "orbital-snoozed";
const SCHEDULED_KEY = "orbital-scheduled";
function loadSnoozed() {
  try { if (typeof window === "undefined") return []; const r = localStorage.getItem(SNOOZE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveSnoozed(items) {
  try { if (typeof window !== "undefined") localStorage.setItem(SNOOZE_KEY, JSON.stringify(items)); } catch {}
}
function loadScheduled() {
  try { if (typeof window === "undefined") return []; const r = localStorage.getItem(SCHEDULED_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveScheduled(items) {
  try { if (typeof window !== "undefined") localStorage.setItem(SCHEDULED_KEY, JSON.stringify(items)); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════════ */
const STATUS = {
  needs_response: { label: "Needs reply",  color: "text-blue-400",   bg: "bg-blue-500/10",    bdr: "border-blue-500/20",   Icon: PenLine },
  waiting:        { label: "Waiting",      color: "text-amber-400",  bg: "bg-amber-500/10",   bdr: "border-amber-500/20",  Icon: Clock },
  fyi:            { label: "FYI",          color: "text-slate-400",  bg: "bg-slate-500/10",   bdr: "border-slate-500/20",  Icon: Eye },
  resolved:       { label: "Done",         color: "text-emerald-400",bg: "bg-emerald-500/10", bdr: "border-emerald-500/20",Icon: CheckCircle2 },
  archived:       { label: "Archived",     color: "text-slate-600",  bg: "bg-slate-800/20",   bdr: "border-slate-700/20",  Icon: Archive },
};

const ACCT_COLORS = [
  "#6366F1","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#EC4899","#14B8A6",
];

/* ═══════════════════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════════════════ */
const DEMO_ACCOUNTS = [
  { id: "a1", email: "michael.torres@gmail.com",     name: "Michael Torres", color: "#6366F1", label: "Personal" },
  { id: "a2", email: "mtorres@acmeventures.com",      name: "Michael Torres", color: "#3B82F6", label: "Acme Ventures" },
  { id: "a3", email: "mike@heliospharma.com",         name: "Michael Torres", color: "#10B981", label: "Helios Pharma" },
  { id: "a4", email: "m.torres@nimbuslogistics.com",  name: "Michael Torres", color: "#F59E0B", label: "Nimbus Logistics" },
  { id: "a5", email: "torres@ridgelinedata.io",       name: "Michael Torres", color: "#8B5CF6", label: "Ridgeline Data" },
];

const DEMO_THREADS = [
  {
    id: "t1", accountId: "a2",
    subject: "Board deck — need Q1 actuals ASAP",
    status: "needs_response", starred: true,
    lastActivity: "2 hours ago", lastActivityTs: Date.now() - 7200000,
    preview: "Mike — Board meeting is Thursday morning. I still don't have the updated deck...",
    participants: [{ name: "Rachel Kim", email: "rachel@acmeventures.com", role: "CEO" }],
    messages: [
      { id: "m1", from: { name: "Rachel Kim", email: "rachel@acmeventures.com" }, time: "Mar 30, 9:15 AM",
        body: "Mike — Quick heads up, the board meeting is confirmed for Thursday April 3rd. I'll need the updated deck with Q1 actuals by Wednesday EOD. Key things I want to cover:\n\n1. Cash position and updated runway\n2. Bridge from Q4 forecast to Q1 actuals\n3. Headcount plan vs. actual\n\nLet me know if you need anything from our side to pull this together." },
      { id: "m2", from: { name: "You", email: "mtorres@acmeventures.com" }, time: "Mar 30, 11:42 AM",
        body: "Rachel — Got it, will have the deck ready by Wednesday. I'll pull the Q1 actuals from QBO today and start on the bridge analysis. One question: do you want me to include the Series B scenario modeling or keep it focused on operating metrics?\n\nBest,\nMike" },
      { id: "m3", from: { name: "Rachel Kim", email: "rachel@acmeventures.com" }, time: "Mar 30, 12:10 PM",
        body: "Let's keep the board deck focused on operating metrics. We can do the Series B modeling as a separate exercise after the board meeting.\n\nAlso, Lisa mentioned the 409A draft came in. Can you review that too before I meet with the comp committee next week?" },
      { id: "m4", from: { name: "Rachel Kim", email: "rachel@acmeventures.com" }, time: "Today, 9:12 AM",
        body: "Mike — Following up on this. I know I sent a Slack message too but want to make sure this doesn't slip. The investors specifically asked about the variance between Q4 forecast and Q1 actuals, so the bridge slide is critical.\n\nAlso, our cash balance looks different in QBO than what I expected. Can you double-check we're not including the restricted cash from the equipment financing?" },
    ],
  },
  {
    id: "t2", accountId: "a2",
    subject: "409A valuation — draft ready for review",
    status: "needs_response", starred: false,
    lastActivity: "Yesterday", lastActivityTs: Date.now() - 86400000,
    preview: "The 409A firm sent over the draft valuation report. A few things jumped out...",
    participants: [{ name: "Lisa Novak", email: "lisa@acmeventures.com", role: "Controller" }],
    messages: [
      { id: "m5", from: { name: "Lisa Novak", email: "lisa@acmeventures.com" }, time: "Yesterday, 4:30 PM",
        body: "Hi Mike,\n\nThe 409A firm sent over the draft valuation report. A few things that jumped out to me:\n\n1. They're using a 35% DLOM — up from 30% last year. Seems aggressive.\n2. Revenue multiple of 4.2x feels conservative given we grew 40% YoY\n3. Common stock fair value came in at $1.82/share vs. $2.15 last round\n\nI'm not sure if I should push back on the DLOM or the revenue multiple first. What's your read?\n\nThey want our comments back by April 8.\n\nThanks,\nLisa" },
    ],
  },
  {
    id: "t3", accountId: "a3",
    subject: "Revenue recognition on NIH grant milestone",
    status: "needs_response", starred: false,
    lastActivity: "5 hours ago", lastActivityTs: Date.now() - 18000000,
    preview: "We hit the Phase 1 milestone on the NIH grant and received the $450K...",
    participants: [{ name: "James Whitfield", email: "james@heliospharma.com", role: "Controller" }],
    messages: [
      { id: "m6", from: { name: "James Whitfield", email: "james@heliospharma.com" }, time: "Mar 28, 2:15 PM",
        body: "Mike,\n\nQuick question on the NIH grant. We're about to hit the Phase 1 milestone and I want to make sure I handle the accounting correctly. The grant agreement specifies $450K for 'completion of Phase 1 clinical endpoints.' Should I set up a receivable now or wait until the milestone is formally certified?\n\nAlso, do you have a preference on whether we use ASC 606 or ASC 958 for grants? I've seen it done both ways.\n\nThanks,\nJames" },
      { id: "m7", from: { name: "You", email: "mike@heliospharma.com" }, time: "Mar 28, 4:45 PM",
        body: "James — Good question. Let's wait for formal certification before recognizing the receivable. On the accounting framework, for government grants like NIH, I generally prefer ASC 958 (contributions) rather than 606.\n\nThat said, let's discuss once you actually hit the milestone and I can review the specific language in the grant agreement.\n\nBest,\nMike" },
      { id: "m8", from: { name: "James Whitfield", email: "james@heliospharma.com" }, time: "Today, 10:22 AM",
        body: "Mike,\n\nWe hit the Phase 1 milestone last week and received the $450K payment yesterday. I'm ready to book this but had a complication — the primary endpoint was met, but we're still running some secondary analyses.\n\nDo we recognize the full $450K now since the primary endpoint is complete, or should we defer a portion? The grant language says 'satisfactory completion of Phase 1 clinical endpoints' — plural.\n\nOur auditors are going to ask about this for the Q1 review.\n\nThanks,\nJames" },
    ],
  },
  {
    id: "t4", accountId: "a4",
    subject: "Credit facility — revised term sheet from SVB",
    status: "needs_response", starred: false,
    lastActivity: "2 days ago", lastActivityTs: Date.now() - 172800000,
    preview: "Got the revised term sheet back from SVB. They moved on the interest rate...",
    participants: [
      { name: "Carlos Mendez", email: "carlos@nimbuslogistics.com", role: "CEO" },
      { name: "Sarah Chen",   email: "sarah@nimbuslogistics.com",  role: "VP Finance" },
    ],
    messages: [
      { id: "m9", from: { name: "Carlos Mendez", email: "carlos@nimbuslogistics.com" }, time: "Apr 1, 10:30 AM",
        body: "Mike, Sarah —\n\nGot the revised term sheet back from SVB. They moved on the interest rate (SOFR + 275bps, down from 325) and the revenue covenant (dropped from 1.5x to 1.25x). But they're still asking for a personal guarantee from me on the first $500K.\n\nMike — can you review the financial covenants and let me know if there are any red flags? Also curious if the personal guarantee is standard for a company our size or if we should push back.\n\nCarlos" },
      { id: "m10", from: { name: "Sarah Chen", email: "sarah@nimbuslogistics.com" }, time: "Apr 1, 11:15 AM",
        body: "I pulled our latest numbers against the proposed covenants. At our current revenue run rate, we have about 30% headroom on the 1.25x revenue covenant. The fixed charge coverage ratio of 1.1x is tighter — we're at about 1.3x right now, so not a ton of cushion if we have a bad quarter.\n\nMike, do you think we should try to negotiate the FCCR down to 1.0x?\n\nSarah" },
    ],
  },
  {
    id: "t5", accountId: "a5",
    subject: "QuickBooks setup — chart of accounts review",
    status: "waiting", starred: false,
    lastActivity: "4 days ago", lastActivityTs: Date.now() - 345600000,
    preview: "Here's the draft chart of accounts I put together based on our onboarding call...",
    participants: [{ name: "Tom Bradley", email: "tom@ridgelinedata.io", role: "CEO / Founder" }],
    messages: [
      { id: "m11", from: { name: "You", email: "torres@ridgelinedata.io" }, time: "Mar 31, 2:00 PM",
        body: "Tom,\n\nHere's the draft chart of accounts I put together based on our onboarding call. I've organized it to support both your current operations and future reporting needs once you start fundraising.\n\nA few notes:\n- I separated R&D expenses into internal vs. contracted to make it easier to track for potential R&D tax credits\n- Added sub-accounts for each major revenue stream\n- Set up a deferred revenue account for annual contracts\n\nTake a look and let me know if anything seems off.\n\nBest,\nMike" },
    ],
  },
  {
    id: "t6", accountId: "a1",
    subject: "Re: Weekend plans",
    status: "fyi", starred: false,
    lastActivity: "1 day ago", lastActivityTs: Date.now() - 90000000,
    preview: "Sounds great! We'll meet at the trailhead at 8am Saturday.",
    participants: [{ name: "Sarah Torres", email: "sarah.torres@gmail.com", role: "" }],
    messages: [
      { id: "m12", from: { name: "Sarah Torres", email: "sarah.torres@gmail.com" }, time: "Yesterday, 6:30 PM",
        body: "Sounds great! We'll meet at the trailhead at 8am Saturday. Don't forget the sunscreen this time 😄" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   TIME HELPERS (snooze / schedule)
   ═══════════════════════════════════════════════════════════════════ */
function getLaterToday() { return Date.now() + 3 * 60 * 60 * 1000; }
function getTomorrowMorning() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime();
}
function getNextMondayMorning() {
  const d = new Date(); const day = d.getDay();
  const daysUntil = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntil); d.setHours(9, 0, 0, 0); return d.getTime();
}
function formatSnoozeTime(ts) {
  const d = new Date(ts); const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today at ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${time}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ` at ${time}`;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

// Decode common HTML entities (works in both SSR and browser, no hydration mismatch)
function decodeHTMLEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Strip HTML tags and decode entities — for rendering email body as plain text
function stripHtmlAndDecode(str) {
  if (!str) return "";
  return decodeHTMLEntities(
    str
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function mapGmailToThreads(messages, accountId = "gmail-real") {
  const byThread = {};
  for (const m of messages) {
    const tid = m.threadId || m.id;
    if (!byThread[tid]) byThread[tid] = [];
    byThread[tid].push(m);
  }
  return Object.entries(byThread).map(([tid, msgs]) => {
    msgs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = msgs[msgs.length - 1];
    const participantSet = new Map();
    for (const m of msgs) {
      const rawName = m.from?.split("<")[0]?.trim().replace(/"/g, "") || m.from || "Unknown";
      const email   = m.from?.match(/<(.+?)>/)?.[1] || m.from || "";
      if (!participantSet.has(email)) participantSet.set(email, { name: rawName, email, role: "" });
    }
    const elapsed = Date.now() - new Date(last.date).getTime();
    const lastActivity = elapsed < 3600000
      ? `${Math.round(elapsed / 60000)}m ago`
      : elapsed < 86400000
        ? `${Math.round(elapsed / 3600000)}h ago`
        : `${Math.round(elapsed / 86400000)}d ago`;
    // Use the real threadId (without account prefix) for API calls
    const realThreadId = last._realThreadId || tid;
    const threadAccountEmail = last.accountEmail;
    return {
      id: tid, accountId,
      _realThreadId: realThreadId,
      _accountEmail: threadAccountEmail,
      subject: last.subject || "(no subject)",
      status: "needs_response", starred: false,
      lastActivity, lastActivityTs: new Date(last.date).getTime(),
      preview: decodeHTMLEntities(last.snippet || ""),
      participants: Array.from(participantSet.values()),
      messages: msgs.map(m => ({
        id: m.id,
        from: {
          name:  m.from?.split("<")[0]?.trim().replace(/"/g, "") || m.from || "Unknown",
          email: m.from?.match(/<(.+?)>/)?.[1] || m.from || "",
        },
        time: new Date(m.date).toLocaleDateString("en-US", {
          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        }),
        body: stripHtmlAndDecode(m.body || m.snippet || ""),
      })),
    };
  });
}

async function generateDraft(thread, accounts, tone = "professional") {
  const acct = accounts.find(a => a.id === thread.accountId);
  try {
    const r = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadMessages: thread.messages.map(m => ({
          from: { name: m.from.name, email: m.from.email },
          time: m.time,
          body: m.body,
        })),
        userName: acct?.name || "",
        userEmail: acct?.email || "",
        tone,
      }),
    });
    const d = await r.json();
    if (d.error) return d.error;
    return d.content?.map(b => b.text || "").join("") || "Unable to generate draft.";
  } catch {
    return "Draft generation unavailable. Please compose manually.";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ═══════════════════════════════════════════════════════════════════ */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Orbital error boundary caught:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-[#0c0d10]">
          <div className="w-12 h-12 rounded-xl bg-[#1c1418] border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <p className="text-[14px] font-semibold text-[#e2e4e9] mb-1">Something went wrong</p>
          <p className="text-[12px] text-[#5c6270] mb-5 max-w-xs">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-[12px] text-[#5B8EF8] hover:text-[#7CA4F8] transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UI ATOMS
   ═══════════════════════════════════════════════════════════════════ */
function Avatar({ name, email, color, size = 32 }) {
  const label = name ? initials(name) : (email || "?").slice(0, 2).toUpperCase();
  const bg    = color || "#4F7EF7";
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-semibold text-white select-none"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.37) }}
    >
      {label}
    </div>
  );
}

function StatusBadge({ status, size = "sm" }) {
  const s = STATUS[status];
  if (!s) return null;
  const { Icon, label, color, bg, bdr } = s;
  if (size === "xs") return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color} ${bg} ${bdr}`}>
      <Icon size={9} />{label}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${color} ${bg} ${bdr}`}>
      <Icon size={10} />{label}
    </span>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      className="animate-spin flex-shrink-0" style={{ animationDuration: "0.7s" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SNOOZE MENU
   ═══════════════════════════════════════════════════════════════════ */
function SnoozeMenu({ onSnooze, onClose }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; });
  const [customTime, setCustomTime] = useState("09:00");
  const menuRef = useRef(null);
  useEffect(() => {
    function outside(e) { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [onClose]);
  function handleCustom() {
    const d = new Date(customDate + "T" + customTime);
    if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
    onSnooze(d.getTime());
  }
  const opts = [
    { label: "Later today",       sub: "In 3 hours",       ts: getLaterToday() },
    { label: "Tomorrow morning",  sub: "9:00 AM",          ts: getTomorrowMorning() },
    { label: "Next week",         sub: "Monday 9:00 AM",   ts: getNextMondayMorning() },
  ];
  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-1 z-[100] bg-[#1a1c22] border border-[#2a2d38] rounded-xl shadow-2xl py-1.5 w-56 anim-scale">
      <p className="px-3 py-1 text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest">Snooze until…</p>
      {opts.map(o => (
        <button key={o.label} onClick={() => onSnooze(o.ts)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-[#22252e] transition-colors text-[#7a7f8e] hover:text-[#c8ccd4]">
          <span>{o.label}</span>
          <span className="text-[10px] text-[#3a3f4c]">{o.sub}</span>
        </button>
      ))}
      <div className="mx-3 mt-1 pt-1 border-t border-[#1e2028]">
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)}
            className="w-full flex items-center gap-2 py-2.5 text-[13px] text-[#7a7f8e] hover:text-[#c8ccd4] transition-colors">
            <Calendar size={12} className="flex-shrink-0" />Custom date &amp; time
          </button>
        ) : (
          <div className="py-2 space-y-2">
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
              className="w-full bg-[#111318] border border-[#2a2d38] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:outline-none focus:border-[#3a4050]" />
            <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
              className="w-full bg-[#111318] border border-[#2a2d38] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:outline-none focus:border-[#3a4050]" />
            <button onClick={handleCustom}
              className="w-full py-2 rounded-lg bg-[#5B8EF8] text-white text-[12px] font-semibold hover:bg-[#4a7def] transition-colors">
              Snooze
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SCHEDULE MENU
   ═══════════════════════════════════════════════════════════════════ */
function ScheduleMenu({ onSchedule, onClose }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; });
  const [customTime, setCustomTime] = useState("09:00");
  const menuRef = useRef(null);
  useEffect(() => {
    function outside(e) { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [onClose]);
  function handleCustom() {
    const d = new Date(customDate + "T" + customTime);
    if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
    onSchedule(d.getTime());
  }
  const opts = [
    { label: "Send later today",        sub: "In 3 hours",       ts: getLaterToday() },
    { label: "Send tomorrow morning",   sub: "9:00 AM",          ts: getTomorrowMorning() },
    { label: "Send Monday morning",     sub: "9:00 AM",          ts: getNextMondayMorning() },
  ];
  return (
    <div ref={menuRef} className="absolute right-0 bottom-full mb-2 z-[100] bg-[#1a1c22] border border-[#2a2d38] rounded-xl shadow-2xl py-1.5 w-60 anim-scale">
      <p className="px-3 py-1 text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest">Schedule send…</p>
      {opts.map(o => (
        <button key={o.label} onClick={() => onSchedule(o.ts)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] hover:bg-[#22252e] transition-colors text-[#7a7f8e] hover:text-[#c8ccd4]">
          <span>{o.label}</span>
          <span className="text-[10px] text-[#3a3f4c]">{o.sub}</span>
        </button>
      ))}
      <div className="mx-3 mt-1 pt-1 border-t border-[#1e2028]">
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)}
            className="w-full flex items-center gap-2 py-2.5 text-[13px] text-[#7a7f8e] hover:text-[#c8ccd4] transition-colors">
            <Calendar size={12} className="flex-shrink-0" />Pick date &amp; time
          </button>
        ) : (
          <div className="py-2 space-y-2">
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
              className="w-full bg-[#111318] border border-[#2a2d38] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:outline-none focus:border-[#3a4050]" />
            <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
              className="w-full bg-[#111318] border border-[#2a2d38] rounded-lg px-2.5 py-1.5 text-[12px] text-[#c8ccd4] focus:outline-none focus:border-[#3a4050]" />
            <button onClick={handleCustom}
              className="w-full py-2 rounded-lg bg-[#5B8EF8] text-white text-[12px] font-semibold hover:bg-[#4a7def] transition-colors">
              Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SNOOZED PANEL
   ═══════════════════════════════════════════════════════════════════ */
function SnoozedPanel({ snoozedThreads, accounts, onUnsnooze }) {
  return (
    <div className="flex flex-col h-full bg-[#0c0d10]">
      <div className="px-4 pt-4 pb-3 border-b border-[#1e2028] flex-shrink-0">
        <h2 className="text-[14px] font-semibold text-[#e2e4e9] tracking-tight">Snoozed</h2>
        <p className="text-[11px] text-[#3a3f4c] mt-0.5">Threads return to inbox when the time arrives.</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {snoozedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <BellOff size={20} className="text-[#2e3240] mb-2" />
            <p className="text-sm font-medium text-[#3a3f4c]">No snoozed threads</p>
          </div>
        ) : snoozedThreads.map(item => {
          const acct = accounts.find(a => a.id === item.thread.accountId);
          const sender = item.thread.participants[0];
          return (
            <div key={item.threadId} className="flex items-start gap-3 px-4 py-3.5 border-b border-[#171920] hover:bg-[#14161e] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {acct && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: acct.color }} />}
                  <span className="text-[13px] font-medium text-[#7a7f8e] truncate">{sender?.name || sender?.email}</span>
                </div>
                <p className="text-[12px] text-[#5c6270] truncate">{item.thread.subject}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock size={10} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-amber-400">{formatSnoozeTime(item.snoozeUntil)}</span>
                </div>
              </div>
              <button onClick={() => onUnsnooze(item.threadId)}
                className="text-[11px] text-[#3a3f4c] hover:text-[#8b8f9a] transition-colors px-2 py-1 rounded-lg hover:bg-[#1e2028] flex-shrink-0 mt-0.5">
                Unsnooze
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SCHEDULED PANEL
   ═══════════════════════════════════════════════════════════════════ */
function ScheduledPanel({ scheduledMessages, onCancel }) {
  const pending = scheduledMessages.filter(m => m.status === "pending");
  const recent = scheduledMessages.filter(m => m.status !== "pending").slice(-5).reverse();
  return (
    <div className="flex flex-col h-full bg-[#0c0d10]">
      <div className="px-4 pt-4 pb-3 border-b border-[#1e2028] flex-shrink-0">
        <h2 className="text-[14px] font-semibold text-[#e2e4e9] tracking-tight">Scheduled</h2>
        <p className="text-[11px] text-[#3a3f4c] mt-0.5">Messages queued to send automatically.</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <CalendarClock size={20} className="text-[#2e3240] mb-2" />
            <p className="text-sm font-medium text-[#3a3f4c]">No scheduled messages</p>
          </div>
        ) : (
          <>
            {pending.map(msg => (
              <div key={msg.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-[#171920] hover:bg-[#14161e] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#b0b4be] truncate">{msg.subject}</p>
                  <p className="text-[11px] text-[#5c6270] truncate">To: {msg.to}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CalendarClock size={10} className="text-[#5B8EF8] flex-shrink-0" />
                    <span className="text-[11px] text-[#5B8EF8]">{formatSnoozeTime(msg.scheduledAt)}</span>
                  </div>
                </div>
                <button onClick={() => onCancel(msg.id)}
                  className="text-[11px] text-[#3a3f4c] hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-[#1e2028] flex-shrink-0 mt-0.5">
                  Cancel
                </button>
              </div>
            ))}
            {recent.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-[10px] font-bold text-[#2e3240] uppercase tracking-widest mb-2">Recent</p>
                {recent.map(msg => (
                  <div key={msg.id} className="flex items-start gap-3 py-2.5 border-b border-[#171920]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#4a4f5c] truncate">{msg.subject}</p>
                      <p className="text-[11px] text-[#3a3f4c] truncate">To: {msg.to}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                      msg.status === "sent" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-red-400 border-red-500/20 bg-red-500/10"
                    }`}>{msg.status === "sent" ? "Sent" : "Failed"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIGN-IN VIEW
   ═══════════════════════════════════════════════════════════════════ */
function SignInView({ onDemo }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0c0d10] px-6 text-center anim-fade overflow-y-auto py-10">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B8EF8] to-[#7C5CF8] flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
          <Zap size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-[#e2e4e9] tracking-tight">Orbital</h1>
        <p className="text-sm text-[#5c6270] mt-1.5">All your email, one inbox.</p>
      </div>

      {/* Feature list */}
      <div className="w-full max-w-xs mb-8 space-y-3 text-left">
        {[
          { Icon: Inbox,        text: "Unified inbox across all Gmail accounts" },
          { Icon: Sparkles,     text: "AI-powered draft generation" },
          { Icon: CheckCircle2, text: "Smart per-thread status tracking" },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-[#8b8f9a]">
            <div className="w-7 h-7 rounded-lg bg-[#1a1c22] flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-[#5B8EF8]" />
            </div>
            {text}
          </div>
        ))}
      </div>

      {/* Google sign-in */}
      <button
        onClick={() => { setLoading(true); signIn("google"); }}
        disabled={loading}
        className="w-full max-w-xs flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-white text-[#1a1a1a] font-semibold text-sm hover:bg-gray-100 active:scale-[0.98] transition-all min-h-[48px] shadow"
      >
        {loading ? <Spinner size={18} /> : (
          <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        )}
        {loading ? "Connecting…" : "Continue with Google"}
      </button>

      <button
        onClick={onDemo}
        className="mt-3 text-sm text-[#5c6270] hover:text-[#8b8f9a] transition-colors min-h-[44px] px-4"
      >
        Try demo instead
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR (desktop)
   ═══════════════════════════════════════════════════════════════════ */
function Sidebar({ accounts, activeAccountId, onSelectAccount, onAddAccount, filter, onSetFilter, view, onSetView, session, snoozedCount, scheduledCount }) {
  const [expanded, setExpanded] = useState(true);

  const NAV = [
    { id: "all",            Icon: Inbox,         label: "All Mail" },
    { id: "needs_response", Icon: PenLine,       label: "Needs Reply" },
    { id: "waiting",        Icon: Clock,         label: "Waiting" },
    { id: "starred",        Icon: Star,          label: "Starred" },
    { id: "resolved",       Icon: CheckCircle2,  label: "Done" },
    { id: "archived",       Icon: Archive,       label: "Archived" },
    { id: "snoozed",        Icon: BellOff,       label: "Snoozed",   count: snoozedCount },
    { id: "scheduled",      Icon: CalendarClock, label: "Scheduled", count: scheduledCount },
  ];

  return (
    <aside className="flex flex-col h-full bg-[#111318] border-r border-[#1e2028] w-52 flex-shrink-0 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5B8EF8] to-[#7C5CF8] flex items-center justify-center flex-shrink-0 shadow shadow-blue-500/20">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-[#e2e4e9] text-[15px] tracking-tight">Orbital</span>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-0.5 flex-shrink-0">
        {NAV.map(({ id, Icon, label, count }) => {
          const active = filter === id && view !== "settings";
          return (
            <button
              key={id}
              onClick={() => { onSetFilter(id); onSetView("inbox"); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors min-h-[36px] text-left
                ${active ? "bg-[#1a1f2e] text-[#5B8EF8]" : "text-[#6b7280] hover:text-[#b0b4be] hover:bg-[#16181f]"}`}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-[#5B8EF8]/20 text-[#5B8EF8]" : "bg-[#1e2028] text-[#4a4f5c]"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Accounts */}
      <div className="mt-4 px-2 flex-1 overflow-y-auto">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest hover:text-[#5c6270] transition-colors"
        >
          <span>Accounts</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`} />
        </button>

        {expanded && (
          <div className="mt-1 space-y-0.5">
            {accounts.map(acct => {
              const active = activeAccountId === acct.id;
              return (
                <button
                  key={acct.id}
                  onClick={() => onSelectAccount(active ? null : acct.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors min-h-[36px] text-left
                    ${active ? "bg-[#16181f] text-[#c8ccd4]" : "text-[#6b7280] hover:text-[#a0a4b0] hover:bg-[#16181f]"}`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acct.color }} />
                  <span className="truncate">{acct.label}</span>
                  {active && <Check size={11} className="ml-auto flex-shrink-0 text-[#5B8EF8]" />}
                </button>
              );
            })}

            {/* Connect account */}
            <button
              onClick={onAddAccount}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#5B8EF8] hover:bg-[#1a1f2e] transition-colors min-h-[36px] text-left font-medium"
            >
              <Plus size={13} className="flex-shrink-0" />
              Connect account
            </button>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-2 pb-4 pt-2 border-t border-[#1e2028] flex-shrink-0">
        <button
          onClick={() => onSetView(view === "settings" ? "inbox" : "settings")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors min-h-[36px]
            ${view === "settings" ? "bg-[#16181f] text-[#c8ccd4]" : "text-[#6b7280] hover:text-[#a0a4b0] hover:bg-[#16181f]"}`}
        >
          <Settings size={14} className="flex-shrink-0" />
          Settings
        </button>

        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mt-0.5 group">
            <Avatar name={session.user.name || session.user.email} size={22} color="#5B8EF8" />
            <p className="text-[11px] text-[#5c6270] truncate flex-1">{session.user.name || session.user.email}</p>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="opacity-0 group-hover:opacity-100 text-[#3a3f4c] hover:text-[#6b7280] transition-all"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THREAD LIST ITEM
   ═══════════════════════════════════════════════════════════════════ */
function ThreadItem({ thread, accounts, isActive, onSelect }) {
  const acct      = accounts.find(a => a.id === thread.accountId);
  const isUnread  = thread.status === "needs_response";
  const sender    = thread.participants[0];

  return (
    <button
      onClick={() => onSelect(thread.id)}
      className={`w-full text-left flex items-stretch border-b border-[#171920] transition-colors min-h-[80px]
        ${isActive ? "bg-[#1a1f2e]" : "hover:bg-[#14161e] active:bg-[#16181f]"}`}
    >
      {/* Left color stripe */}
      <div
        className="w-[3px] flex-shrink-0 rounded-none transition-colors"
        style={{ background: isActive ? (acct?.color || "#5B8EF8") : "transparent" }}
      />

      <div className="flex-1 min-w-0 px-4 py-3.5">
        {/* Row 1: sender + time */}
        <div className="flex items-center gap-2 mb-1">
          {isUnread && (
            <div className="w-[6px] h-[6px] rounded-full bg-[#5B8EF8] flex-shrink-0" />
          )}
          <span className={`text-[13px] flex-1 truncate leading-tight
            ${isUnread ? "font-semibold text-[#e2e4e9]" : "font-medium text-[#7a7f8e]"}`}>
            {sender?.name || sender?.email || "Unknown"}
          </span>
          <span className="text-[11px] text-[#3a3f4c] flex-shrink-0 ml-1">{thread.lastActivity}</span>
          {thread.starred && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
        </div>

        {/* Row 2: subject */}
        <p className={`text-[12px] truncate leading-tight
          ${isUnread ? "text-[#b0b4be] font-medium" : "text-[#5c6270]"}`}>
          {thread.subject}
        </p>

        {/* Row 3: preview + badge */}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[11px] text-[#3a3f4c] truncate flex-1">{thread.preview}</p>
          {thread.status !== "needs_response" && (
            <StatusBadge status={thread.status} size="xs" />
          )}
        </div>

        {/* Account label */}
        {acct && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: acct.color }} />
            <span className="text-[10px] text-[#2e3240]">{acct.label}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THREAD LIST PANEL
   ═══════════════════════════════════════════════════════════════════ */
function ThreadListPanel({
  threads, accounts, activeId, filter, onSetFilter,
  search, onSearch, onSelect, loading, onRefresh, isDemo,
  // Search
  onSubmitSearch, searchResults, searchLoading, searchError,
  aiSearch, onToggleAiSearch, activeSearchQuery, onClearSearch,
}) {
  const CHIPS = [
    { id: "all",            label: "All" },
    { id: "needs_response", label: "Reply" },
    { id: "waiting",        label: "Waiting" },
    { id: "resolved",       label: "Done" },
    { id: "starred",        label: "Starred" },
  ];

  const isSearchMode = searchResults !== null;

  const visible = useMemo(() => {
    if (isSearchMode) return searchResults || [];
    let t = [...threads];
    if (filter === "starred")          t = t.filter(x => x.starred);
    else if (filter === "archived")    t = t.filter(x => x.status === "archived");
    else if (filter !== "all" && STATUS[filter]) t = t.filter(x => x.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(x =>
        x.subject.toLowerCase().includes(q) ||
        x.preview.toLowerCase().includes(q) ||
        x.participants.some(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      );
    }
    return t.sort((a, b) => b.lastActivityTs - a.lastActivityTs);
  }, [threads, filter, search, isSearchMode, searchResults]);

  const TITLE_MAP = {
    all: "All Mail", needs_response: "Needs Reply",
    waiting: "Waiting", starred: "Starred",
    resolved: "Done", archived: "Archived",
  };

  function handleSearchKeyDown(e) {
    if (e.key === "Enter" && search.trim() && !isDemo) {
      onSubmitSearch(search);
    }
    if (e.key === "Escape" && isSearchMode) {
      onClearSearch();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0c0d10]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-[#e2e4e9] tracking-tight">
            {isSearchMode
              ? <span className="text-[#5B8EF8]">Search Results</span>
              : (TITLE_MAP[filter] || "Inbox")
            }
          </h2>
          <div className="flex items-center gap-1">
            {isDemo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a1a05] text-amber-400 border border-amber-500/20 font-semibold tracking-wide">DEMO</span>
            )}
            {!isSearchMode && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#16181f] text-[#3a3f4c] hover:text-[#8b8f9a] transition-colors disabled:opacity-50"
                title="Refresh"
              >
                {loading ? <Spinner size={13} /> : <RefreshCw size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a3f4c] pointer-events-none" />
          <input
            value={search}
            onChange={e => { onSearch(e.target.value); }}
            onKeyDown={handleSearchKeyDown}
            placeholder={aiSearch ? "Describe what you're looking for…" : "Search threads… (Enter to search)"}
            className={`w-full pl-8 py-2 bg-[#16181f] border rounded-lg text-[13px] text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none transition-colors ${
              isSearchMode ? "pr-8 border-[#5B8EF8]/30 focus:border-[#5B8EF8]/50" : "pr-16 border-[#1e2028] focus:border-[#2a3040]"
            }`}
          />
          {/* AI toggle (only when not in search mode) */}
          {!isSearchMode && !isDemo && (
            <button
              onClick={onToggleAiSearch}
              title={aiSearch ? "AI search on — queries interpreted as natural language" : "AI search off — queries use Gmail syntax"}
              className={`absolute right-7 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded transition-colors ${
                aiSearch
                  ? "text-[#7C5CF8]"
                  : "text-[#2e3240] hover:text-[#5c6270]"
              }`}
            >
              <Sparkles size={11} />
            </button>
          )}
          {/* Clear button */}
          {(search || isSearchMode) && (
            <button
              onClick={() => { onSearch(""); if (isSearchMode) onClearSearch(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a4f5c] hover:text-[#8b8f9a]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* AI badge + result count row, or filter chips */}
        {isSearchMode ? (
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {aiSearch && (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#1a1030] text-[#7C5CF8] border border-purple-500/20 font-semibold">
                  <Sparkles size={8} />AI
                </span>
              )}
              <span className="text-[11px] text-[#3a3f4c] truncate">
                {searchLoading
                  ? "Searching…"
                  : searchError
                    ? <span className="text-red-400">{searchError}</span>
                    : `${visible.length} result${visible.length !== 1 ? "s" : ""} for "${activeSearchQuery}"`
                }
              </span>
            </div>
            <button
              onClick={onClearSearch}
              className="flex-shrink-0 text-[11px] text-[#5B8EF8] hover:text-[#7CA4F8] ml-2 whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex gap-1 mt-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {/* AI hint when aiSearch is on */}
            {aiSearch && !isDemo && (
              <span className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-[#7C5CF8] bg-[#1a1030] border border-purple-500/20">
                <Sparkles size={9} />AI on
              </span>
            )}
            {CHIPS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onSetFilter(id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors
                  ${filter === id
                    ? "bg-[#1a2a4a] text-[#5B8EF8] border border-blue-500/25"
                    : "text-[#3a3f4c] hover:text-[#6b7280] border border-transparent"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {(loading && visible.length === 0 && !isSearchMode) || searchLoading ? (
          <div className="px-4 pt-3 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="py-1">
                <div className="flex justify-between mb-2"><div className="skeleton h-3 w-24" /><div className="skeleton h-3 w-10" /></div>
                <div className="skeleton h-3 w-44 mb-1.5" />
                <div className="skeleton h-2.5 w-36" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6 anim-fade">
            <div className="w-10 h-10 rounded-xl bg-[#16181f] flex items-center justify-center mb-3">
              <Inbox size={17} className="text-[#2e3240]" />
            </div>
            <p className="text-sm font-medium text-[#3a3f4c]">
              {isSearchMode ? "No results found" : "Nothing here"}
            </p>
            <p className="text-xs text-[#2e3240] mt-1">
              {isSearchMode
                ? "Try a different search query"
                : search ? "Try a different search" : "You're all caught up"
              }
            </p>
            {isSearchMode && (
              <button
                onClick={onClearSearch}
                className="mt-3 text-xs text-[#5B8EF8] hover:text-[#7CA4F8]"
              >
                Back to inbox
              </button>
            )}
          </div>
        ) : (
          <div className="anim-fade">
            {visible.map(t => (
              <ThreadItem
                key={t.id}
                thread={t}
                accounts={accounts}
                isActive={t.id === activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REPLY BOX
   ═══════════════════════════════════════════════════════════════════ */
function ReplyBox({ thread, accounts, isDemo, isOnline = true }) {
  const [open,    setOpen]    = useState(false);
  const [body,    setBody]    = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);
  const [aiUsed,  setAiUsed]  = useState(false);
  const [tone,    setTone]    = useState("professional");
  const textareaRef = useRef(null);

  const acct    = accounts.find(a => a.id === thread.accountId);
  const lastMsg = thread.messages[thread.messages.length - 1];
  const replyTo = lastMsg?.from?.email;

  useEffect(() => { if (open) textareaRef.current?.focus(); }, [open]);

  // Listen for command-palette triggered actions
  useEffect(() => {
    function onOpenReply()   { setOpen(true); }
    function onOpenAIDraft() { handleGenerate(); }
    window.addEventListener("orbital:openReply",   onOpenReply);
    window.addEventListener("orbital:openAIDraft", onOpenAIDraft);
    return () => {
      window.removeEventListener("orbital:openReply",   onOpenReply);
      window.removeEventListener("orbital:openAIDraft", onOpenAIDraft);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setOpen(true);
    setDrafting(true);
    setAiUsed(true);
    const draft = await generateDraft(thread, accounts, tone);
    setBody(draft);
    setDrafting(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleSend() {
    if (!body.trim()) return;
    if (isDemo) {
      setSent(true);
      setBody("");
      setOpen(false);
      setTimeout(() => setSent(false), 2500);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo,
          subject: `Re: ${thread.subject}`,
          body,
          replyToMessageId: lastMsg?.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Send failed (${res.status})`);
      }
      setSent(true);
      setBody("");
      setOpen(false);
      setTimeout(() => setSent(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) return (
    <div className="flex items-center gap-2 px-5 py-4 bg-emerald-500/10 border-t border-emerald-500/20 anim-fade flex-shrink-0">
      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
      <span className="text-sm text-emerald-400 font-medium">Sent!</span>
    </div>
  );

  if (!open) return (
    <div className="px-4 py-3.5 border-t border-[#1e2028] flex items-center gap-2.5 flex-shrink-0">
      <button
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#16181f] border border-[#1e2028] text-[#3a3f4c] hover:border-[#2a2d3a] hover:text-[#5c6270] transition-all text-[13px] text-left min-h-[44px]"
      >
        <CornerDownRight size={13} className="flex-shrink-0" />
        Reply to {lastMsg?.from?.name?.split(" ")[0] || "thread"}…
      </button>
      <button
        onClick={handleGenerate}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1a1f2e] border border-blue-500/20 text-[#5B8EF8] hover:bg-[#1e2535] hover:border-blue-500/35 transition-all text-[13px] font-medium min-h-[44px] flex-shrink-0"
      >
        <Sparkles size={13} />
        <span className="hidden sm:inline">AI Draft</span>
      </button>
    </div>
  );

  return (
    <div className="border-t border-[#1e2028] flex-shrink-0 anim-slide-up">
      {/* Compose header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1c22]">
        <div className="flex items-center gap-2 text-[11px] text-[#4a4f5c]">
          <span>To:</span>
          <span className="text-[#7a7f8e] truncate max-w-[200px]">{replyTo}</span>
          {aiUsed && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-[#5B8EF8]">
              <Sparkles size={9} /> AI
            </div>
          )}
        </div>
        <button
          onClick={() => { setOpen(false); setBody(""); setError(null); setAiUsed(false); }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1e2028] text-[#3a3f4c] hover:text-[#8b8f9a] transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Loading state */}
      {drafting ? (
        <div className="flex items-center gap-3 px-4 py-5 text-[13px] text-[#5c6270]">
          <Spinner size={15} />
          <span>Drafting {tone} reply…</span>
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={`Reply as ${acct?.email || "you"}…`}
            rows={5}
            className="w-full px-4 py-3 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] resize-none focus:outline-none leading-relaxed"
          />
          {error && (
            <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
              <AlertCircle size={12} />{error}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1c22]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-[12px] text-[#5B8EF8] hover:text-[#7aaafe] transition-colors min-h-[36px] px-1"
              >
                <Sparkles size={12} />
                {aiUsed ? "Regenerate" : "Draft with AI"}
              </button>
              <div className="flex items-center gap-0.5 pl-2 border-l border-[#1e2028]">
                {["professional", "casual", "brief"].map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-colors ${
                      tone === t
                        ? "bg-blue-500/15 text-[#5B8EF8] border border-blue-500/30"
                        : "text-[#3a3f4c] hover:text-[#5c6270] border border-transparent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !body.trim() || !isOnline}
              title={!isOnline ? "Connect to internet to send" : undefined}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5B8EF8] text-white text-[13px] font-semibold hover:bg-[#4a7def] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
            >
              {sending ? <Spinner size={13} /> : <Send size={12} />}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THREAD DETAIL
   ═══════════════════════════════════════════════════════════════════ */
function ThreadDetail({ thread, accounts, onBack, onStatusChange, onToggleStar, onSnooze, isMobile, isDemo, isOnline = true }) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const menuRef   = useRef(null);
  const snoozeRef = useRef(null);
  const acct     = accounts.find(a => a.id === thread.accountId);
  const acctEmails = accounts.map(a => a.email);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (snoozeRef.current && !snoozeRef.current.contains(e.target)) setSnoozeOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0c0d10] anim-fade">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3.5 border-b border-[#1e2028] flex-shrink-0">
        {isMobile && (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] text-[#5c6270] hover:text-[#c8ccd4] transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div className="flex-1 min-w-0 pt-0.5">
          <h2 className="text-[15px] font-semibold text-[#e2e4e9] leading-snug line-clamp-2">{thread.subject}</h2>
          {acct && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: acct.color }} />
              <span className="text-[11px] text-[#3a3f4c]">{acct.label} · {acct.email}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onToggleStar(thread.id)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] transition-colors"
            title={thread.starred ? "Unstar" : "Star"}
          >
            <Star size={14} className={thread.starred ? "text-amber-400 fill-amber-400" : "text-[#3a3f4c] hover:text-[#6b7280]"} />
          </button>

          <div ref={snoozeRef} className="relative">
            <button
              onClick={() => setSnoozeOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] transition-colors"
              title="Snooze (h)"
            >
              <BellOff size={14} className={snoozeOpen ? "text-amber-400" : "text-[#3a3f4c] hover:text-[#6b7280]"} />
            </button>
            {snoozeOpen && (
              <SnoozeMenu
                onSnooze={ts => { onSnooze(thread.id, ts); setSnoozeOpen(false); }}
                onClose={() => setSnoozeOpen(false)}
              />
            )}
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] text-[#3a3f4c] hover:text-[#6b7280] transition-colors"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 bg-[#1a1c22] border border-[#2a2d38] rounded-xl shadow-2xl py-1.5 w-44 anim-scale">
                <p className="px-3 py-1 text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest">Status</p>
                {Object.entries(STATUS).map(([key, { label, Icon, color }]) => (
                  <button
                    key={key}
                    onClick={() => { onStatusChange(thread.id, key); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#22252e] transition-colors min-h-[36px]
                      ${thread.status === key ? color : "text-[#7a7f8e]"}`}
                  >
                    <Icon size={13} className="flex-shrink-0" />
                    {label}
                    {thread.status === key && <Check size={11} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#171920] flex-shrink-0">
        <div className="flex -space-x-1.5">
          {thread.participants.slice(0, 4).map(p => (
            <Avatar
              key={p.email} name={p.name} size={22}
              color={ACCT_COLORS[Math.abs((p.email || "a").charCodeAt(0) - 97) % ACCT_COLORS.length]}
            />
          ))}
        </div>
        <p className="text-[11px] text-[#4a4f5c] truncate flex-1">
          {thread.participants.map(p => p.name || p.email).join(", ")}
        </p>
        <StatusBadge status={thread.status} size="xs" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {thread.messages.map(msg => {
          const isMe = acctEmails.includes(msg.from.email);
          const avatarColor = isMe
            ? (acct?.color || "#5B8EF8")
            : ACCT_COLORS[Math.abs((msg.from.email || "a").charCodeAt(0) - 97) % ACCT_COLORS.length];

          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""} anim-fade`}>
              <Avatar name={msg.from.name} size={30} color={avatarColor} />
              <div className={`flex-1 min-w-0 max-w-[88%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`flex items-baseline gap-2 mb-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="text-[12px] font-semibold text-[#b0b4be]">
                    {isMe ? "You" : msg.from.name}
                  </span>
                  <span className="text-[10px] text-[#2e3240]">{msg.time}</span>
                </div>
                <div
                  className={`px-4 py-3 text-[13px] leading-relaxed
                    ${isMe
                      ? "bg-[#1a2a4a] text-[#b8c8e8] rounded-2xl rounded-tr-md"
                      : "bg-[#161820] text-[#a8acb8] rounded-2xl rounded-tl-md"
                    }`}
                >
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      <ReplyBox thread={thread} accounts={accounts} isDemo={isDemo} isOnline={isOnline} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPOSE MODAL
   ═══════════════════════════════════════════════════════════════════ */
function ComposeModal({ accounts, isDemo, isOnline = true, onClose, onSchedule }) {
  const [to,           setTo]           = useState("");
  const [subject,      setSubject]      = useState("");
  const [body,         setBody]         = useState("");
  const [acctId,       setAcctId]       = useState(accounts[0]?.id || "");
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const [error,        setError]        = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(null);

  const acct = accounts.find(a => a.id === acctId);

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    if (isDemo) { setSent(true); setTimeout(onClose, 1500); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, fromEmail: acct?.email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Send failed");
      }
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  }

  function handleScheduleSend(scheduledAt) {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setScheduledFor(scheduledAt);
    onSchedule({ to, subject, body, fromEmail: acct?.email, scheduledAt });
    setSent(true);
    setTimeout(onClose, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#111318] border border-[#1e2028] sm:rounded-2xl shadow-2xl flex flex-col anim-slide-up sm:max-h-[85vh] max-h-[90vh]">
        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 px-8 gap-3 anim-fade">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scheduledFor ? "bg-blue-500/15 border border-blue-500/20" : "bg-emerald-500/15 border border-emerald-500/20"}`}>
              {scheduledFor ? <CalendarClock size={22} className="text-[#5B8EF8]" /> : <CheckCircle2 size={22} className="text-emerald-400" />}
            </div>
            <p className="text-[15px] font-semibold text-[#e2e4e9]">{scheduledFor ? "Message scheduled" : "Message sent"}</p>
            {scheduledFor && <p className="text-[12px] text-[#5c6270]">{formatSnoozeTime(scheduledFor)}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2028] flex-shrink-0">
              <h3 className="text-[14px] font-semibold text-[#e2e4e9]">New Message</h3>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1e2028] text-[#4a4f5c] hover:text-[#8b8f9a] transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* From */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#171920]">
                <span className="text-[11px] text-[#3a3f4c] w-9 flex-shrink-0 font-medium">From</span>
                <select
                  value={acctId}
                  onChange={e => setAcctId(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-[#c8ccd4] focus:outline-none appearance-none cursor-pointer"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} className="bg-[#1a1c22]">
                      {a.name} &lt;{a.email}&gt;
                    </option>
                  ))}
                </select>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acct?.color }} />
              </div>
              {/* To */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#171920]">
                <span className="text-[11px] text-[#3a3f4c] w-9 flex-shrink-0 font-medium">To</span>
                <input
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
                />
              </div>
              {/* Subject */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#171920]">
                <span className="text-[11px] text-[#3a3f4c] w-9 flex-shrink-0 font-medium">Re</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] focus:outline-none"
                />
              </div>
              {/* Body */}
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={8}
                className="w-full px-5 py-4 bg-transparent text-[13px] text-[#c8ccd4] placeholder-[#2e3240] resize-none focus:outline-none leading-relaxed"
              />
            </div>

            {error && (
              <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                <AlertCircle size={12} />{error}
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-4 border-t border-[#1e2028] flex-shrink-0">
              <button onClick={onClose} className="text-[13px] text-[#4a4f5c] hover:text-[#8b8f9a] transition-colors min-h-[44px] px-2">
                Discard
              </button>
              <div className="flex items-center relative">
                <button
                  onClick={handleSend}
                  disabled={sending || !to.trim() || !subject.trim() || !body.trim() || !isOnline}
                  title={!isOnline ? "Connect to internet to send" : undefined}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl rounded-r-none bg-[#5B8EF8] text-white text-[13px] font-semibold hover:bg-[#4a7def] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {sending ? <Spinner size={14} /> : <Send size={13} />}
                  {sending ? "Sending…" : "Send"}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setScheduleOpen(v => !v)}
                    disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
                    title="Schedule send"
                    className="flex items-center justify-center w-9 min-h-[44px] rounded-xl rounded-l-none border-l border-[#4a6dd4] bg-[#5B8EF8] text-white hover:bg-[#4a7def] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} />
                  </button>
                  {scheduleOpen && (
                    <ScheduleMenu
                      onSchedule={ts => { setScheduleOpen(false); handleScheduleSend(ts); }}
                      onClose={() => setScheduleOpen(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS VIEW
   ═══════════════════════════════════════════════════════════════════ */
function SettingsView({ accounts, session, onAddAccount, onBack }) {
  return (
    <div className="flex flex-col h-full bg-[#0c0d10]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2028] flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] text-[#6b7280] hover:text-[#c8ccd4] transition-colors md:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-[15px] font-semibold text-[#e2e4e9]">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-xl w-full mx-auto space-y-8">
        {/* Connected accounts */}
        <section>
          <h3 className="text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest mb-3">Connected Accounts</h3>
          <div className="space-y-2">
            {accounts.map(acct => (
              <div key={acct.id} className="flex items-center gap-3 px-4 py-3.5 bg-[#111318] border border-[#1e2028] rounded-xl">
                <Avatar name={acct.name} size={34} color={acct.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#c8ccd4] truncate">{acct.label}</p>
                  <p className="text-[11px] text-[#4a4f5c] truncate">{acct.email}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onAddAccount}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#2a2d38] text-[#5B8EF8] hover:bg-[#1a1f2e] hover:border-blue-500/30 transition-all text-[13px] font-semibold min-h-[48px]"
          >
            <Plus size={14} />
            Connect another account
          </button>
        </section>

        {/* Session */}
        {session?.user && (
          <section>
            <h3 className="text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest mb-3">Signed In As</h3>
            <div className="flex items-center gap-3 px-4 py-3.5 bg-[#111318] border border-[#1e2028] rounded-xl">
              <Avatar name={session.user.name} size={34} color="#5B8EF8" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#c8ccd4]">{session.user.name}</p>
                <p className="text-[11px] text-[#4a4f5c]">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2d38] text-[#5c6270] hover:text-[#a0a4b0] hover:border-[#3a3d4a] transition-all text-[12px] min-h-[36px]"
              >
                <LogOut size={12} />Sign out
              </button>
            </div>
          </section>
        )}

        {/* About */}
        <section>
          <h3 className="text-[10px] font-bold text-[#3a3f4c] uppercase tracking-widest mb-3">About</h3>
          <div className="px-4 py-3 bg-[#111318] border border-[#1e2028] rounded-xl space-y-3">
            {[
              { label: "Version",   value: "0.2.0" },
              { label: "Gmail API", value: <span className="text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">Connected</span> },
              { label: "AI Drafts", value: <span className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-[#5B8EF8] border border-blue-500/20 rounded-full">Enabled</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
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

/* ═══════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV
   ═══════════════════════════════════════════════════════════════════ */
function MobileBottomNav({ filter, onSetFilter, onCompose, view, onSetView }) {
  const items = [
    { id: "all",            Icon: Inbox,        label: "Inbox" },
    { id: "needs_response", Icon: PenLine,      label: "Reply" },
    { id: "waiting",        Icon: Clock,        label: "Wait" },
    { id: "resolved",       Icon: CheckCircle2, label: "Done" },
  ];
  return (
    <nav className="flex items-center justify-around bg-[#111318] border-t border-[#1e2028] md:hidden flex-shrink-0 safe-area-inset-bottom">
      {items.map(({ id, Icon, label }) => {
        const active = filter === id && view !== "settings";
        return (
          <button
            key={id}
            onClick={() => { onSetFilter(id); onSetView("inbox"); }}
            className={`flex flex-col items-center gap-0.5 py-2.5 flex-1 min-h-[52px] justify-center transition-colors
              ${active ? "text-[#5B8EF8]" : "text-[#3a3f4c]"}`}
          >
            <Icon size={17} />
            <span className={`text-[9px] font-semibold tracking-wide ${active ? "text-[#5B8EF8]" : "text-[#2e3240]"}`}>{label}</span>
          </button>
        );
      })}
      <button
        onClick={onCompose}
        className="flex flex-col items-center gap-0.5 py-2 flex-1 min-h-[52px] justify-center"
      >
        <div className="w-8 h-8 rounded-full bg-[#5B8EF8] flex items-center justify-center shadow shadow-blue-500/25">
          <Edit3 size={14} className="text-white" />
        </div>
      </button>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE HEADER (list view)
   ═══════════════════════════════════════════════════════════════════ */
function MobileHeader({ session, isDemo, onSettings }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#111318] border-b border-[#1e2028] md:hidden flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#5B8EF8] to-[#7C5CF8] flex items-center justify-center">
          <Zap size={12} className="text-white" />
        </div>
        <span className="font-semibold text-[#e2e4e9] text-[15px]">Orbital</span>
        {isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a1a05] text-amber-400 border border-amber-500/20 font-bold tracking-wide">DEMO</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSettings}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#16181f] text-[#5c6270] hover:text-[#c8ccd4] transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function Orbital() {
  const { data: session, status: authStatus } = useSession();

  // Data
  const [threads,   setThreads]   = useState([]);
  const [accounts,  setAccounts]  = useState([]);

  // Navigation
  const [activeId,        setActiveId]        = useState(null);
  const [filter,          setFilter]          = useState("all");
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [search,          setSearch]          = useState("");
  const [view,            setView]            = useState("inbox");
  const [mobilePanel,     setMobilePanel]     = useState("list"); // "list" | "detail"

  // UI
  const [compose,        setCompose]        = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [gmailError, setGmailError] = useState(null);
  const [isDemo,     setIsDemo]     = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isOnline,   setIsOnline]   = useState(true);

  // Snooze & Scheduled Send
  const [snoozedThreads,    setSnoozedThreads]    = useState(() => loadSnoozed());
  const [scheduledMessages, setScheduledMessages] = useState(() => loadScheduled());
  const isDemoRef = useRef(false);
  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  // Offline queue: {type: "statusChange", id, status}
  const offlineQueue = useRef([]);

  // Search
  const [aiSearch,          setAiSearch]          = useState(false);
  const [searchResults,     setSearchResults]     = useState(null); // null = no active search
  const [searchLoading,     setSearchLoading]     = useState(false);
  const [searchError,       setSearchError]       = useState(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const activeThread = useMemo(
    () => threads.find(t => t.id === activeId) || null,
    [threads, activeId]
  );

  /* ── Auth & data init ────────────────────────────────── */
  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "authenticated" && session?.error === "RefreshAccessTokenError") {
      // Refresh token has expired — force re-authentication
      setShowSignIn(true);
      setGmailError("Session expired. Please sign in again.");
      return;
    }

    if (authStatus === "authenticated" && session?.access_token) {
      setIsDemo(false);
      setShowSignIn(false);
      setAccounts([{
        id: "gmail-real",
        email: session.user.email,
        name:  session.user.name || session.user.email,
        color: "#5B8EF8",
        label: (session.user.email || "").split("@")[1]?.split(".")[0] || "Gmail",
      }]);
      fetchGmail();
    } else if (authStatus === "unauthenticated") {
      // Always show sign-in screen — never auto-enter demo mode.
      // Demo only activates when the user explicitly clicks "Try demo instead".
      try { if (typeof window !== "undefined") localStorage.removeItem(STORE_KEY); } catch {}
      setShowSignIn(true);
    }
  }, [authStatus, session?.access_token, session?.error]);

  /* ── Online/Offline detection ───────────────────────── */
  useEffect(() => {
    setIsOnline(navigator.onLine);
    function handleOnline() {
      setIsOnline(true);
      // Replay queued offline status changes
      const queue = offlineQueue.current.splice(0);
      queue.forEach(({ id, status }) =>
        setThreads(ts => ts.map(t => t.id === id ? { ...t, status } : t))
      );
    }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── Gmail fetch ─────────────────────────────────────── */
  async function fetchGmail() {
    setLoading(true);
    setGmailError(null);
    try {
      const res = await fetch("/api/gmail/messages?maxResults=25");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Gmail error ${res.status}`);
      }
      const data = await res.json();
      setThreads(mapGmailToThreads(data.messages || []));
    } catch (e) {
      setGmailError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Search ──────────────────────────────────────────── */
  async function performSearch(query) {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setActiveSearchQuery(query);
    try {
      const params = new URLSearchParams({ q: query });
      if (aiSearch) params.set("naturalLanguage", "true");
      const res = await fetch(`/api/gmail/search?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Search error ${res.status}`);
      }
      const data = await res.json();
      let mapped = mapGmailToThreads(data.messages || []);

      // If AI-translated query returned 0 results, retry with the raw query
      if (aiSearch && mapped.length === 0 && data.query && data.query !== query) {
        const fallbackRes = await fetch(`/api/gmail/search?${new URLSearchParams({ q: query })}`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          mapped = mapGmailToThreads(fallbackData.messages || []);
        }
      }

      setSearchResults(mapped);
    } catch (e) {
      setSearchError(e.message || "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setSearchResults(null);
    setSearchError(null);
    setSearchLoading(false);
    setActiveSearchQuery("");
    setSearch("");
  }

  /* ── Timed items check (snooze returns + scheduled sends) ─── */
  useEffect(() => {
    function check() {
      const now = Date.now();
      const snoozed = loadSnoozed();
      const due = snoozed.filter(s => s.snoozeUntil <= now);
      if (due.length > 0) {
        const remaining = snoozed.filter(s => s.snoozeUntil > now);
        saveSnoozed(remaining);
        setSnoozedThreads(remaining);
        setThreads(ts => {
          const ids = new Set(ts.map(t => t.id));
          const toAdd = due.filter(s => !ids.has(s.thread.id))
            .map(s => ({ ...s.thread, lastActivityTs: now, lastActivity: "Just now" }));
          return toAdd.length > 0 ? [...toAdd, ...ts] : ts;
        });
      }
      if (isDemoRef.current) return;
      const scheduled = loadScheduled();
      const dueMsgs = scheduled.filter(m => m.status === "pending" && m.scheduledAt <= now);
      dueMsgs.forEach(msg => {
        fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: msg.to, subject: msg.subject, body: msg.body, fromEmail: msg.fromEmail,
            ...(msg.replyToMessageId ? { replyToMessageId: msg.replyToMessageId } : {}),
          }),
        }).then(r => {
          setScheduledMessages(prev => {
            const u = prev.map(m => m.id === msg.id ? { ...m, status: r.ok ? "sent" : "failed" } : m);
            saveScheduled(u); return u;
          });
        }).catch(() => {
          setScheduledMessages(prev => {
            const u = prev.map(m => m.id === msg.id ? { ...m, status: "failed" } : m);
            saveScheduled(u); return u;
          });
        });
      });
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ── Snooze actions ──────────────────────────────────── */
  function handleSnooze(threadId, snoozeUntil) {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    const updated = [...snoozedThreads, { threadId, snoozeUntil, thread }];
    setSnoozedThreads(updated);
    saveSnoozed(updated);
    setThreads(ts => ts.filter(t => t.id !== threadId));
    setActiveId(null);
    if (mobilePanel === "detail") setMobilePanel("list");
  }

  function handleUnsnooze(threadId) {
    const item = snoozedThreads.find(s => s.threadId === threadId);
    if (!item) return;
    const remaining = snoozedThreads.filter(s => s.threadId !== threadId);
    setSnoozedThreads(remaining);
    saveSnoozed(remaining);
    setThreads(ts => [{ ...item.thread, lastActivityTs: Date.now(), lastActivity: "Just now" }, ...ts]);
  }

  /* ── Scheduled send actions ──────────────────────────── */
  function handleSchedule(msgData) {
    const msg = { ...msgData, id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: "pending", created: Date.now() };
    const updated = [...scheduledMessages, msg];
    setScheduledMessages(updated);
    saveScheduled(updated);
  }

  function handleCancelScheduled(id) {
    const updated = scheduledMessages.filter(m => m.id !== id);
    setScheduledMessages(updated);
    saveScheduled(updated);
  }

  /* ── Demo ────────────────────────────────────────────── */
  function enterDemo() {
    setIsDemo(true);
    setShowSignIn(false);
    setAccounts(DEMO_ACCOUNTS);
    setThreads(DEMO_THREADS);
    // Do not persist demo state — next visit should always show sign-in screen
  }

  /* ── Thread actions ──────────────────────────────────── */
  function handleSelect(id) {
    setActiveId(id);
    setMobilePanel("detail");

    // Fetch full thread content for real Gmail threads (inbox fetch only has snippets)
    if (!isDemo) {
      const thread = threads.find(t => t.id === id);
      if (thread && !thread._fullLoaded) {
        const realId = thread._realThreadId || id;
        const accountParam = thread._accountEmail ? `?account=${encodeURIComponent(thread._accountEmail)}` : '';
        fetch(`/api/gmail/threads/${realId}${accountParam}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.thread?.messages?.length) return;
            const fullMsgs = data.thread.messages.map(m => {
              const fromStr = m.from || "";
              return {
                id: m.id,
                from: {
                  name: fromStr.split("<")[0].trim().replace(/"/g, "") || fromStr || "Unknown",
                  email: fromStr.match(/<(.+?)>/)?.[1] || fromStr || "",
                },
                time: m.internalDate
                  ? new Date(parseInt(m.internalDate)).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                  : m.date || "",
                body: stripHtmlAndDecode(m.body || m.snippet || ""),
              };
            });
            setThreads(ts => ts.map(t => t.id === id ? { ...t, messages: fullMsgs, _fullLoaded: true } : t));
          })
          .catch(err => console.error("Thread fetch error:", err));
      }
    }
  }

  function handleStatusChange(id, status) {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, status } : t));
    if (!isOnline && !isDemo) {
      offlineQueue.current.push({ id, status });
    }
  }

  function handleToggleStar(id) {
    setThreads(ts => ts.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
  }

  /* ── Account actions ─────────────────────────────────── */
  function handleAddAccount() {
    window.location.href = "/api/auth/signin";
  }

  /* ── Account filter ──────────────────────────────────── */
  const displayedThreads = useMemo(() => {
    if (!activeAccountId) return threads;
    return threads.filter(t => t.accountId === activeAccountId);
  }, [threads, activeAccountId]);

  /* ── Keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      // Cmd+K / Ctrl+K → open command palette (works from anywhere)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen(v => !v);
        return;
      }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const sorted = displayedThreads
        .filter(t => filter === "starred" ? t.starred : filter === "all" || t.status === filter)
        .sort((a, b) => b.lastActivityTs - a.lastActivityTs)
        .map(t => t.id);
      if (e.key === "c") { setCompose(true); return; }
      if (e.key === "Escape") { setCompose(false); setCmdPaletteOpen(false); return; }
      if (!activeId) return;
      if (e.key === "h") { handleSnooze(activeId, getTomorrowMorning()); return; }
      const i = sorted.indexOf(activeId);
      if (e.key === "j" && i < sorted.length - 1) handleSelect(sorted[i + 1]);
      if (e.key === "k" && i > 0) handleSelect(sorted[i - 1]);
      if (e.key === "e") handleStatusChange(activeId, "archived");
      if (e.key === "s") handleToggleStar(activeId);
      if (e.key === "1") handleStatusChange(activeId, "needs_response");
      if (e.key === "2") handleStatusChange(activeId, "waiting");
      if (e.key === "3") handleStatusChange(activeId, "resolved");
      if (e.key === "4") handleStatusChange(activeId, "archived");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, displayedThreads, filter]);

  /* ── Sign-in screen ──────────────────────────────────── */
  if (showSignIn) return <SignInView onDemo={enterDemo} />;

  /* ── Auth loading ────────────────────────────────────── */
  if (authStatus === "loading") return (
    <div className="flex items-center justify-center h-full bg-[#0c0d10]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5B8EF8] to-[#7C5CF8] flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <Spinner size={20} />
      </div>
    </div>
  );

  const isMobileDetail = mobilePanel === "detail" && !!activeThread;
  const isSettingsView = view === "settings";

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* ─── Desktop sidebar ─── */}
        <div className="hidden md:flex">
          <Sidebar
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={id => setActiveAccountId(id)}
            onAddAccount={handleAddAccount}
            filter={filter}
            onSetFilter={f => { setFilter(f); setActiveAccountId(null); clearSearch(); }}
            view={view}
            onSetView={setView}
            session={session}
            snoozedCount={snoozedThreads.length}
            scheduledCount={scheduledMessages.filter(m => m.status === "pending").length}
          />
        </div>

        {/* ─── Content area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Settings view */}
          {isSettingsView ? (
            <SettingsView
              accounts={accounts}
              session={session}
              onAddAccount={handleAddAccount}
              onBack={() => setView("inbox")}
            />
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Thread list column */}
              <div className={`
                flex flex-col
                ${isMobileDetail ? "hidden md:flex" : "flex"}
                w-full md:w-80 lg:w-96
                border-r border-[#1e2028] flex-shrink-0 overflow-hidden
              `}>
                {/* Mobile-only header */}
                <MobileHeader
                  session={session}
                  isDemo={isDemo}
                  onSettings={() => setView("settings")}
                />

                <div className="flex-1 overflow-hidden flex flex-col">
                  {filter === "snoozed" ? (
                    <SnoozedPanel
                      snoozedThreads={snoozedThreads}
                      accounts={accounts}
                      onUnsnooze={handleUnsnooze}
                    />
                  ) : filter === "scheduled" ? (
                    <ScheduledPanel
                      scheduledMessages={scheduledMessages}
                      onCancel={handleCancelScheduled}
                    />
                  ) : (
                    <ThreadListPanel
                      threads={displayedThreads}
                      accounts={accounts}
                      activeId={activeId}
                      filter={filter}
                      onSetFilter={setFilter}
                      search={search}
                      onSearch={setSearch}
                      onSelect={handleSelect}
                      loading={loading}
                      onRefresh={isDemo ? () => {} : fetchGmail}
                      isDemo={isDemo}
                      onSubmitSearch={performSearch}
                      searchResults={searchResults}
                      searchLoading={searchLoading}
                      searchError={searchError}
                      aiSearch={aiSearch}
                      onToggleAiSearch={() => setAiSearch(v => !v)}
                      activeSearchQuery={activeSearchQuery}
                      onClearSearch={clearSearch}
                    />
                  )}
                </div>

                <MobileBottomNav
                  filter={filter}
                  onSetFilter={setFilter}
                  onCompose={() => setCompose(true)}
                  view={view}
                  onSetView={setView}
                />
              </div>

              {/* Thread detail column */}
              <div className={`
                flex flex-col flex-1 overflow-hidden
                ${isMobileDetail ? "flex" : "hidden md:flex"}
              `}>
                {activeThread ? (
                  <ErrorBoundary key={activeThread.id}>
                  <ThreadDetail
                    key={activeThread.id}
                    thread={activeThread}
                    accounts={accounts}
                    onBack={() => setMobilePanel("list")}
                    onStatusChange={handleStatusChange}
                    onToggleStar={handleToggleStar}
                    onSnooze={handleSnooze}
                    isMobile={isMobileDetail}
                    isDemo={isDemo}
                    isOnline={isOnline}
                  />
                  </ErrorBoundary>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-[#0c0d10]">
                    <div className="w-16 h-16 rounded-2xl bg-[#111318] border border-[#1e2028] flex items-center justify-center mb-4">
                      <Mail size={22} className="text-[#1e2028]" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#2e3240]">Select a thread</p>
                    <p className="text-[12px] text-[#1e2028] mt-1 mb-6">Choose a conversation to read it here</p>
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-[11px] text-[#2a2d38]">
                        <kbd className="px-1.5 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">c</kbd>
                        <span>to compose</span>
                        <span className="mx-1">·</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">j/k</kbd>
                        <span>to navigate</span>
                      </div>
                      <button
                        onClick={() => setCmdPaletteOpen(true)}
                        className="flex items-center gap-1.5 text-[11px] text-[#2a2d38] hover:text-[#5B8EF8] transition-colors"
                      >
                        <kbd className="px-1.5 py-0.5 rounded bg-[#16181f] border border-[#2a2d38] font-mono">⌘K</kbd>
                        <span>command palette</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop FAB */}
      <button
        onClick={() => isOnline && setCompose(true)}
        disabled={!isOnline}
        title={!isOnline ? "Connect to internet to send" : undefined}
        className="fixed bottom-6 right-6 hidden md:flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#5B8EF8] text-white text-[13px] font-semibold shadow-lg shadow-blue-500/20 hover:bg-[#4a7def] active:scale-[0.97] transition-all z-20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Edit3 size={14} />
        Compose
      </button>

      {/* Gmail error banner */}
      {gmailError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#1c1418] border border-red-500/20 rounded-xl shadow-2xl anim-slide-up max-w-sm w-[calc(100%-2rem)]">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-300 flex-1 truncate">
            {(gmailError.includes("Unauthorized") || gmailError.includes("Gmail API error") || gmailError.includes("expired")) ? (
              <>Session expired. <button onClick={() => signIn("google")} className="underline">Sign in again</button></>
            ) : gmailError}
          </p>
          <button onClick={() => setGmailError(null)} className="text-[#5c6270] hover:text-[#a0a4b0] flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1520] border-b border-amber-500/20 anim-slide-up">
          <WifiOff size={13} className="text-amber-400 flex-shrink-0" />
          <span className="text-[12px] text-amber-300 font-medium">You&apos;re offline — showing cached emails</span>
        </div>
      )}

      {/* Compose modal */}
      {compose && (
        <ComposeModal
          accounts={accounts}
          isDemo={isDemo}
          isOnline={isOnline}
          onClose={() => setCompose(false)}
          onSchedule={handleSchedule}
        />
      )}

      {/* Command palette */}
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        accounts={accounts}
        activeThread={activeThread}
        threads={threads}
        onSetFilter={f => { setFilter(f); setActiveAccountId(null); }}
        onSetView={setView}
        onSetCompose={setCompose}
        onStatusChange={handleStatusChange}
        onToggleStar={handleToggleStar}
        onSelectAccount={id => setActiveAccountId(id)}
      />

      {/* ⌘K discovery hint — bottom-left corner (desktop only) */}
      <button
        onClick={() => setCmdPaletteOpen(true)}
        className="fixed bottom-6 left-6 hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111318] border border-[#1e2028] text-[#3a3f4c] hover:text-[#6b7280] hover:border-[#2a2d38] transition-all text-[11px] z-20"
        title="Open command palette"
      >
        <kbd className="font-mono text-[10px]">⌘K</kbd>
      </button>
    </>
  );
}
