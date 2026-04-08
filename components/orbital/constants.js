import {
  Archive,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  PenLine,
  Star,
} from "lucide-react";

export const STATUS = {
  needs_response: {
    label: "Needs reply",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    bdr: "border-blue-500/20",
    Icon: PenLine,
  },
  waiting: {
    label: "Waiting",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    bdr: "border-amber-500/20",
    Icon: Clock,
  },
  fyi: {
    label: "FYI",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    bdr: "border-slate-500/20",
    Icon: Eye,
  },
  resolved: {
    label: "Done",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    bdr: "border-emerald-500/20",
    Icon: CheckCircle2,
  },
  archived: {
    label: "Archived",
    color: "text-slate-600",
    bg: "bg-slate-800/20",
    bdr: "border-slate-700/20",
    Icon: Archive,
  },
};

export const ACCT_COLORS = [
  "#5B8EF8",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#7C9BF8",
  "#06B6D4",
];

export const SIDEBAR_NAV = [
  { id: "all", Icon: Inbox, label: "All Mail" },
  { id: "needs_response", Icon: PenLine, label: "Needs Reply" },
  { id: "waiting", Icon: Clock, label: "Waiting" },
  { id: "starred", Icon: Star, label: "Starred" },
  { id: "resolved", Icon: CheckCircle2, label: "Done" },
  { id: "archived", Icon: Archive, label: "Archived" },
  { id: "snoozed", Icon: BellOff, label: "Snoozed" },
  { id: "scheduled", Icon: CalendarClock, label: "Scheduled" },
];

export const MOBILE_NAV = [
  { id: "all", Icon: Inbox, label: "Inbox" },
  { id: "needs_response", Icon: PenLine, label: "Reply" },
  { id: "waiting", Icon: Clock, label: "Wait" },
  { id: "resolved", Icon: CheckCircle2, label: "Done" },
];
