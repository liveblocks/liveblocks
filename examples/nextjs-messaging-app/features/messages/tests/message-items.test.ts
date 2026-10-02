import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMessageListItems } from "@/features/messages";
import type { ChatMessage } from "@/lib/feeds";

function message(id: string, createdAt: number, userId: string): ChatMessage {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    data: { userId, content: "text" },
  };
}

describe("buildMessageListItems", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sorts messages by createdAt ascending", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const t = Date.now();
    const m1 = message("b", t + 2000, "u1");
    const m2 = message("a", t + 1000, "u1");

    const items = buildMessageListItems([m1, m2], { dayDividers: false });
    const messages = items.filter((i) => i.type === "message");
    expect(messages.map((i) => i.message.id)).toEqual(["a", "b"]);
  });

  it("inserts day dividers and sets showHeader after a divider", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const today = Date.now();
    const yesterday = today - 24 * 60 * 60 * 1000;

    const items = buildMessageListItems([
      message("y1", yesterday, "u1"),
      message("y2", yesterday + 60_000, "u1"),
      message("t1", today, "u1"),
    ]);

    expect(items[0]).toMatchObject({ type: "divider", label: "Yesterday" });
    expect(items[1]).toMatchObject({ type: "message", showHeader: true });
    expect(items[2]).toMatchObject({ type: "message", showHeader: false });

    const todayDivider = items.find(
      (i) => i.type === "divider" && i.label === "Today"
    );
    expect(todayDivider).toBeDefined();
    const afterToday = items[items.indexOf(todayDivider!) + 1];
    expect(afterToday).toMatchObject({ type: "message", showHeader: true });
  });

  it("groups same-author messages within five minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const t = Date.now();

    const items = buildMessageListItems(
      [
        message("1", t, "u1"),
        message("2", t + 2 * 60_000, "u1"),
        message("3", t + 8 * 60_000, "u1"),
        message("4", t + 9 * 60_000, "u2"),
      ],
      { dayDividers: false }
    );

    const headers = items.map((i) =>
      i.type === "message" ? i.showHeader : null
    );
    expect(headers).toEqual([true, false, true, true]);
  });

  it("omits dividers when dayDividers is false", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const today = Date.now();
    const yesterday = today - 24 * 60 * 60 * 1000;

    const items = buildMessageListItems(
      [message("a", yesterday, "u1"), message("b", today, "u1")],
      { dayDividers: false }
    );

    expect(items.every((i) => i.type === "message")).toBe(true);
  });

  it("uses message id as item key", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const m = message("msg-key", Date.now(), "u1");
    const items = buildMessageListItems([m], { dayDividers: false });
    expect(items[0]).toMatchObject({ type: "message", key: "msg-key" });
  });
});
