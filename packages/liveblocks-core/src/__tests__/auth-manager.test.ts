import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { createApiClient } from "../api-client";
import { type AuthRequest, createAuthManager } from "../auth-manager";
import { DEFAULT_BASE_URL } from "../constants";
import { Permission, type RoomPermissions } from "../permissions";
import type { ParsedAuthToken } from "../protocol/AuthToken";
import type {
  BaseMetadata,
  CommentBody,
  ThreadDataPlain,
} from "../protocol/Comments";

const SECONDS = 1 * 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

let fakeTokenCounter = 0;

function makeAccessToken(permissions: Record<string, RoomPermissions>): string {
  const now = Math.floor(Date.now() / 1000);
  fakeTokenCounter++;

  return `${encodeJwtPart({ alg: "RS256", typ: "JWT" })}.${encodeJwtPart({
    iat: now,
    exp: now + 3600,
    pid: "test-project",
    uid: "user1",
    perms: permissions,
    k: "acc",
    jti: `test-token-${fakeTokenCounter}`,
  })}.${btoa(`test-signature-${fakeTokenCounter}`)}`;
}

function encodeJwtPart(value: unknown): string {
  return btoa(JSON.stringify(value));
}

describe("auth-manager - public api key", () => {
  test("should return public api key", async () => {
    const authManager = createAuthManager({ publicApiKey: "pk_123" });

    const authValue = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "room1",
    })) as { type: "public"; publicApiKey: string };

    expect(authValue.type).toEqual("public");
    expect(authValue.publicApiKey).toEqual("pk_123");
  });
});

describe("auth-manager - secret auth", () => {
  let requestCount = 0;

  /*
    Access token with those permissions:
        perms: {
          "org1*": ["room:write"],
        }
  */
  const accessToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyJvcmcxKiI6WyJyb29tOndyaXRlIl19LCJrIjoiYWNjIn0.H9EpvO91L5R20ACSIXoJgjmTUeWJRHt91yCxgZ7J0km_FsjaqhYmlyD-ln3N9HpIXnei2y7shyoVTsSKwuYandwVQYLbPXP0tnZSlyp7WbTVcXEz--5ngDj0ePDw5OkDHcDiY243DGJconYZrbru9J86BpgBLsO0d4zJfnmF4hgyGXD7nm7TdJ0DudT_2_gUDECYXcgCT7cRUFfYtkFvC2IYJK0MeFKd3OX06u3k5tw9umUTDRdGs42BAWs6lvUxU4SPkjy24gQVmRK0FCf2sYmtKYA6WmRebp2Y4wR_NLV7GVznZY4-jy8AxmPhzB3GgXj3-uOz_3KC04XHQv8wxg";

  /*
    Access token with those permissions:
        perms: {
          "org1*": ["comments:read"],
        }
  */
  const accessTokenWildcardCommentsRead =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJrIjoiYWNjIiwicGlkIjoiNjVjNTI3OGY4M2NlMGY4MGYyYjhlYzY1IiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyJvcmcxKiI6WyJjb21tZW50czpyZWFkIl19LCJtY3ByIjoyMCwiaWF0IjoxNzA3NDE5NTM2LCJleHAiOjE3MDc0MjMxMzYsImp0aSI6InRnWS1TdVdkdEN2VCJ9.4G4gPwZ9tUGXaNX7G3rTf67tCLMGoiBm0-R1DiVkqSjfycxidzqyv4wAQqKFO3-QqvDuIqeuN95xd5ZmO8984qDReTNZXxYMa6D1qpWkwbqmC-wmSg9LXEVaT2odJ9ZV8XHvdePc0L9BcpsUJteiZfjrjwyql8kPqDAkRxpXcn-4wnLFmqDXFhKWFfbSqSR1DJW6071zZWd-IUdVELEtp6Tbc0HhCR_qnAsfEPyqf1Rl2DCGtDAbaY8lFLYNu2KUxw_OKtxBXOTBzEjMnwOQoEqc5y_Sd8zL1izr2Ze5az7cPecN8VqGPAyVZRtmVVIAEuvtC7xf1QhQ4OaQ8YVRWA";

  /*
    Access token with those permissions:
        perms: {}
  */
  const accessTokenWithNoPermission =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJrIjoiYWNjIiwicGlkIjoiNjVjZmMxNzliNzQ5ZjQyNjZhMjIzZTM5IiwidWlkIjoidXNlcjEiLCJwZXJtcyI6e30sIm1jcHIiOjMwLCJpYXQiOjE3MDgxMTQyOTcsImV4cCI6MTcwODExNzg5NywianRpIjoiaUFvQmt6ZU5CVDlEIn0.KvD3ECrEx9-35jQM1lg-qoREigegQkNInMclGs99_Jz2TUVK-zPJvZX0l4px3VE1dTF71O-i1nDwLIoScTobjRgR999hMTR1l2PnPVgiTn2V56j6sRQMJsKmsk8_XSQvwe1brKFaRK-8T0l6Pe2VsImIjo0opZfRBiPXPpVxyq0GunTr16pp_Jdfxrzp9xw5-Vc4LmUUKlviFp5cNeeh-whF6IKKZ0AD1JRIlVI_o9QCyzmJd930ef-w4yh5YOTlq8ekT80J_UdpiJHe47Bb8JsJAFcSHPCf8ciet_qSzkMHknPq78XfKilx4aCcDyJUYS1QvhToF0GJFYrmNBeECQ";

  /*
    ID token that gives access to user "user1"
  */
  const idToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJrIjoiaWQifQ.MhjHg2udkBivX7cW8Q1jmgc4DOZ1YnMoUnP61O32JLVJlIsc0zmHWA__DItsO3vBbRS8doG98cOzSE2qQ-5rKoX2l19k5Mr7gk6M75u1kOAzppV_3YQAGeZ8PfsUUPUBGOF5O6msLnha-HcAywvBuoUmcqP0CF_xhBBx0CLbFeuaWVJqndPKe8LJk9EYcB29HEwFaIzrOSarU1iLxRhsa8FCB910GTDcaApaUTPM9ZRadmf33ypSn3c6by0BWI54vx4O2p-hFsmJ71R38ifRRVq3ETXn78ftwbu1pp6hMTqyYn5YLlnZPPM-JAck_OsarGvE9cxg_Z3Y8bMTOlA5E";

  const server = setupServer(
    http.post("/api/access-auth", () => {
      requestCount++;
      return HttpResponse.json({ token: accessToken });
    }),
    http.post("/api/access-auth-comments-read", () => {
      requestCount++;
      return HttpResponse.json({ token: accessTokenWildcardCommentsRead });
    }),
    http.post("/api/access-auth-no-permission", () => {
      requestCount++;
      return HttpResponse.json({ token: accessTokenWithNoPermission });
    }),
    http.post("/api/id-auth", () => {
      requestCount++;
      return HttpResponse.json({ token: idToken });
    }),
    http.post("/api/403", () => {
      return new HttpResponse(null, { status: 403 });
    }),
    http.post("/api/401-with-details", () => {
      return new HttpResponse("wrong key type", { status: 401 });
    }),
    http.post("/api/not-json", () => {
      return new HttpResponse("this is not json", { status: 202 });
    }),
    http.post("/api/missing-token", () => {
      return HttpResponse.json({}, { status: 202 });
    })
  );

  beforeEach(() => (requestCount = 0));
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should return token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValue = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValue.type).toEqual("secret");
    expect(authValue.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("should deduplicate concurrent requests on same room", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const results = await Promise.all([
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "org1.room1",
      }),
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "org1.room1",
      }),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(requestCount).toBe(1);
  });

  test("should reuse a concurrent duplicate same-room token when it satisfies different permission requirements", async () => {
    let localRequestCount = 0;
    const commentsWriteToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.CommentsWrite],
    });

    server.use(
      http.post("/api/access-auth-comments-duplicate", async () => {
        localRequestCount++;
        if (localRequestCount === 2) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        return HttpResponse.json({ token: commentsWriteToken });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-duplicate",
    });

    const readAuthValue$ = authManager.getAuthValue({
      resource: "comments",
      access: "read",
      roomId: "org1.room1",
    });
    const writeAuthValue$ = authManager.getAuthValue({
      resource: "comments",
      access: "write",
      roomId: "org1.room1",
    });

    const [readAuthValue, writeAuthValue] = await Promise.all([
      readAuthValue$,
      writeAuthValue$,
    ]);

    expect(readAuthValue.type).toEqual("secret");
    expect(writeAuthValue.type).toEqual("secret");
    if (readAuthValue.type !== "secret" || writeAuthValue.type !== "secret") {
      throw new Error("Expected secret auth values");
    }
    expect(readAuthValue.token.raw).toEqual(commentsWriteToken);
    expect(writeAuthValue.token.raw).toEqual(commentsWriteToken);
    expect(localRequestCount).toBe(2);
  });

  test("should not deduplicate concurrent same-room requests with different permission requirements", async () => {
    let localRequestCount = 0;
    const storageReadToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.StorageRead],
    });
    const roomReadToken = makeAccessToken({
      "org1*": [Permission.Read],
    });

    server.use(
      http.post("/api/access-auth-storage-then-room-read", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: localRequestCount === 1 ? storageReadToken : roomReadToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-then-room-read",
    });

    const storageAuthValue$ = authManager.getAuthValue({
      resource: "storage",
      access: "read",
      roomId: "org1.room1",
    });
    const presenceAuthValue$ = authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    });

    const [storageAuthValue, presenceAuthValue] = await Promise.all([
      storageAuthValue$,
      presenceAuthValue$,
    ]);

    expect(storageAuthValue.type).toEqual("secret");
    expect(presenceAuthValue.type).toEqual("secret");
    if (
      storageAuthValue.type !== "secret" ||
      presenceAuthValue.type !== "secret"
    ) {
      throw new Error("Expected secret auth values");
    }
    expect(storageAuthValue.token.raw).toEqual(storageReadToken);
    expect(presenceAuthValue.token.raw).toEqual(roomReadToken);
    expect(localRequestCount).toBe(2);
  });

  test("should use cache when access token has correct permissions", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room2",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("should reuse broad comments token for scoped comments read requests", async () => {
    let localRequestCount = 0;
    const commentsReadToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.CommentsRead],
    });

    server.use(
      http.post("/api/access-auth-comments-read", () => {
        localRequestCount++;
        return HttpResponse.json({ token: commentsReadToken });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read",
    });

    const commentsReadAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const publicReadAuthValue = (await authManager.getAuthValue({
      resource: "comments:public",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(commentsReadAuthValue.token.raw).toEqual(commentsReadToken);
    expect(publicReadAuthValue.token.raw).toEqual(commentsReadToken);
    expect(localRequestCount).toBe(1);
  });

  test("should reuse scoped comments read token for generic comments read requests", async () => {
    let localRequestCount = 0;
    const publicCommentsReadToken = makeAccessToken({
      "org1*": [
        Permission.Read,
        Permission.CommentsNone,
        Permission.CommentsPublicRead,
      ],
    });

    server.use(
      http.post("/api/access-auth-public-comments-read", () => {
        localRequestCount++;
        return HttpResponse.json({ token: publicCommentsReadToken });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-public-comments-read",
    });

    const publicReadAuthValue = (await authManager.getAuthValue({
      resource: "comments:public",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const commentsReadAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(publicReadAuthValue.token.raw).toEqual(publicCommentsReadToken);
    expect(commentsReadAuthValue.token.raw).toEqual(publicCommentsReadToken);
    expect(localRequestCount).toBe(1);
  });

  test("should reuse scoped comments write token for generic comments write requests", async () => {
    let localRequestCount = 0;
    const publicCommentsWriteToken = makeAccessToken({
      "org1*": [
        Permission.Read,
        Permission.CommentsNone,
        Permission.CommentsPublicWrite,
      ],
    });

    server.use(
      http.post("/api/access-auth-public-then-comments-write", () => {
        localRequestCount++;
        return HttpResponse.json({ token: publicCommentsWriteToken });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-public-then-comments-write",
    });

    const publicWriteAuthValue = (await authManager.getAuthValue({
      resource: "comments:public",
      access: "write",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const commentsWriteAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "write",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(publicWriteAuthValue.token.raw).toEqual(publicCommentsWriteToken);
    expect(commentsWriteAuthValue.token.raw).toEqual(publicCommentsWriteToken);
    expect(localRequestCount).toBe(1);
  });

  test("should not reuse public comments token for private comments requests", async () => {
    let localRequestCount = 0;
    const publicCommentsReadToken = makeAccessToken({
      "org1*": [
        Permission.Read,
        Permission.CommentsNone,
        Permission.CommentsPublicRead,
      ],
    });
    const privateCommentsReadToken = makeAccessToken({
      "org1*": [
        Permission.Read,
        Permission.CommentsNone,
        Permission.CommentsPrivateRead,
      ],
    });

    server.use(
      http.post("/api/access-auth-public-then-private-comments-read", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? publicCommentsReadToken
              : privateCommentsReadToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-public-then-private-comments-read",
    });

    const publicReadAuthValue = (await authManager.getAuthValue({
      resource: "comments:public",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const privateReadAuthValue = (await authManager.getAuthValue({
      resource: "comments:private",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(publicReadAuthValue.token.raw).toEqual(publicCommentsReadToken);
    expect(privateReadAuthValue.token.raw).toEqual(privateCommentsReadToken);
    expect(localRequestCount).toBe(2);
  });

  test("api client should request concrete auth for known visibility and generic auth for unknown visibility", async () => {
    const commentBody = {
      version: 1,
      content: [],
    } satisfies CommentBody;
    const thread = {
      type: "thread",
      id: "th_123",
      roomId: "room-id",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      comments: [],
      metadata: {},
      resolved: false,
      visibility: "public",
    } satisfies ThreadDataPlain<BaseMetadata, BaseMetadata>;

    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/c/rooms/:roomId/threads`, () => {
        return HttpResponse.json({
          data: [],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date(0).toISOString(),
            nextCursor: null,
            permissionHints: {},
          },
        });
      }),
      http.post(`${DEFAULT_BASE_URL}/v2/c/rooms/:roomId/threads`, () =>
        HttpResponse.json(thread)
      ),
      http.post(
        `${DEFAULT_BASE_URL}/v2/c/rooms/:roomId/threads/:threadId/mark-as-resolved`,
        () => HttpResponse.json({})
      )
    );

    async function expectAuthRequest(
      run: (
        client: ReturnType<typeof createApiClient<BaseMetadata, BaseMetadata>>
      ) => Promise<unknown>,
      expected: AuthRequest
    ) {
      const authRequests: AuthRequest[] = [];
      const client = createApiClient<BaseMetadata, BaseMetadata>({
        baseUrl: DEFAULT_BASE_URL,
        fetchPolyfill: globalThis.fetch?.bind(globalThis),
        authManager: {
          reset() {},
          getAuthValue(request) {
            authRequests.push(request);
            return Promise.resolve({
              type: "public",
              publicApiKey: "pk_test",
            });
          },
        },
      });

      await run(client);

      expect(authRequests).toEqual([expected]);
    }

    await expectAuthRequest(
      (client) =>
        client.getThreads({
          roomId: "room-id",
          query: { visibility: "private" },
        }),
      { roomId: "room-id", resource: "comments:private", access: "read" }
    );

    await expectAuthRequest(
      (client) =>
        client.createThread({
          roomId: "room-id",
          metadata: {},
          commentMetadata: undefined,
          body: commentBody,
        }),
      { roomId: "room-id", resource: "comments:public", access: "write" }
    );

    await expectAuthRequest(
      (client) =>
        client.createThread({
          roomId: "room-id",
          visibility: "private",
          metadata: {},
          commentMetadata: undefined,
          body: commentBody,
        }),
      { roomId: "room-id", resource: "comments:private", access: "write" }
    );

    await expectAuthRequest(
      (client) =>
        client.markThreadAsResolved({
          roomId: "room-id",
          threadId: "th_123",
          visibility: "private",
        }),
      { roomId: "room-id", resource: "comments:private", access: "write" }
    );

    await expectAuthRequest(
      (client) =>
        client.markThreadAsResolved({
          roomId: "room-id",
          threadId: "th_123",
        }),
      { roomId: "room-id", resource: "comments", access: "write" }
    );
  });

  test("should fetch a new token when cached comments read token cannot write", async () => {
    let localRequestCount = 0;
    const commentsReadToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.CommentsRead],
    });
    const commentsWriteToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.CommentsWrite],
    });

    server.use(
      http.post("/api/access-auth-comments-read-then-write", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1 ? commentsReadToken : commentsWriteToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read-then-write",
    });

    const readAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const writeAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "write",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(readAuthValue.token.raw).toEqual(commentsReadToken);
    expect(writeAuthValue.token.raw).toEqual(commentsWriteToken);
    expect(localRequestCount).toBe(2);
  });

  test("should fetch a new token when cached resource-only token cannot access room presence", async () => {
    let localRequestCount = 0;
    const storageReadToken = makeAccessToken({
      "org1*": [Permission.StorageRead],
    });
    const roomReadToken = makeAccessToken({
      "org1*": [Permission.Read],
    });

    server.use(
      http.post("/api/access-auth-storage-then-room", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: localRequestCount === 1 ? storageReadToken : roomReadToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-then-room",
    });

    const storageAuthValue = (await authManager.getAuthValue({
      resource: "storage",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const presenceAuthValue = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(storageAuthValue.token.raw).toEqual(storageReadToken);
    expect(presenceAuthValue.token.raw).toEqual(roomReadToken);
    expect(localRequestCount).toBe(2);
  });

  test("should let exact room opt-outs override wildcard permissions without clearing other resources", async () => {
    let localRequestCount = 0;
    const storageOptOutToken = makeAccessToken({
      "org1*": [Permission.Write],
      "org1.room1": [Permission.Write, Permission.StorageNone],
    });
    const storageReadToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.StorageRead],
    });

    server.use(
      http.post("/api/access-auth-storage-opt-out-then-read", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1 ? storageOptOutToken : storageReadToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-opt-out-then-read",
    });

    const presenceAuthValue = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const commentsAuthValue = (await authManager.getAuthValue({
      resource: "comments",
      access: "write",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const storageAuthValue = (await authManager.getAuthValue({
      resource: "storage",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(presenceAuthValue.token.raw).toEqual(storageOptOutToken);
    expect(commentsAuthValue.token.raw).toEqual(storageOptOutToken);
    expect(storageAuthValue.token.raw).toEqual(storageReadToken);
    expect(localRequestCount).toBe(2);
  });

  test("should combine matching resource-only access token permissions by strongest access", async () => {
    let localRequestCount = 0;
    const storageConflictToken = makeAccessToken({
      "org1*": [Permission.Read, Permission.StorageWrite],
      "org1.room1": [Permission.Read, Permission.StorageNone],
    });

    server.use(
      http.post("/api/access-auth-storage-conflict", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: storageConflictToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-conflict",
    });

    const storageAuthValue = (await authManager.getAuthValue({
      resource: "storage",
      access: "write",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(storageAuthValue.token.raw).toEqual(storageConflictToken);
    expect(localRequestCount).toBe(1);
  });

  test("should use cached exact room access token for personal APIs", async () => {
    let localRequestCount = 0;
    const exactRoomToken = makeAccessToken({
      "org1.room1": [Permission.RoomWrite],
    });

    server.use(
      http.post("/api/access-auth-exact-room", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: exactRoomToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-exact-room",
    });

    const roomAuthValue = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };
    const userAuthValue = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(roomAuthValue.token.raw).toEqual(exactRoomToken);
    expect(userAuthValue.token.raw).toEqual(exactRoomToken);
    expect(localRequestCount).toBe(1);
  });

  test("when no roomId, should use cache when access token has correct permissions", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(requestCount).toBe(1);
  });

  test("when no roomId, should use cache when access token has correct permissions (higher level)", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("when no roomId, should use cache when access token has no permission", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-no-permission",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "personal",
      access: "write",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessTokenWithNoPermission);
    expect(authValueReq2.token.raw).toEqual(accessTokenWithNoPermission);
    expect(requestCount).toBe(1);
  });

  test("should throw if access token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "org1.room2",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);

    // Five hours later, this token should be expired and no longer be served
    // from cache...
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5 * HOURS);
    try {
      // Should throw because this mock will return the exact same (expired) token
      const $promise = expect(
        authManager.getAuthValue({
          resource: "room",
          access: "read",
          roomId: "org1.room1",
        })
      ).rejects.toThrow(
        "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
      );

      vi.useRealTimers();
      await $promise;

      // This made a new HTTP request
      expect(requestCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("should use cache when ID token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/id-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "room2",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(idToken);
    expect(authValueReq2.token.raw).toEqual(idToken);
    expect(requestCount).toBe(1);
  });

  test("should throw if ID token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/id-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      resource: "room",
      access: "read",
      roomId: "room2",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(idToken);
    expect(authValueReq2.token.raw).toEqual(idToken);
    expect(requestCount).toBe(1);

    // Five hours later, this token should be expired and no longer be served
    // from cache...
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5 * HOURS);
    try {
      // Should throw because this mock will return the exact same (expired) token
      const $promise = expect(
        authManager.getAuthValue({
          resource: "room",
          access: "read",
          roomId: "room1",
        })
      ).rejects.toThrow(
        "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
      );

      vi.useRealTimers();
      await $promise;

      // This made a new HTTP request
      expect(requestCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test.each([{ notAToken: "" }, undefined, null, ""])(
    "custom authentication with missing token in callback response should fail",
    async (response) => {
      const authManager = createAuthManager({
        authEndpoint: (_roomId) =>
          new Promise((resolve) => {
            // @ts-expect-error: testing for missing token in callback response
            resolve(response);
          }),
      });

      await expect(
        authManager.getAuthValue({
          resource: "room",
          access: "read",
          roomId: "room1",
        })
      ).rejects.toThrow(
        'Your authentication callback function should return a token, but it did not. Hint: the return value should look like: { token: "..." }'
      );
    }
  );

  test("custom authentication with missing token in callback response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: (_roomId) =>
        Promise.resolve({ error: "forbidden", reason: "Nope" }),
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow("Authentication failed: Nope");
  });

  test("custom authentication with missing token in callback response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: (_roomId) => Promise.reject(new Error("Huh?")),
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow("Huh?");
  });

  test("private authentication with 403 status should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/403",
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow(
      "Unauthorized: reason not provided in auth response (403 returned by POST /api/403)"
    );
  });

  test("private authentication with 403 status should fail with details", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/401-with-details",
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow(
      "Unauthorized: wrong key type (401 returned by POST /api/401-with-details)"
    );
  });

  test("private authentication that does not return valid JSON should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/not-json",
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow(
      'Expected a JSON response when doing a POST request on "/api/not-json". SyntaxError: Unexpected token'
    );
  });

  test("private authentication without an auth token response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/missing-token",
    });

    await expect(
      authManager.getAuthValue({
        resource: "room",
        access: "read",
        roomId: "room1",
      })
    ).rejects.toThrow(
      'Expected a JSON response of the form `{ token: "..." }` when doing a POST request on "/api/missing-token", but got {}'
    );
  });
});
