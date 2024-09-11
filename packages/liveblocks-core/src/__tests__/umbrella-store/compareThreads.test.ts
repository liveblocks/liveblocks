import type { ThreadData } from "../../protocol/Comments";
import { compareThreads } from "../../umbrella-store";

describe("compareThreads", () => {
  const thread1: ThreadData = {
    type: "thread" as const,
    id: "th_1",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
    comments: [],
    metadata: {},
    resolved: false,
  };

  const thread2: ThreadData = {
    type: "thread" as const,
    id: "th_1",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
    comments: [],
    metadata: {},
    resolved: false,
  };

  it("should return 1 when thread1 is updated more recently than thread2", () => {
    thread1.updatedAt = new Date("2024-01-02");
    thread2.updatedAt = new Date("2024-01-01");
    expect(compareThreads(thread1, thread2)).toBe(1);
  });

  it("should return -1 when thread2 is updated more recently than thread1", () => {
    thread1.updatedAt = new Date("2024-01-01");
    thread2.updatedAt = new Date("2024-01-02");
    expect(compareThreads(thread1, thread2)).toBe(-1);
  });

  it("should return 1 when only thread1 has an updatedAt", () => {
    thread1.updatedAt = new Date("2024-01-02");
    thread2.updatedAt = undefined;
    expect(compareThreads(thread1, thread2)).toBe(1);
  });

  it("should return -1 when only thread2 has an updatedAt", () => {
    thread1.updatedAt = undefined;
    thread2.updatedAt = new Date("2024-01-02");
    expect(compareThreads(thread1, thread2)).toBe(-1);
  });

  it("should return 1 when thread1 is created more recently and no updatedAt is present", () => {
    thread1.createdAt = new Date("2024-01-02");
    thread2.createdAt = new Date("2024-01-01");

    thread1.updatedAt = undefined;
    thread2.updatedAt = undefined;
    expect(compareThreads(thread1, thread2)).toBe(1);
  });

  it("should return -1 when thread2 is created more recently and no updatedAt is present", () => {
    thread1.createdAt = new Date("2024-01-01");
    thread2.createdAt = new Date("2024-01-02");

    thread1.updatedAt = undefined;
    thread2.updatedAt = undefined;
    expect(compareThreads(thread1, thread2)).toBe(-1);
  });

  it("should return 0 when both threads have the same updatedAt and createdAt", () => {
    thread1.updatedAt = new Date("2024-01-01");
    thread2.updatedAt = new Date("2024-01-01");
    expect(compareThreads(thread1, thread2)).toBe(0);
  });
});
