import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Timestamp } from "../Timestamp";

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

describe("Timestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("should format dates dynamically by default", () => {
    const { container, rerender } = render(
      <Timestamp locale={LOCALE} date={Date.now()} />
    );
    const time = container.querySelector("time")!;

    function assert(delta: Partial<DateDelta>, expected: string) {
      rerender(
        <Timestamp locale={LOCALE} date={changeDate(Date.now(), delta)} />
      );

      expect(time.textContent).toBe(expected);
    }

    assert({}, "now");

    // Nearby dates (< 3 days) are relatively formatted
    assert({ hours: 1 }, "in 1h");
    assert({ hours: 6 }, "in 6h");
    assert({ days: 1 }, "tomorrow");
    assert({ days: 2, hours: 9 }, "in 2d");

    assert({ hours: -1 }, "1h ago");
    assert({ hours: -6 }, "6h ago");
    assert({ days: -1 }, "yesterday");
    assert({ days: -2, hours: -9 }, "2d ago");

    // Distant dates (> 3 days) are absolutely formatted
    assert({ days: 10 }, "Jan 11");
    assert({ days: -10 }, "Dec 22");
  });

  test("should have a datetime attribute with the date as ISO 8601", () => {
    const { container } = render(<Timestamp locale={LOCALE} date={DATE} />);
    const time = container.querySelector("time")!;

    expect(time.getAttribute("datetime")).toBe(DATE.toISOString());
  });

  test("should rerender at an interval", async () => {
    const { container } = render(
      <Timestamp locale={LOCALE} date={DATE} interval={30000}>
        {() => Date.now()}
      </Timestamp>
    );
    const time = container.querySelector("time")!;

    const before = time.textContent;
    await vi.advanceTimersByTimeAsync(45000);
    const after = time.textContent;
    expect(after).not.toBe(before);
  });

  test("should support changing the rerender interval", async () => {
    const { container } = render(
      <Timestamp locale={LOCALE} date={DATE} interval={10000}>
        {() => Date.now()}
      </Timestamp>
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
      <Timestamp locale={LOCALE} date={DATE} title="Timestamp" />
    );
    const time = container.querySelector("time")!;

    expect(time.getAttribute("title")).toBe("Timestamp");
  });

  test("should support a title function", () => {
    const { container } = render(
      <Timestamp
        locale={LOCALE}
        date={DATE}
        title={(d) => `title:${d.toISOString()}`}
      />
    );
    const time = container.querySelector("time")!;

    expect(time.getAttribute("title")).toBe(`title:${DATE.toISOString()}`);
  });

  test("should support a children function", () => {
    const { container } = render(
      <Timestamp locale={LOCALE} date={DATE}>
        {(d) => d.toISOString()}
      </Timestamp>
    );
    const time = container.querySelector("time")!;

    expect(time.textContent).toBe(DATE.toISOString());
  });
});
