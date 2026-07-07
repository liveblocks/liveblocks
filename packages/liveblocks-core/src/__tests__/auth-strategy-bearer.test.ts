import { describe, expect, test } from "vitest";

import { createAuthManager } from "../auth-manager";
import { bearerAuthStrategy } from "../auth-strategy-bearer";

describe("bearerAuthStrategy", () => {
  test("reuses one credential for rooms matching the pattern, refetches otherwise", async () => {
    let calls = 0;
    const strategy = bearerAuthStrategy({
      getToken: () => {
        calls++;
        return Promise.resolve({
          token: `t-${calls}`,
          expiresIn: 3600,
          rooms: ["a-*"],
        });
      },
    });
    const manager = createAuthManager({ auth: strategy });

    const a1 = await manager.getAuthValue({
      resource: "room",
      roomId: "a-1",
      access: "read",
    });
    const a2 = await manager.getAuthValue({
      resource: "room",
      roomId: "a-2",
      access: "read",
    });
    const b1 = await manager.getAuthValue({
      resource: "room",
      roomId: "b-1",
      access: "read",
    });

    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b1);
    expect(calls).toBe(2);
  });

  test("personal:true covers resource:personal without a refetch", async () => {
    let calls = 0;
    const strategy = bearerAuthStrategy({
      getToken: () => {
        calls++;
        return Promise.resolve({
          token: "tok",
          expiresIn: 3600,
          rooms: ["a-*"],
          personal: true,
        });
      },
    });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "a-1", access: "read" });
    await manager.getAuthValue({ resource: "personal", access: "write" });

    expect(calls).toBe(1);
  });

  test("without personal flag, a rooms-only token does not satisfy personal requests", async () => {
    let calls = 0;
    const strategy = bearerAuthStrategy({
      getToken: () => {
        calls++;
        return Promise.resolve({
          token: `t-${calls}`,
          expiresIn: 3600,
          rooms: ["a-*"],
        });
      },
    });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "a-1", access: "read" });
    await manager.getAuthValue({ resource: "personal", access: "write" });

    expect(calls).toBe(2);
  });

  test("exact room pattern matches only that room", async () => {
    let calls = 0;
    const strategy = bearerAuthStrategy({
      getToken: () => {
        calls++;
        return Promise.resolve({
          token: `t-${calls}`,
          expiresIn: 3600,
          rooms: ["exact-room"],
        });
      },
    });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({
      resource: "room",
      roomId: "exact-room",
      access: "read",
    });
    await manager.getAuthValue({
      resource: "room",
      roomId: "exact-room",
      access: "write",
    });
    await manager.getAuthValue({
      resource: "room",
      roomId: "other",
      access: "read",
    });

    expect(calls).toBe(2);
  });

  test("identity is propagated from userId/userInfo", async () => {
    const strategy = bearerAuthStrategy({
      getToken: () =>
        Promise.resolve({
          token: "tok",
          expiresIn: 3600,
          userId: "u1",
          userInfo: { name: "Alice" },
          rooms: ["*"],
          personal: true,
        }),
    });
    const manager = createAuthManager({ auth: strategy });

    const v = await manager.getAuthValue({
      resource: "room",
      roomId: "r1",
      access: "read",
    });
    expect(v.type).toBe("credential");
    if (v.type !== "credential") throw new Error("expected credential");
    expect(v.credential.identity?.userId).toBe("u1");
    expect(v.credential.identity?.userInfo).toEqual({ name: "Alice" });
  });

  test("missing token results in a non-fatal error", async () => {
    const strategy = bearerAuthStrategy({
      // @ts-expect-error: testing for missing token in getToken result
      getToken: () => Promise.resolve({ expiresIn: 3600 }),
    });
    const manager = createAuthManager({ auth: strategy });

    await expect(
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" })
    ).rejects.toThrow("bearerAuthStrategy: getToken must return a");
  });

  test("getToken rejection is surfaced as a non-fatal error", async () => {
    const strategy = bearerAuthStrategy({
      getToken: () => Promise.reject(new Error("boom")),
    });
    const manager = createAuthManager({ auth: strategy });

    await expect(
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" })
    ).rejects.toThrow("boom");
  });

  test("token without expiresIn is never cached", async () => {
    let calls = 0;
    const strategy = bearerAuthStrategy({
      getToken: () => {
        calls++;
        return Promise.resolve({ token: `t-${calls}`, rooms: ["a-*"] });
      },
    });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "a-1", access: "read" });
    await manager.getAuthValue({ resource: "room", roomId: "a-1", access: "read" });

    expect(calls).toBe(2);
  });
});
