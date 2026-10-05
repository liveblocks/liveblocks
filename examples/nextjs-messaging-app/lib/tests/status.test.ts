import { beforeEach, describe, expect, it } from "vitest";
import {
  EMPTY_STATUS,
  getStatusKey,
  hasStatus,
  isActive,
  normalizeStatus,
  parseStatus,
  readStatus,
  STATUS_TEXT_MAX_LENGTH,
  writeStatus,
} from "@/lib/status";

const USER_ID = "charlie.layne@example.com";

describe("getStatusKey", () => {
  it("scopes status storage to the user id", () => {
    expect(getStatusKey(USER_ID)).toBe(
      `liveblocks-messaging-app:status:${USER_ID}`
    );
  });
});

describe("hasStatus", () => {
  it("is false for empty or missing status", () => {
    expect(hasStatus(undefined)).toBe(false);
    expect(hasStatus(EMPTY_STATUS)).toBe(false);
    expect(hasStatus({ emoji: null, text: "   ", away: false })).toBe(false);
  });

  it("is true when emoji or trimmed text is set", () => {
    expect(hasStatus({ emoji: "🎉", text: "", away: false })).toBe(true);
    expect(hasStatus({ emoji: null, text: "  busy  ", away: false })).toBe(
      true
    );
  });
});

describe("isActive", () => {
  it("treats missing or non-away status as active", () => {
    expect(isActive(undefined)).toBe(true);
    expect(isActive({ emoji: null, text: "", away: false })).toBe(true);
  });

  it("is false when away is true", () => {
    expect(isActive({ emoji: null, text: "", away: true })).toBe(false);
  });
});

describe("normalizeStatus", () => {
  it("trims text and clears empty emoji", () => {
    expect(
      normalizeStatus({ emoji: "", text: "  hello  ", away: false })
    ).toEqual({ emoji: null, text: "hello", away: false });
  });

  it("caps text to STATUS_TEXT_MAX_LENGTH", () => {
    const long = "a".repeat(STATUS_TEXT_MAX_LENGTH + 20);
    expect(
      normalizeStatus({ emoji: null, text: long, away: false }).text.length
    ).toBe(STATUS_TEXT_MAX_LENGTH);
  });

  it("preserves away and non-empty emoji", () => {
    expect(normalizeStatus({ emoji: "🎉", text: "party", away: true })).toEqual(
      { emoji: "🎉", text: "party", away: true }
    );
  });
});

describe("parseStatus", () => {
  it("returns null for null input", () => {
    expect(parseStatus(null)).toBe(null);
  });

  it("returns null for invalid JSON", () => {
    expect(parseStatus("{")).toBe(null);
  });

  it("returns null for non-object JSON", () => {
    expect(parseStatus('"hello"')).toBe(null);
    expect(parseStatus("42")).toBe(null);
  });

  it("fills partial objects and coerces away", () => {
    expect(parseStatus('{"text":"hi"}')).toEqual({
      emoji: null,
      text: "hi",
      away: false,
    });
    expect(parseStatus('{"emoji":"🎉","away":"yes"}')).toEqual({
      emoji: "🎉",
      text: "",
      away: false,
    });
    expect(parseStatus('{"away":true}')).toEqual({
      emoji: null,
      text: "",
      away: true,
    });
  });
});

describe("readStatus and writeStatus", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("roundtrips normalized status through localStorage", () => {
    const status = { emoji: "🎉", text: "  focus  ", away: true };
    writeStatus(USER_ID, status);
    expect(readStatus(USER_ID)).toEqual({
      emoji: "🎉",
      text: "focus",
      away: true,
    });
    expect(localStorage.getItem(getStatusKey(USER_ID))).toBe(
      JSON.stringify({ emoji: "🎉", text: "focus", away: true })
    );
  });

  it("returns EMPTY_STATUS when nothing is stored", () => {
    expect(readStatus(USER_ID)).toEqual(EMPTY_STATUS);
  });

  it("returns EMPTY_STATUS when stored JSON is invalid", () => {
    localStorage.setItem(getStatusKey(USER_ID), "not-json");
    expect(readStatus(USER_ID)).toEqual(EMPTY_STATUS);
  });
});
