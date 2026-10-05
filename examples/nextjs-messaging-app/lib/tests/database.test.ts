import { describe, expect, it, vi } from "vitest";
import {
  AI_USER,
  AI_USER_ID,
  getRandomUser,
  getUser,
  getUsers,
} from "@/lib/database";

describe("getUsers", () => {
  it("returns five users with unique ids and profile info", () => {
    const users = getUsers();
    expect(users).toHaveLength(5);
    const ids = users.map((u) => u.id);
    expect(new Set(ids).size).toBe(5);
    for (const user of users) {
      expect(user.info.name).toBeTruthy();
      expect(user.info.avatar).toBeTruthy();
      expect(user.info.color).toBeTruthy();
    }
    expect(users.some((u) => u.id === AI_USER_ID)).toBe(false);
  });
});

describe("getUser", () => {
  it("finds a known user", () => {
    const users = getUsers();
    expect(getUser(users[0].id)).toEqual(users[0]);
  });

  it("returns undefined for unknown ids", () => {
    expect(getUser("not-a-user")).toBeUndefined();
  });

  it("returns AI_USER for AI_USER_ID", () => {
    expect(getUser(AI_USER_ID)).toEqual(AI_USER);
  });
});

describe("getRandomUser", () => {
  it("returns one of the regular users", () => {
    const users = getUsers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomUser()).toBe(users[0]);
    vi.restoreAllMocks();
  });
});
