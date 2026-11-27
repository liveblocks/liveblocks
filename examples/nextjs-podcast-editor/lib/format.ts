/** 83.4 → "1:23" */
export function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** 83.4 → "1:23.4", for the transport's running clock. */
export function formatTimecode(seconds: number) {
  const clamped = Math.max(0, seconds);
  const tenths = Math.floor((clamped * 10) % 10);
  return `${formatTime(clamped)}.${tenths}`;
}

/** Show notes timestamps, as podcast apps expect them: "01:23". */
export function formatChapterTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** 21.6 → "21s", 83 → "1m 23s" */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) {
    return `${rest}s`;
  }
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
