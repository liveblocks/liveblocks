import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDayLabel, formatTime } from "@/lib/time";

describe("formatDayLabel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels today and yesterday", () => {
    vi.useFakeTimers();
    const now = new Date("2025-06-15T14:30:00");
    vi.setSystemTime(now);

    expect(formatDayLabel(now.getTime())).toBe("Today");
    expect(formatDayLabel(now.getTime() - 24 * 60 * 60 * 1000)).toBe(
      "Yesterday"
    );
  });

  it("falls back to a weekday and date for older days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T14:30:00"));

    const label = formatDayLabel(new Date("2025-06-01T10:00:00").getTime());
    expect(label).toMatch(/June/);
    expect(label).not.toMatch(/2025/);
  });
});

describe("formatTime", () => {
  it("formats a timestamp as local time", () => {
    const formatted = formatTime(new Date("2025-06-15T14:30:00").getTime());
    expect(formatted).toMatch(/\d/);
  });
});
