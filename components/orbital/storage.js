const SNOOZE_KEY = "orbital-snoozed";
const SCHEDULED_KEY = "orbital-scheduled";

export function loadSnoozed() {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(SNOOZE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSnoozed(items) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(items));
    }
  } catch {}
}

export function loadScheduled() {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(SCHEDULED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScheduled(items) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULED_KEY, JSON.stringify(items));
    }
  } catch {}
}
