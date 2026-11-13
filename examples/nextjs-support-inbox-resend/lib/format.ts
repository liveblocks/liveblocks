const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Compact relative time for list rows: "now", "4m", "3h", "Yesterday", "Mar 4".
export function formatRelative(timestamp: number, now = Date.now()) {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY && isSameDay(timestamp, now)) {
    return `${Math.floor(diff / HOUR)}h`;
  }
  if (isSameDay(timestamp, now - DAY)) return "Yesterday";
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

// Full timestamp for message headers: "Today, 9:41 AM" / "Mar 4, 9:41 AM".
export function formatMessageTime(timestamp: number, now = Date.now()) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isSameDay(timestamp, now)) return `Today, ${time}`;
  if (isSameDay(timestamp, now - DAY)) return `Yesterday, ${time}`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  return `${day}, ${time}`;
}

// Day separators in the timeline: "Today", "Yesterday", "Monday, March 4".
export function formatDay(timestamp: number, now = Date.now()) {
  if (isSameDay(timestamp, now)) return "Today";
  if (isSameDay(timestamp, now - DAY)) return "Yesterday";
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatFullDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

// Muted, warm palette for customer avatars. Picked deterministically from the
// customer's email so the same customer always gets the same color.
const AVATAR_TONES = [
  "bg-stone-200 text-stone-700",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
  "bg-violet-100 text-violet-900",
  "bg-orange-100 text-orange-900",
  "bg-teal-100 text-teal-900",
];

export function avatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}
