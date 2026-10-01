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
import { getUser, getUsers } from "@/lib/database";

const DEMO_USER_IDS = getUsers().map((user) => user.id);

function authRequest(body?: unknown) {
  return POST(
    new NextRequest("http://localhost/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

describe("POST /api/liveblocks-auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 when LIVEBLOCKS_SECRET_KEY is missing", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "");
    const response = await authRequest({ userId: "charlie.layne@example.com" });
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe(
      "Missing LIVEBLOCKS_SECRET_KEY"
    );
    expect(LiveblocksMock).not.toHaveBeenCalled();
  });

  it("authorizes a known demo user", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ token: "t" }),
    });

    const user = getUser("charlie.layne@example.com")!;
    const response = await authRequest({ userId: user.id });

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

  it("passes NEXT_PUBLIC_LIVEBLOCKS_BASE_URL to Liveblocks", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    vi.stubEnv("NEXT_PUBLIC_LIVEBLOCKS_BASE_URL", "http://localhost:1153");
    authorize.mockResolvedValue({ status: 200, body: "{}" });

    await authRequest({ userId: "charlie.layne@example.com" });

    expect(LiveblocksMock).toHaveBeenCalledWith({
      secret: "sk_test",
      baseUrl: "http://localhost:1153",
    });
  });

  it("returns 403 for an unknown userId", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    const response = await authRequest({ userId: "nobody@example.com" });
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("User not found");
  });

  it("falls back to a random demo user for ai-assistant", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({ status: 200, body: "{}" });
    vi.spyOn(Math, "random").mockReturnValue(0);

    await authRequest({ userId: "ai-assistant" });

    expect(prepareSession).toHaveBeenCalledWith(
      DEMO_USER_IDS[0],
      expect.objectContaining({ userInfo: getUser(DEMO_USER_IDS[0])!.info })
    );
    expect(prepareSession.mock.calls[0][0]).not.toBe("ai-assistant");
    vi.restoreAllMocks();
  });

  it("falls back to a random demo user for invalid JSON", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({ status: 200, body: "{}" });
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const response = await POST(
      new NextRequest("http://localhost/api/liveblocks-auth", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(response.status).toBe(200);
    expect(prepareSession).toHaveBeenCalledWith(
      DEMO_USER_IDS[DEMO_USER_IDS.length - 1],
      expect.any(Object)
    );
    vi.restoreAllMocks();
  });

  it("falls back to a random demo user when body omits userId", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
    authorize.mockResolvedValue({ status: 200, body: "{}" });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const response = await authRequest({});

    expect(response.status).toBe(200);
    expect(prepareSession).toHaveBeenCalledWith(
      DEMO_USER_IDS[0],
      expect.any(Object)
    );
    vi.restoreAllMocks();
  });
});
