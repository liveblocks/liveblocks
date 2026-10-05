import { describe, expect, test } from "vitest";

import { nextWriteAt, parseConfig, scheduledCount } from "../load/config.ts";
import { MillisecondHistogram, Observations } from "../load/metrics.ts";

const env = {
  LIVEBLOCKS_BASE_URL: "https://load.example.com",
  LIVEBLOCKS_PUBLIC_KEY: "pk_test",
  LIVEBLOCKS_SECRET_KEY: "sk_test",
};

describe("load-test configuration", () => {
  test("requires an explicit target and both keys; help needs no credentials", () => {
    expect(parseConfig(["--help"], {})).toBeUndefined();
    for (const name of Object.keys(env)) {
      expect(() => parseConfig([], { ...env, [name]: "" })).toThrow(name);
    }
  });

  test("uses full defaults and permits smoke overrides", () => {
    expect(parseConfig([], env)?.options).toMatchObject({
      rooms: 50,
      clientsPerRoom: 10,
      writersPerRoom: 5,
      mutationRate: 1,
      payloadBytes: 256,
      rampSeconds: 60,
      holdSeconds: 900,
      keepRooms: false,
    });
    expect(
      parseConfig(["--smoke", "--rooms", "3", "--mutation-rate", "5"], env)
        ?.options
    ).toMatchObject({
      rooms: 3,
      mutationRate: 5,
      rampSeconds: 5,
      holdSeconds: 10,
    });
  });

  test.each([
    ["--rooms", "0"],
    ["--rooms", "1.5"],
    ["--rooms", "Infinity"],
    ["--rooms", ""],
    ["--rooms", "NaN"],
    ["--clients-per-room", "1"],
    ["--writers-per-room", "11"],
    ["--mutation-rate", "0"],
    ["--mutation-rate", "1001"],
    ["--payload-bytes", "-1"],
    ["--payload-bytes", "10000001"],
    ["--ramp-seconds", "-1"],
    ["--hold-seconds", "0"],
    ["--hold-seconds", "3000000"],
    ["--report", ""],
    ["--unknown"],
  ])("rejects invalid options %j before network access", (...args) => {
    expect(() => parseConfig(args, env)).toThrow();
  });

  test.each([
    "wss://load.example.com",
    "https://user:password@load.example.com",
    "https://load.example.com/prefix",
    "https://load.example.com?key=secret",
    "https://load.example.com#fragment",
  ])("rejects unsupported or credential-bearing target %s", (baseUrl) => {
    expect(() =>
      parseConfig([], { ...env, LIVEBLOCKS_BASE_URL: baseUrl })
    ).toThrow();
  });
});

describe("load generation and observations", () => {
  test("counts scheduled work against a shared deadline", () => {
    expect(scheduledCount(0, 1000, 10_000)).toBe(10);
    expect(scheduledCount(999, 1000, 10_000)).toBe(10);
    expect(scheduledCount(500, 1000, 500)).toBe(0);
    expect(scheduledCount(999, 1000, 2500)).toBe(2);
  });

  test("skips missed slots without drifting or issuing a catch-up burst", () => {
    expect(nextWriteAt(1000, 1000, 1000)).toBe(2000);
    expect(nextWriteAt(1000, 1050, 1000)).toBe(2000);
    expect(nextWriteAt(1000, 4500, 1000)).toBe(5000);
  });

  test("deduplicates recipient observations and counts coalesced sequences", () => {
    const observations = new Observations();
    expect(observations.observe("writer-0", 1)).toBe(true);
    expect(observations.observe("writer-0", 1)).toBe(false);
    expect(observations.observe("writer-0", 4)).toBe(true);
    expect(observations.observe("writer-0", 2)).toBe(false);
    expect(observations.observe("writer-1", 3)).toBe(true);
    expect(observations.skipped).toBe(4);
  });

  test("reports bounded latency percentiles with empty and overflow samples", () => {
    const histogram = new MillisecondHistogram();
    expect(histogram.snapshot()).toMatchObject({ count: 0, p95Ms: null });
    histogram.record(10);
    histogram.record(20);
    histogram.record(30);
    histogram.record(Number.NaN);
    histogram.record(-1);
    expect(histogram.snapshot().count).toBe(3);
    expect(histogram.snapshot().p50Ms).toBeCloseTo(20, 1);
    histogram.record(4_000_000);
    expect(histogram.snapshot()).toMatchObject({ count: 4, clipped: 1 });
  });
});
