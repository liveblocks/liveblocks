/**
 * @jest-environment node
 */

// We're using node-fetch 2.X because 3+ only support ESM and jest is a pain to use with ESM
import { Response as NodeFetchResponse } from "node-fetch";

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
  client.enter("room", { initialPresence: {} });

  // Entering starts asynchronous jobs in the background (timers, promises,
  // etc). Not leaving the room would leave those open handles dangling which
  // doesn't make Jest happy.
  client.leave("room");
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

  test("should not try to connect if withoutInitiallyConnecting is false", () => {
    const authMock = jest.fn();

    const client = createClient({
      authEndpoint: authMock,
      polyfills: {
        atob: atobPolyfillMock,
      },
    });

    client.enter("room", {
      initialPresence: {},
      shouldInitiallyConnect: false,
    });

    expect(authMock).not.toHaveBeenCalled();
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
    const spy = jest.spyOn(console, "error");

    const client = createClient({
      authEndpoint: "/api/auth",
      polyfills: {
        WebSocket: MockWebSocket,
        atob: atobPolyfillMock,
      },
    });
    const room = client.enter("room", { initialPresence: {} });

    // Room will fail to connect, and move to "closed" state, basically giving up reconnecting
    await waitUntilStatus(room, "disconnected");

    expect(spy).toHaveBeenCalledWith(
      "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
    );

    // Clean things up
    client.leave("room");
  });

  test("should fail to connect and stop retrying if WebSocketPolyfill is not set", async () => {
    const spy = jest.spyOn(console, "error");

    const client = createClient({ authEndpoint: authEndpointCallback });
    const room = client.enter("room", { initialPresence: {} });

    // Room will fail to connect, and move to "closed" state, basically giving up reconnecting
    await waitUntilStatus(room, "disconnected");

    expect(spy).toHaveBeenCalledWith(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );

    // Clean things up
    client.leave("room");
  });

  test("should throw if throttle is not a number", () => {
    expect(() =>
      enterAndLeave({
        throttle: "invalid" as unknown as number, // Deliberately use wrong type at runtime
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow("throttle should be a number between 16 and 1000.");
  });

  test("should throw if throttle is less than 16", () => {
    expect(() =>
      enterAndLeave({
        throttle: 15,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow("throttle should be a number between 16 and 1000.");
  });

  test("should throw if throttle is more than 1000", () => {
    expect(() =>
      enterAndLeave({
        throttle: 1001,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow("throttle should be a number between 16 and 1000.");
  });

  test("should throw if lostConnectionTimeout is not a number", () => {
    expect(() =>
      enterAndLeave({
        lostConnectionTimeout: "invalid" as unknown as number, // Deliberately use wrong type at runtime
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow(
      "lostConnectionTimeout should be a number between 1000 and 30000."
    );
  });

  test("should throw if lostConnectionTimeout is less than 1000", () => {
    expect(() =>
      enterAndLeave({
        lostConnectionTimeout: 15,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow(
      "lostConnectionTimeout should be a number between 1000 and 30000."
    );
  });

  test("should throw if lostConnectionTimeout is more than 30000", () => {
    expect(() =>
      enterAndLeave({
        lostConnectionTimeout: 30001,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrow(
      "lostConnectionTimeout should be a number between 1000 and 30000."
    );
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
