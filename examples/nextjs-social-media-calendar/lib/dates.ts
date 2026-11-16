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

/** How much of the calendar is shown and navigated at once. */
export type Period = "week" | "month";

/** The Monday starting the week `date` is in. */
export function startOfWeek(date: Date) {
  // Monday = 0 … Sunday = 6
  const offset = (date.getDay() + 6) % 7;
  const start = addDays(date, -offset);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate());
}

export function addWeeks(date: Date, amount: number) {
  return addDays(startOfWeek(date), amount * 7);
}

export function isSameWeek(a: Date, b: Date) {
  return isSameDay(startOfWeek(a), startOfWeek(b));
}

export function startOfPeriod(period: Period, date: Date) {
  return period === "week" ? startOfWeek(date) : startOfMonth(date);
}

export function addPeriods(period: Period, date: Date, amount: number) {
  return period === "week" ? addWeeks(date, amount) : addMonths(date, amount);
}

export function isSamePeriod(period: Period, a: Date, b: Date) {
  return period === "week" ? isSameWeek(a, b) : isSameMonth(a, b);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The seven days of the week `date` is in, starting on Monday. */
export function getWeekGrid(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

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

/** `Nov 16 – 22, 2026`, or `Nov 30 – Dec 6, 2026` across months. */
export function formatWeekTitle(date: Date) {
  const start = startOfWeek(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(start, addDays(start, 6));
}

/** The days shown for a period, as a grid of whole weeks. */
export function getPeriodGrid(period: Period, date: Date) {
  return period === "week" ? getWeekGrid(date) : getMonthGrid(date);
}

export function formatPeriodTitle(period: Period, date: Date) {
  return period === "week" ? formatWeekTitle(date) : formatMonthTitle(date);
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

/** Orders posts within one day by time of day (`HH:MM`), ignoring the date. */
export function compareByTime(a: { time: string }, b: { time: string }) {
  return a.time.localeCompare(b.time);
}
