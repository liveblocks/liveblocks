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

import { createAuthManager } from "../auth-manager";
import type { ParsedAuthToken } from "../protocol/AuthToken";
import { Permission } from "../protocol/Permission";

const SECONDS = 1 * 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

function makeAccessToken(perms: Record<string, string[]>) {
  const payload = {
    iat: 1664566410,
    exp: 1664570010,
    k: "acc",
    pid: "605a4fd1a36d5ea7a2e08f1",
    uid: "user1",
    perms,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${payloadB64}.signature`;
}

describe("auth-manager - public api key", () => {
  test("should return public api key", async () => {
    const authManager = createAuthManager({ publicApiKey: "pk_123" });

    const authValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
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
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValue.type).toEqual("secret");
    expect(authValue.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("should send room to the auth endpoint", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/access-auth-with-room", async ({ request }) => {
        requestCount++;
        capturedBody = await request.json();
        return HttpResponse.json({ token: accessToken });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-with-room",
    });

    await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsWrite,
      roomId: "org1.room1",
    });

    expect(capturedBody).toEqual({
      room: "org1.room1",
    });
  });

  test("should pass room to custom auth callback", async () => {
    const callback = vi.fn(() => Promise.resolve({ token: accessToken }));
    const authManager = createAuthManager({ authEndpoint: callback });

    await authManager.getAuthValue({
      requestedScope: Permission.RoomStorageRead,
      roomId: "room1",
    });

    expect(callback).toHaveBeenCalledWith("room1");
  });

  test("should deduplicate concurrent requests on same room", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const results = await Promise.all([
      authManager.getAuthValue({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "org1.room1",
      }),
      authManager.getAuthValue({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "org1.room1",
      }),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(requestCount).toBe(1);
  });

  test("should deduplicate concurrent requests on same room with different scopes", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const results = await Promise.all([
      authManager.getAuthValue({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "org1.room1",
      }),
      authManager.getAuthValue({
        requestedScope: Permission.RoomCommentsWrite,
        roomId: "org1.room1",
      }),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(requestCount).toBe(1);
  });

  test("should retry a shared same-room request when it does not grant the requested scope", async () => {
    let localRequestCount = 0;
    const accessTokenStorageRead = makeAccessToken({
      "org1*": [Permission.RoomStorageRead],
    });

    server.use(
      http.post("/api/access-auth-storage-read-then-write", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: localRequestCount === 1 ? accessTokenStorageRead : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-read-then-write",
    });

    const results = await Promise.all([
      authManager.getAuthValue({
        requestedScope: Permission.RoomStorageRead,
        roomId: "org1.room1",
      }),
      authManager.getAuthValue({
        requestedScope: Permission.RoomPresenceRead,
        roomId: "org1.room1",
      }),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(localRequestCount).toBe(2);
  });

  test("should use cache when access token has correct permissions", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room2",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("when no roomId, should use cache when access token has correct permissions", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(authValueReq2.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(requestCount).toBe(1);
  });

  test("when no roomId, should use cache when access token has correct permissions (higher level)", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("should fetch a new token when cached comments token cannot write", async () => {
    let localRequestCount = 0;
    server.use(
      http.post("/api/access-auth-comments-read-then-write", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? accessTokenWildcardCommentsRead
              : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read-then-write",
    });

    const readAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const writeAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsWrite,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(readAuthValue.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(writeAuthValue.token.raw).toEqual(accessToken);
    expect(localRequestCount).toBe(2);
  });

  test("when no roomId, should use cache when access token has no permission", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-no-permission",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessTokenWithNoPermission);
    expect(authValueReq2.token.raw).toEqual(accessTokenWithNoPermission);
    expect(requestCount).toBe(1);
  });

  test("when no roomId and no requested scope, should accept any access token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-no-permission",
    });

    const authValueReq1 = (await authManager.getAuthValue()) as {
      type: "secret";
      token: ParsedAuthToken;
    };

    const authValueReq2 = (await authManager.getAuthValue()) as {
      type: "secret";
      token: ParsedAuthToken;
    };

    expect(authValueReq1.token.raw).toEqual(accessTokenWithNoPermission);
    expect(authValueReq2.token.raw).toEqual(accessTokenWithNoPermission);
    expect(requestCount).toBe(1);
  });

  test("when no roomId and no requested scope, should reuse any cached access token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-comments-read",
    });

    const scopedAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    const roomlessAuthValue = (await authManager.getAuthValue()) as {
      type: "secret";
      token: ParsedAuthToken;
    };

    expect(scopedAuthValue.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(roomlessAuthValue.token.raw).toEqual(accessTokenWildcardCommentsRead);
    expect(requestCount).toBe(1);
  });

  test("when no roomId, should fetch a new token when cached token has no permission but write is requested", async () => {
    let localRequestCount = 0;
    const accessTokenCommentsWrite = makeAccessToken({
      "*": [Permission.RoomCommentsWrite],
    });

    server.use(
      http.post("/api/access-auth-empty-then-write", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? accessTokenWithNoPermission
              : accessTokenCommentsWrite,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-empty-then-write",
    });

    const readAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsRead,
    })) as { type: "secret"; token: ParsedAuthToken };

    const writeAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsWrite,
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(readAuthValue.token.raw).toEqual(accessTokenWithNoPermission);
    expect(writeAuthValue.token.raw).toEqual(accessTokenCommentsWrite);
    expect(localRequestCount).toBe(2);
  });

  test("should throw if access token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
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
          requestedScope: Permission.RoomPresenceRead,
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
      requestedScope: Permission.RoomPresenceRead,
      roomId: "room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
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
      requestedScope: Permission.RoomPresenceRead,
      roomId: "room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
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
          requestedScope: Permission.RoomPresenceRead,
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
          requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
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
        requestedScope: Permission.RoomPresenceRead,
        roomId: "room1",
      })
    ).rejects.toThrow(
      'Expected a JSON response of the form `{ token: "..." }` when doing a POST request on "/api/missing-token", but got {}'
    );
  });

  test.each([
    {
      endpoint: "/api/access-auth-storage-read",
      requestedScope: Permission.RoomStorageRead,
      perms: { "org1*": [Permission.RoomStorageRead] },
    },
    {
      endpoint: "/api/access-auth-feeds-read",
      requestedScope: Permission.RoomFeedsRead,
      perms: { "org1*": [Permission.RoomFeedsRead] },
    },
  ] as const)(
    "should use cache when access token only grants $requestedScope",
    async ({ endpoint, requestedScope, perms }) => {
      const accessTokenLimitedRead = makeAccessToken(perms);

      server.use(
        http.post(endpoint, () => {
          requestCount++;
          return HttpResponse.json({ token: accessTokenLimitedRead });
        })
      );

      const authManager = createAuthManager({ authEndpoint: endpoint });

      const authValue1 = (await authManager.getAuthValue({
        requestedScope,
        roomId: "org1.room1",
      })) as { type: "secret"; token: ParsedAuthToken };

      const authValue2 = (await authManager.getAuthValue({
        requestedScope,
        roomId: "org1.room2",
      })) as { type: "secret"; token: ParsedAuthToken };

      expect(authValue1.token.raw).toEqual(accessTokenLimitedRead);
      expect(authValue2.token.raw).toEqual(accessTokenLimitedRead);
      expect(requestCount).toBe(1);
    }
  );

  test("should fetch a new token when cached token only grants storage read but room entry is requested", async () => {
    let localRequestCount = 0;
    const accessTokenStorageRead = makeAccessToken({
      "org1*": [Permission.RoomStorageRead],
    });

    server.use(
      http.post("/api/access-auth-storage-then-room", () => {
        localRequestCount++;
        return HttpResponse.json({
          token: localRequestCount === 1 ? accessTokenStorageRead : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-then-room",
    });

    const storageAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomStorageRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const roomAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(storageAuthValue.token.raw).toEqual(accessTokenStorageRead);
    expect(roomAuthValue.token.raw).toEqual(accessToken);
    expect(localRequestCount).toBe(2);
  });

  test("should fetch a new token when cached write token opts out of storage", async () => {
    let localRequestCount = 0;
    const accessTokenWriteWithStorageNone = makeAccessToken({
      "org1*": [Permission.RoomWrite, Permission.RoomStorageNone],
    });

    server.use(
      http.post("/api/access-auth-storage-opt-out", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? accessTokenWriteWithStorageNone
              : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-storage-opt-out",
    });

    const roomAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const storageAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomStorageRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(roomAuthValue.token.raw).toEqual(accessTokenWriteWithStorageNone);
    expect(storageAuthValue.token.raw).toEqual(accessToken);
    expect(localRequestCount).toBe(2);
  });

  test("should let exact room permissions override wildcard permissions", async () => {
    let localRequestCount = 0;
    const accessTokenWildcardWriteWithExactStorageNone = makeAccessToken({
      "org1*": [Permission.RoomWrite],
      "org1.room1": [Permission.RoomStorageNone],
    });

    server.use(
      http.post("/api/access-auth-exact-storage-opt-out", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? accessTokenWildcardWriteWithExactStorageNone
              : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-exact-storage-opt-out",
    });

    const roomAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const storageAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomStorageRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(roomAuthValue.token.raw).toEqual(
      accessTokenWildcardWriteWithExactStorageNone
    );
    expect(storageAuthValue.token.raw).toEqual(accessToken);
    expect(localRequestCount).toBe(2);
  });

  test("should keep wildcard permissions for features that exact room permissions do not override", async () => {
    const accessTokenWildcardWriteWithExactStorageNone = makeAccessToken({
      "org1*": [Permission.RoomWrite],
      "org1.room1": [Permission.RoomStorageNone],
    });

    server.use(
      http.post("/api/access-auth-exact-storage-opt-out-comments", () => {
        requestCount++;
        return HttpResponse.json({
          token: accessTokenWildcardWriteWithExactStorageNone,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-exact-storage-opt-out-comments",
    });

    const roomAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const commentsAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomCommentsWrite,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(roomAuthValue.token.raw).toEqual(
      accessTokenWildcardWriteWithExactStorageNone
    );
    expect(commentsAuthValue.token.raw).toEqual(
      accessTokenWildcardWriteWithExactStorageNone
    );
    expect(requestCount).toBe(1);
  });

  test("should fetch a new token when cached write token opts out of feeds", async () => {
    let localRequestCount = 0;
    const accessTokenWriteWithFeedsNone = makeAccessToken({
      "org1*": [Permission.RoomWrite, Permission.RoomFeedsNone],
    });

    server.use(
      http.post("/api/access-auth-feeds-opt-out", () => {
        localRequestCount++;
        return HttpResponse.json({
          token:
            localRequestCount === 1
              ? accessTokenWriteWithFeedsNone
              : accessToken,
        });
      })
    );

    const authManager = createAuthManager({
      authEndpoint: "/api/access-auth-feeds-opt-out",
    });

    const roomAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomPresenceRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    const feedsAuthValue = (await authManager.getAuthValue({
      requestedScope: Permission.RoomFeedsRead,
      roomId: "org1.room1",
    })) as { type: "secret"; token: ParsedAuthToken };

    expect(roomAuthValue.token.raw).toEqual(accessTokenWriteWithFeedsNone);
    expect(feedsAuthValue.token.raw).toEqual(accessToken);
    expect(localRequestCount).toBe(2);
  });
});
