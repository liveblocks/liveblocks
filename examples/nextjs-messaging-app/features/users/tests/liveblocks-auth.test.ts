// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { LiveblocksMock, prepareSession, allow, authorize } = vi.hoisted(() => ({
  LiveblocksMock: vi.fn(),
  prepareSession: vi.fn(),
  allow: vi.fn(),
  authorize: vi.fn(),
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class {
    constructor(options: unknown) {
      LiveblocksMock(options);
    }

    prepareSession(userId: string, options: unknown) {
      prepareSession(userId, options);
      return { allow, authorize };
    }
  },
}));

import { POST } from "@/features/users/api/liveblocks-auth";
import { getUser } from "@/lib/database";
import { demoSessionCookie } from "@/tests/helpers/auth";

function authRequest({
  body,
  cookie,
}: { body?: unknown; cookie?: string } = {}) {
  return POST(
    new NextRequest("http://localhost/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

describe("POST /api/liveblocks-auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 403 when LIVEBLOCKS_SECRET_KEY is missing", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "");
    const response = await authRequest({ body: { room: "r" } });
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe(
      "Missing LIVEBLOCKS_SECRET_KEY"
    );
    expect(LiveblocksMock).not.toHaveBeenCalled();
  });

  it("returns 401 without a session", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    const response = await authRequest({ body: { room: "r" } });
    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("Unauthorized");
    expect(prepareSession).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid JSON without a session", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    const response = await POST(
      new NextRequest("http://localhost/api/liveblocks-auth", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(401);
  });

  it("authorizes the signed-in demo user", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ token: "t" }),
    });
    const user = getUser("charlie.layne@example.com")!;
    const cookie = await demoSessionCookie(user.id);

    const response = await authRequest({ body: { room: "r" }, cookie });

    expect(LiveblocksMock).toHaveBeenCalledWith({
      secret: "sk_test",
      baseUrl: undefined,
    });
    expect(prepareSession).toHaveBeenCalledWith(user.id, {
      userInfo: user.info,
    });
    expect(allow).toHaveBeenCalledWith("liveblocks:examples:*", ["*:write"]);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(JSON.stringify({ token: "t" }));
  });

  it("ignores a userId in the body when a session is present", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({ status: 200, body: "{}" });
    const cookie = await demoSessionCookie("charlie.layne@example.com");

    await authRequest({
      body: { room: "r", userId: "mislav.abha@example.com" },
      cookie,
    });

    expect(prepareSession).toHaveBeenCalledWith(
      "charlie.layne@example.com",
      expect.any(Object)
    );
  });

  it("passes NEXT_PUBLIC_LIVEBLOCKS_BASE_URL to Liveblocks", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    vi.stubEnv("NEXT_PUBLIC_LIVEBLOCKS_BASE_URL", "http://localhost:1153");
    authorize.mockResolvedValue({ status: 200, body: "{}" });
    const cookie = await demoSessionCookie("charlie.layne@example.com");

    await authRequest({ body: { room: "r" }, cookie });

    expect(LiveblocksMock).toHaveBeenCalledWith({
      secret: "sk_test",
      baseUrl: "http://localhost:1153",
    });
  });

  describe("gallery preview", () => {
    it("authorizes previewUserId without a session", async () => {
      vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
      authorize.mockResolvedValue({ status: 200, body: "{}" });
      const user = getUser("tatum.paolo@example.com")!;

      const response = await authRequest({
        body: { room: "r", previewUserId: user.id },
      });

      expect(response.status).toBe(200);
      expect(prepareSession).toHaveBeenCalledWith(user.id, {
        userInfo: user.info,
      });
    });

    it("prefers previewUserId over the session cookie", async () => {
      vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
      authorize.mockResolvedValue({ status: 200, body: "{}" });
      const cookie = await demoSessionCookie("charlie.layne@example.com");

      await authRequest({
        body: { room: "r", previewUserId: "mislav.abha@example.com" },
        cookie,
      });

      expect(prepareSession).toHaveBeenCalledWith(
        "mislav.abha@example.com",
        expect.any(Object)
      );
    });

    it("returns 401 for an unknown previewUserId", async () => {
      vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
      const response = await authRequest({
        body: { room: "r", previewUserId: "nobody@example.com" },
      });
      expect(response.status).toBe(401);
      expect(prepareSession).not.toHaveBeenCalled();
    });

    it("returns 401 for the AI teammate as previewUserId", async () => {
      vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
      const response = await authRequest({
        body: { room: "r", previewUserId: "ai-assistant" },
      });
      expect(response.status).toBe(401);
    });
  });
});
