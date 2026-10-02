// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { auth } from "@/features/users/api/auth";
import { getUser, getUsers } from "@/lib/database";
import {
  authRequest,
  cookiesFrom,
  demoSessionCookie,
  signInDemo,
} from "@/tests/helpers/auth";

describe("POST /api/auth/sign-in/demo", () => {
  it("signs in a demo user and sets a session cookie", async () => {
    const user = getUsers()[1];
    const response = await signInDemo(user.id);

    expect(response.status).toBe(200);
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((c) => c.includes("session_token="))).toBe(true);
    expect(setCookies.some((c) => c.includes("session_data"))).toBe(true);

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookiesFrom(response) }),
    });
    expect(session?.user.id).toBe(user.id);
    expect(session?.user.name).toBe(user.info.name);
    expect(session?.user.image).toBe(user.info.avatar);
  });

  it("rejects an unknown user", async () => {
    const response = await signInDemo("nobody@example.com");
    expect(response.status).toBe(400);
  });

  it("rejects the AI teammate", async () => {
    const response = await signInDemo("ai-assistant");
    expect(response.status).toBe(400);
  });

  it("rejects a missing userId", async () => {
    const response = await authRequest("/sign-in/demo", {});
    expect(response.status).toBe(400);
  });
});

describe("session", () => {
  it("is null without a cookie", async () => {
    const session = await auth.api.getSession({ headers: new Headers() });
    expect(session).toBeNull();
  });

  it("is validated from the cookie alone", async () => {
    const user = getUser("charlie.layne@example.com")!;
    const cookie = await demoSessionCookie(user.id);

    const first = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    const second = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(first?.user.id).toBe(user.id);
    expect(second?.session.token).toBe(first?.session.token);
  });

  it("survives a fresh server instance without a database", async () => {
    const user = getUser("mislav.abha@example.com")!;
    const cookie = await demoSessionCookie(user.id);

    vi.resetModules();
    const fresh = await import("@/features/users/api/auth");
    expect(fresh.auth).not.toBe(auth);

    const session = await fresh.auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.id).toBe(user.id);
  });

  it("is cleared by sign-out", async () => {
    const cookie = await demoSessionCookie("tatum.paolo@example.com");

    const signOut = await authRequest("/sign-out", {}, cookie);
    expect(signOut.status).toBe(200);
    const cleared = signOut.headers.getSetCookie();
    expect(cleared.some((c) => /session_token=;|Max-Age=0/.test(c))).toBe(true);
  });
});
