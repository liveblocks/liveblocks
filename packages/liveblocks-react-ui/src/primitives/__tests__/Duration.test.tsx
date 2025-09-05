import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Duration, formatIso8601Duration } from "../Duration";

// Use fixed a fixed date and locale for testing.
const DATE = new Date("2025-01-01T00:00:00.000Z");
const LOCALE = "en-US";

type DateDelta = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function changeDate(
  date: Date | number | string,
  { days = 0, hours = 0, minutes = 0, seconds = 0 }: Partial<DateDelta> = {}
) {
  let time: number;

  if (typeof date === "number") {
    time = date;
  } else if (typeof date === "string") {
    time = new Date(date).getTime();
  } else {
    time = date.getTime();
  }

  return new Date(
    time +
      days * 24 * 60 * 60 * 1000 +
      hours * 60 * 60 * 1000 +
      minutes * 60 * 1000 +
      seconds * 1000
  );
}

describe("Duration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("should format durations in a short format by default", () => {
    const { container, rerender } = render(
      <Duration locale={LOCALE} duration={0} />
    );
    const time = container.querySelector("time")!;

    function assert(duration: number, expected: string) {
      rerender(<Duration locale={LOCALE} duration={duration} />);

      expect(time.textContent).toBe(expected);
    }

    assert(-100, "0s");
    assert(0, "0s");
    assert(100, "0s");
    assert(1000, "1s");
    assert(10000, "10s");
    assert(100000, "1m 40s");
    assert(1000000, "16m 40s");
    assert(10000000, "2h 46m 40s");
    assert(100000000, "1d 3h 46m 40s");
    assert(1000000000, "1w 4d 13h 46m 40s");
    assert(10000000000, "16w 3d 17h 46m 40s");
  });

  test("should format durations in a verbose format in title attribute by default", () => {
    const { container, rerender } = render(
      <Duration locale={LOCALE} duration={0} />
    );
    const time = container.querySelector("time")!;

    function assert(duration: number, expected: string) {
      rerender(<Duration locale={LOCALE} duration={duration} />);

      expect(time).toHaveAttribute("title", expected);
    }

    assert(-100, "0 seconds");
    assert(0, "0 seconds");
    assert(100, "0 seconds");
    assert(1000, "1 second");
    assert(10000, "10 seconds");
    assert(100000, "1 minute 40 seconds");
    assert(1000000, "16 minutes 40 seconds");
    assert(10000000, "2 hours 46 minutes 40 seconds");
    assert(100000000, "1 day 3 hours 46 minutes 40 seconds");
    assert(1000000000, "1 week 4 days 13 hours 46 minutes 40 seconds");
    assert(10000000000, "16 weeks 3 days 17 hours 46 minutes 40 seconds");
  });

  test("should support durations via duration or from/to props", () => {
    const { container, rerender } = render(
      <Duration locale={LOCALE} duration={1000} />
    );
    const time = container.querySelector("time")!;

    expect(time.textContent).toBe("1s");
    expect(time).toHaveAttribute("title", "1 second");
    expect(time.getAttribute("datetime")).toBe("PT1S");

    rerender(
      <Duration
        locale={LOCALE}
        from={DATE}
        to={changeDate(DATE, { seconds: 1 })}
      />
    );

    expect(time.textContent).toBe("1s");
    expect(time).toHaveAttribute("title", "1 second");
    expect(time.getAttribute("datetime")).toBe("PT1S");
  });

  test("should have a datetime attribute with the duration as ISO 8601", () => {
    const { container } = render(<Duration locale={LOCALE} duration={1000} />);
    const time = container.querySelector("time")!;

    expect(time.getAttribute("datetime")).toBe("PT1S");
  });

  test("should rerender at an interval when only from is provided", async () => {
    const { container } = render(
      <Duration
        locale={LOCALE}
        from={changeDate(DATE, { seconds: -10 })}
        interval={100}
      />
    );
    const time = container.querySelector("time")!;

    const before = time.textContent;
    await vi.advanceTimersByTimeAsync(10000);
    const after = time.textContent;
    expect(after).not.toBe(before);
  });

  test("should support changing the rerender interval", async () => {
    const { container } = render(
      <Duration
        locale={LOCALE}
        from={changeDate(DATE, { seconds: -10 })}
        interval={10000}
      >
        {() => Date.now()}
      </Duration>
    );
    const time = container.querySelector("time")!;

    const before = time.textContent;
    await vi.advanceTimersByTimeAsync(6000);
    const between = time.textContent;
    expect(between).toBe(before);

    await vi.advanceTimersByTimeAsync(6000);
    const after = time.textContent;
    expect(after).not.toBe(before);
  });

  test("should support a title string", () => {
    const { container } = render(
      <Duration locale={LOCALE} duration={0} title="Duration" />
    );
    const time = container.querySelector("time")!;

    expect(time.getAttribute("title")).toBe("Duration");
  });

  test("should support a title function", () => {
    const { container } = render(
      <Duration locale={LOCALE} duration={0} title={(d) => `title:${d}`} />
    );
    const time = container.querySelector("time")!;

    expect(time.getAttribute("title")).toBe("title:0");
  });

  test("should support a children function", () => {
    const { container } = render(
      <Duration locale={LOCALE} duration={0}>
        {(d) => d}
      </Duration>
    );
    const time = container.querySelector("time")!;

    expect(time.textContent).toBe("0");
  });
});

describe("formatIso8601Duration", () => {
  test("should format durations as ISO 8601", () => {
    expect(formatIso8601Duration(-100)).toBe("PT0S");
    expect(formatIso8601Duration(0)).toBe("PT0S");
    expect(formatIso8601Duration(100)).toBe("PT0.1S");
    expect(formatIso8601Duration(1000)).toBe("PT1S");
    expect(formatIso8601Duration(10000)).toBe("PT10S");
    expect(formatIso8601Duration(100000)).toBe("PT1M40S");
    expect(formatIso8601Duration(1000000)).toBe("PT16M40S");
    expect(formatIso8601Duration(10000000)).toBe("PT2H46M40S");
    expect(formatIso8601Duration(100000000)).toBe("P1DT3H46M40S");
    expect(formatIso8601Duration(1000000000)).toBe("P1W4DT13H46M40S");
    expect(formatIso8601Duration(10000000000)).toBe("P16W3DT17H46M40S");
  });
});
