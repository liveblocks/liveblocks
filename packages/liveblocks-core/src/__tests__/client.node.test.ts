/**
 * @vitest-environment node
 */

// We're using node-fetch 2.X because 3+ only support ESM and jest is a pain to use with ESM
import { Response as NodeFetchResponse } from "node-fetch";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import type { ClientOptions } from "../client";
import { createClient } from "../client";
import * as console from "../lib/fancy-console";
import { MockWebSocket } from "./_MockWebSocketServer";
import { waitUntilStatus } from "./_waitUtils";

const token =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzMzMjgsImV4cCI6MTY5MDAzMzMzMywiayI6InNlYy1sZWdhY3kiLCJyb29tSWQiOiJlTFB3dU9tTXVUWEN6Q0dSaTVucm4iLCJhcHBJZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsImFjdG9yIjoxLCJzY29wZXMiOlsicm9vbTp3cml0ZSJdLCJpZCI6InVzZXItMyIsIm1heENvbm5lY3Rpb25zUGVyUm9vbSI6MjB9.QoRc9dJJp-C1LzmQ-S_scHfFsAZ7dBcqep0bUZNyWxEWz_VeBHBBNdJpNs7b7RYRFDBi7RxkywKJlO-gNE8h3wkhebgLQVeSgI3YfTJo7J8Jzj38TzH85ZIbybaiGcxda_sYn3VohDtUHA1k67ns08Q2orJBNr30Gc88jJmc1He_7bLStsDP4M2F1NRMuFuqLULWHnPeEM7jMvLZYkbu3SBeCH4TQGyweu7qAXvP-HHtmvzOi8LdEnpxgxGjxefdu6m4a-fJj6LwoYCGi1rlLDHH9aOHFwYVrBBBVwoeIDSHoAonkPaae9AWM6igJhNt9-ihgEH6sF-qgFiPxHNXdg";

const fetchMock = (async () =>
  Promise.resolve(
    new NodeFetchResponse(JSON.stringify({ token })) as unknown as Response
  )) as typeof fetch;

function authEndpointCallback() {
  return Promise.resolve({ token });
}

function atobPolyfillMock(data: string): string {
  return Buffer.from(data, "base64").toString();
}

function enterAndLeave(options: ClientOptions) {
  const client = createClient(options);
  const { room: _, leave } = client.enterRoom("room");

  // Entering starts asynchronous jobs in the background (timers, promises,
  // etc). Not leaving the room would leave those open handles dangling which
  // doesn't make Jest happy.
  leave();
}

describe("createClient", () => {
  test.each([
    // [publicApiKey, authEndpoint, errorMessage]
    [
      undefined,
      undefined,
      "Invalid Liveblocks client options. Please provide either a `publicApiKey` or `authEndpoint` option. They cannot both be empty. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      null,
      undefined,
      "Invalid Liveblocks client options. Please provide either a `publicApiKey` or `authEndpoint` option. They cannot both be empty. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      undefined,
      null,
      "The `authEndpoint` option must be a string or a function. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientAuthEndpoint",
    ],
    [
      "sk_xxx",
      undefined,
      "Invalid `publicApiKey` option. The value you passed is a secret key, which should not be used from the client. Please only ever pass a public key here. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey",
    ],
    [
      "pk_xxx",
      "/api/auth",
      "You cannot simultaneously use `publicApiKey` and `authEndpoint` options. Please pick one and leave the other option unspecified. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      "pk_xxx",
      authEndpointCallback,
      "You cannot simultaneously use `publicApiKey` and `authEndpoint` options. Please pick one and leave the other option unspecified. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
  ])(
    "should throw if publicApiKey & authEndpoint are misconfigured",
    (publicApiKey, authEndpoint, errorMessage) => {
      expect(() =>
        enterAndLeave({
          // @ts-expect-error: publicApiKey could be anything for a non-typescript user so we want to allow for this test
          publicApiKey,
          // @ts-expect-error: authEndpoint could be anything for a non-typescript user so we want to allow for this test
          authEndpoint,
          polyfills: {
            WebSocket: MockWebSocket,
            fetch: fetchMock,
            atob: atobPolyfillMock,
          },
        })
      ).toThrow(errorMessage);
    }
  );

  test("should not try to connect if autoConnect is false (new style)", () => {
    const authMock = vi.fn();

    const client = createClient({
      authEndpoint: authMock,
      polyfills: {
        atob: atobPolyfillMock,
      },
    });

    const { room: _, leave } = client.enterRoom("room", {
      initialPresence: {},
      autoConnect: false,
    });
    try {
      expect(authMock).not.toHaveBeenCalled();
    } finally {
      leave();
    }
  });

  test("entering twice returns the same room (new style)", () => {
    const authMock = vi.fn();

    const client = createClient({
      authEndpoint: authMock,
      polyfills: {
        atob: atobPolyfillMock,
      },
    });
    const options = { initialPresence: {}, autoConnect: false };

    const view1 = client.enterRoom("room", options);
    const view2 = client.enterRoom("room", options);

    // The returned room instance is the same one...
    expect(view1.room).toBe(view2.room);

    // Leaving once is not enough to tear down the room instance!
    view1.leave();

    // So entering it again will return the same room instance!
    const view3 = client.enterRoom("room", options);
    expect(view1.room).toBe(view3.room);

    // Only once all the leave functions are called, the room is released
    view1.leave();
    view2.leave();
    view3.leave();
    view3.leave(); // Can be called multiple times, and is a no-op

    // Meaning entering it again will create a new room instance
    const view4 = client.enterRoom("room", options);
    expect(view1.room).not.toBe(view4.room);

    // Clean things up nicely before ending the test
    view4.leave();
  });

  test("should not throw if authEndpoint is string and fetch polyfill is defined", () => {
    expect(() =>
      enterAndLeave({
        authEndpoint: "/api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: atobPolyfillMock,
        },
      })
    ).not.toThrow();
  });

  test("should not throw if public key is used and fetch polyfill is defined", () => {
    expect(() =>
      enterAndLeave({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: atobPolyfillMock,
        },
      })
    ).not.toThrow();
  });

  test("should not throw if WebSocketPolyfill is set", () => {
    expect(() => {
      enterAndLeave({
        authEndpoint: authEndpointCallback,
        polyfills: {
          WebSocket: MockWebSocket,
          atob: atobPolyfillMock,
        },
      });
    }).not.toThrow();
  });

  test("should throw if authEndpoint is string and fetch polyfill is not defined", async () => {
    const spy = vi.spyOn(console, "error");

    const client = createClient({
      authEndpoint: "/api/auth",
      polyfills: {
        WebSocket: MockWebSocket,
        atob: atobPolyfillMock,
      },
    });

    const { room, leave } = client.enterRoom("room");
    try {
      // Room will fail to connect, and move to "closed" state, basically giving up reconnecting
      await waitUntilStatus(room, "disconnected");

      expect(spy).toHaveBeenCalledWith(
        "To use Liveblocks client in a non-DOM environment with a url as auth endpoint, you need to provide a fetch polyfill."
      );
    } finally {
      // Clean things up
      leave();
    }
  });

  test("should fail to connect and stop retrying if WebSocketPolyfill is not set", async () => {
    const ws = globalThis.WebSocket;
    delete (globalThis as any).WebSocket;

    const spy = vi.spyOn(console, "error");

    const client = createClient({ authEndpoint: authEndpointCallback });
    const { room, leave } = client.enterRoom("room");
    try {
      // Room will fail to connect, and move to "closed" state, basically giving up reconnecting
      await waitUntilStatus(room, "disconnected");

      expect(spy).toHaveBeenCalledWith(
        "To use Liveblocks client in a non-DOM environment, you need to provide a WebSocket polyfill."
      );
    } finally {
      // Clean things up
      leave();
      globalThis.WebSocket = ws;
    }
  });
});

describe("createClient bounds checks", () => {
  const defaults = {
    authEndpoint: "api/auth",
    polyfills: { WebSocket: MockWebSocket, fetch: fetchMock },
  };

  test("should throw if throttle is not a number", () => {
    expect(() =>
      enterAndLeave({
        ...defaults,
        throttle: "invalid" as unknown as number, // Deliberately use wrong type at runtime
      })
    ).toThrow("throttle should be between 16 and 1000.");
  });

  test("should check bounds correctly for throttle option", () => {
    expect(() => enterAndLeave({ ...defaults, throttle: -5_000 })).toThrow(
      "throttle should be between 16 and 1000."
    );

    expect(() => enterAndLeave({ ...defaults, throttle: 0 })).toThrow(
      "throttle should be between 16 and 1000."
    );

    expect(() => enterAndLeave({ ...defaults, throttle: Math.PI })).toThrow(
      "throttle should be between 16 and 1000."
    );

    expect(() => enterAndLeave({ ...defaults, throttle: 15 })).toThrow(
      "throttle should be between 16 and 1000."
    );

    expect(() => enterAndLeave({ ...defaults, throttle: 16 })).not.toThrow();

    expect(() => enterAndLeave({ ...defaults, throttle: 1_000 })).not.toThrow();

    expect(() => enterAndLeave({ ...defaults, throttle: 1_001 })).toThrow(
      "throttle should be between 16 and 1000."
    );
  });

  test("should throw if lostConnectionTimeout is not a number", () => {
    expect(() =>
      enterAndLeave({
        ...defaults,
        lostConnectionTimeout: "invalid" as unknown as number, // Deliberately use wrong type at runtime
      })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");
  });

  test("should check bounds correctly for lostConnectionTimeout option", () => {
    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: -5_000 })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 0 })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: Math.PI })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 199 })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");

    // There is a soft cap on the lower bound of lostConnectionTimeout. We
    // recommend setting a 1_000 minimum, but the real 200 minimum only exists
    // for unit testing purposes.
    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 200 })
    ).not.toThrow();

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 1_000 })
    ).not.toThrow();

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 30_000 })
    ).not.toThrow();

    expect(() =>
      enterAndLeave({ ...defaults, lostConnectionTimeout: 30_001 })
    ).toThrow("lostConnectionTimeout should be between 1000 and 30000.");
  });

  test("should throw if backgroundKeepAliveTimeout is not a number", () => {
    expect(() =>
      enterAndLeave({
        ...defaults,
        backgroundKeepAliveTimeout: "invalid" as unknown as number, // Deliberately use wrong type at runtime
      })
    ).toThrow("backgroundKeepAliveTimeout should be at least 15000.");
  });

  test("should check bounds correctly for backgroundKeepAliveTimeout option", () => {
    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: -5_000 })
    ).toThrow("backgroundKeepAliveTimeout should be at least 15000.");

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: 0 })
    ).toThrow("backgroundKeepAliveTimeout should be at least 15000.");

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: Math.PI })
    ).toThrow("backgroundKeepAliveTimeout should be at least 15000.");

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: 14_999 })
    ).toThrow("backgroundKeepAliveTimeout should be at least 15000.");

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: 15_000 })
    ).not.toThrow();

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: 15_001 })
    ).not.toThrow();

    expect(() =>
      enterAndLeave({ ...defaults, backgroundKeepAliveTimeout: 60_000 })
    ).not.toThrow();
  });
});

describe("when env atob does not exist (atob polyfill handling)", () => {
  let nativeAtob: typeof atob | null = null;

  beforeAll(() => {
    nativeAtob = global.atob;
    (global as any).atob = undefined;
  });

  afterAll(() => {
    (global as any).atob = nativeAtob;
  });

  test("should throw error if atob polyfill is not set", () => {
    expect(() => {
      enterAndLeave({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: undefined,
        },
      });
    }).toThrow(
      "You need to polyfill atob to use the client in your environment. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"
    );
  });

  test("should not throw error if atob polyfill option is set", () => {
    expect(() => {
      enterAndLeave({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: atobPolyfillMock,
        },
      });
    }).not.toThrow();
  });
});
