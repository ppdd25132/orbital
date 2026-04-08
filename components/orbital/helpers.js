import { ACCT_COLORS } from "./constants";

export function getLaterToday() {
  return Date.now() + 3 * 60 * 60 * 1000;
}

export function getTomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

export function getNextMondayMorning() {
  const date = new Date();
  const day = date.getDay();
  const daysUntil = day === 1 ? 7 : (8 - day) % 7 || 7;
  date.setDate(date.getDate() + daysUntil);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

export function formatSnoozeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) return `Today at ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${time}`;
  }

  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) + ` at ${time}`
  );
}

export function decodeHTMLEntities(str) {
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

export function stripHtmlAndDecode(str) {
  if (!str) return "";

  return decodeHTMLEntities(
    str
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

export function isHtmlContent(str) {
  if (!str) return false;
  return /<(html|head|body|div|span|table|td|tr|p|br|img|a|style|font)\b/i.test(str);
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function parseFromField(raw = "") {
  const name = raw.split("<")[0]?.trim().replace(/"/g, "") || raw || "Unknown";
  const email = raw.match(/<(.+?)>/)?.[1] || raw || "";
  return { name, email };
}

function buildLastActivityLabel(timestamp) {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 3_600_000) return `${Math.max(1, Math.round(elapsed / 60_000))}m ago`;
  if (elapsed < 86_400_000) return `${Math.round(elapsed / 3_600_000)}h ago`;
  return `${Math.round(elapsed / 86_400_000)}d ago`;
}

export function buildAccountId(email) {
  return `acct-${(email || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function buildAccountLabel(email, fallbackName = "") {
  const domain = email?.split("@")[1] || "";
  const stem = domain.split(".")[0] || fallbackName || "Gmail";
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

export function buildRealAccounts(primaryUser, linkedAccounts = []) {
  const rawAccounts = [
    primaryUser?.email
      ? {
          email: primaryUser.email,
          name: primaryUser.name || primaryUser.email,
        }
      : null,
    ...linkedAccounts,
  ].filter(Boolean);

  return rawAccounts.map((account, index) => ({
    id: buildAccountId(account.email),
    email: account.email,
    name: account.name || account.email,
    color: ACCT_COLORS[index % ACCT_COLORS.length],
    label: buildAccountLabel(account.email, account.name),
  }));
}

export function mapThreadStatusFromLabels(labelIds = []) {
  const labelSet = new Set(labelIds || []);

  if (!labelSet.has("INBOX")) return "archived";
  if (!labelSet.has("UNREAD")) return "resolved";
  return "needs_response";
}

export function mapClassificationToStatus(category) {
  switch (category) {
    case "waiting-on-others":
      return "waiting";
    case "fyi-only":
    case "promotional":
      return "fyi";
    case "actionable":
    case "needs-reply":
    default:
      return "needs_response";
  }
}

export function mergeThreadClassifications(threads, classifications = []) {
  const byId = new Map(classifications.map((item) => [item.id, item.category]));
  return threads.map((thread) => {
    if (!byId.has(thread.id)) {
      return thread._classifying ? { ...thread, _classifying: false } : thread;
    }

    if (thread.status === "archived" || thread.status === "resolved") {
      return { ...thread, _classifying: false };
    }

    return {
      ...thread,
      status: mapClassificationToStatus(byId.get(thread.id)),
      _classifying: false,
    };
  });
}

export function shouldClassifyThread(thread) {
  return thread.status !== "archived" && thread.status !== "resolved";
}

export function mapGmailToThreads(messages, accounts = []) {
  const byThread = {};
  const accountsByEmail = new Map(accounts.map((account) => [account.email, account]));

  for (const message of messages) {
    const threadId = message.threadId || message.id;
    if (!byThread[threadId]) byThread[threadId] = [];
    byThread[threadId].push(message);
  }

  return Object.entries(byThread).map(([threadId, threadMessages]) => {
    threadMessages.sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    );

    const lastMessage = threadMessages[threadMessages.length - 1];
    const account =
      accountsByEmail.get(lastMessage.accountEmail) ||
      ({
        id: buildAccountId(lastMessage.accountEmail),
        email: lastMessage.accountEmail,
        label: buildAccountLabel(lastMessage.accountEmail),
      });

    const participants = new Map();
    for (const message of threadMessages) {
      const parsed = parseFromField(message.from);
      if (parsed.email && !participants.has(parsed.email)) {
        participants.set(parsed.email, { ...parsed, role: "" });
      }
    }

    const timestamp =
      typeof lastMessage.internalDate === "string"
        ? parseInt(lastMessage.internalDate, 10)
        : new Date(lastMessage.date).getTime();

    const labelIds = lastMessage.labelIds || [];

    return {
      id: threadId,
      accountId: account.id,
      _realThreadId: lastMessage._realThreadId || lastMessage.threadId || threadId,
      _accountEmail: lastMessage.accountEmail,
      _labels: labelIds,
      subject: lastMessage.subject || "(no subject)",
      status: mapThreadStatusFromLabels(labelIds),
      starred: labelIds.includes("STARRED"),
      lastActivityTs: timestamp,
      lastActivity: buildLastActivityLabel(timestamp),
      preview: stripHtmlAndDecode(lastMessage.snippet || lastMessage.body || ""),
      participants: Array.from(participants.values()),
      messages: threadMessages.map((message) => {
        const from = parseFromField(message.from);
        return {
          id: message.id,
          from,
          time: new Date(message.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          body: message.body || message.snippet || "",
          labelIds: message.labelIds || [],
          inlineAttachments: message.inlineAttachments || {},
        };
      }),
    };
  });
}
