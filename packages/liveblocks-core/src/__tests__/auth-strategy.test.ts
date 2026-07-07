import { beforeEach, describe, expect, test, vi } from "vitest";

import { createAuthManager } from "../auth-manager";
import { type AuthCredential, type AuthStrategy } from "../auth-strategy";
import { StopRetrying } from "../connection";

/**
 * A minimal opaque-token strategy used to exercise the generic auth manager
 * behavior: exact-key caching, expiry eviction, invalidate(), fatal results,
 * and identity propagation. It does NOT override `satisfies()`, so the manager
 * falls back to its default exact-key caching.
 */
function makeOpaqueStrategy(opts: {
  token?: string;
  expiresIn?: number;
  userId?: string;
  fatal?: boolean;
  reason?: string;
}): AuthStrategy & { calls: number } {
  let calls = 0;
  const strategy: AuthStrategy & { calls: number } = {
    get calls() {
      return calls;
    },
    authenticate() {
      calls++;
      if (opts.fatal) {
        return Promise.resolve({
          ok: false,
          fatal: true,
          reason: opts.reason ?? "nope",
        });
      }
      const credential: AuthCredential = {
        token: opts.token ?? `tok-${calls}`,
        expiresAt:
          opts.expiresIn !== undefined
            ? Math.floor(Date.now() / 1000) + opts.expiresIn
            : undefined,
        identity: opts.userId ? { userId: opts.userId } : undefined,
      };
      return Promise.resolve({ ok: true, credential });
    },
  };
  return strategy;
}

describe("auth-manager (generic strategy)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  test("exact-key caching reuses a credential for the same request", async () => {
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    const manager = createAuthManager({ auth: strategy });

    const a = await manager.getAuthValue({
      resource: "room",
      roomId: "r1",
      access: "read",
    });
    const b = await manager.getAuthValue({
      resource: "room",
      roomId: "r1",
      access: "read",
    });

    expect(a).toEqual(b);
    expect(strategy.calls).toBe(1);
  });

  test("different request keys trigger a new fetch", async () => {
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    await manager.getAuthValue({ resource: "room", roomId: "r2", access: "read" });

    expect(strategy.calls).toBe(2);
  });

  test("expiresAt expiry evicts the cached credential", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 60 });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    expect(strategy.calls).toBe(1);

    vi.setSystemTime(120 * 1000);
    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    expect(strategy.calls).toBe(2);
    vi.useRealTimers();
  });

  test("invalidate() evicts the cached credential and forces re-auth", async () => {
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    const manager = createAuthManager({ auth: strategy });

    const v = await manager.getAuthValue({
      resource: "room",
      roomId: "r1",
      access: "read",
    });
    expect(strategy.calls).toBe(1);

    manager.invalidate(v);
    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    expect(strategy.calls).toBe(2);
  });

  test("invalidate() forwards to the strategy's invalidate()", async () => {
    let invalidated: AuthCredential | undefined;
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    strategy.invalidate = (c) => {
      invalidated = c;
    };
    const manager = createAuthManager({ auth: strategy });

    const v = await manager.getAuthValue({
      resource: "room",
      roomId: "r1",
      access: "read",
    });
    manager.invalidate(v);
    expect(invalidated?.token).toBe("abc");
  });

  test("invalidate() is a no-op for public auth values", () => {
    const manager = createAuthManager({ publicApiKey: "pk_123" });
    expect(() =>
      manager.invalidate({ type: "public", publicApiKey: "pk_123" })
    ).not.toThrow();
  });

  test("fatal result throws StopRetrying", async () => {
    const strategy = makeOpaqueStrategy({ fatal: true, reason: "banned" });
    const manager = createAuthManager({ auth: strategy });

    await expect(
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" })
    ).rejects.toBeInstanceOf(StopRetrying);
  });

  test("non-fatal result throws a plain Error (retryable)", async () => {
    const strategy: AuthStrategy = {
      authenticate() {
        return Promise.resolve({ ok: false, fatal: false, reason: "transient" });
      },
    };
    const manager = createAuthManager({ auth: strategy });

    await expect(
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" })
    ).rejects.toThrow("transient");
  });

  test("optional identity is reflected on the credential", async () => {
    const strategy = makeOpaqueStrategy({
      token: "abc",
      expiresIn: 3600,
      userId: "u1",
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
  });

  test("credential without expiresAt is never cached (re-fetched each call)", async () => {
    const strategy = makeOpaqueStrategy({ token: "abc" });
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    expect(strategy.calls).toBe(2);
  });

  test("concurrent same-key requests are deduplicated", async () => {
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    const manager = createAuthManager({ auth: strategy });

    const [a, b] = await Promise.all([
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" }),
      manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" }),
    ]);
    expect(a).toEqual(b);
    expect(strategy.calls).toBe(1);
  });

  test("reset() clears the cache and forwards to the strategy", async () => {
    let resetCalls = 0;
    const strategy = makeOpaqueStrategy({ token: "abc", expiresIn: 3600 });
    strategy.reset = () => {
      resetCalls++;
    };
    const manager = createAuthManager({ auth: strategy });

    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });
    manager.reset();
    await manager.getAuthValue({ resource: "room", roomId: "r1", access: "read" });

    expect(strategy.calls).toBe(2);
    expect(resetCalls).toBe(1);
  });
});
