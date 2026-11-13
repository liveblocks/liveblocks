/**
 * Small date helpers. Posts store their day as a `YYYY-MM-DD` key (local
 * time) so dragging a card between days is a simple string update.
 */

export type DateKey = string;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameDay(a: Date, b: Date) {
  return isSameMonth(a, b) && a.getDate() === b.getDate();
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Returns the days shown in a monthly grid (weeks start on Monday), padded
 * with the surrounding days so every row has seven cells.
 */
export function getMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  // Monday = 0 … Sunday = 6
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: rows * 7 }, (_, index) => addDays(start, index));
}

export function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDayHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Formats a `HH:MM` string as `9:00 AM`. */
export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function compareByDateTime(
  a: { date: DateKey; time: string },
  b: { date: DateKey; time: string }
) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
}
