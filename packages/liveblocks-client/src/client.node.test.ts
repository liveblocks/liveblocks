/**
 * @jest-environment node
 */

// We're using node-fetch 2.X because 3+ only support ESM and jest is a pain to use with ESM
import { Response } from "node-fetch";

import { MockWebSocket } from "../test/utils";
import { createClient } from ".";
import type { ClientOptions } from "./types";

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2Nywicm9vbUlkIjoiazV3bWgwRjlVTGxyek1nWnRTMlpfIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJhY3RvciI6MCwic2NvcGVzIjpbIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIiwicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.IQFyw54-b4F6P0MTSzmBVwdZi2pwPaxZwzgkE2l0Mi4";

const fetchMock = (async () =>
  new Response(JSON.stringify({ token }))) as unknown as typeof fetch;

async function authEndpointCallback() {
  return {
    token,
  };
}

function atobPolyfillMock(data: string): string {
  return Buffer.from(data, "base64").toString();
}

function createClientAndEnter(options: ClientOptions) {
  const client = createClient(options);
  client.enter("room");
}

describe("createClient", () => {
  test("should not throw if authEndpoint is string and fetch polyfill is defined", () => {
    expect(() =>
      createClientAndEnter({
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
      createClientAndEnter({
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
      createClientAndEnter({
        authEndpoint: authEndpointCallback,
        polyfills: {
          WebSocket: MockWebSocket,
          atob: atobPolyfillMock,
        },
      });
    }).not.toThrow();
  });

  test("should throw if authEndpoint is string and fetch polyfill is not defined", () => {
    expect(() =>
      createClientAndEnter({
        authEndpoint: "/api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          atob: atobPolyfillMock,
        },
      })
    ).toThrow(
      "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
    );
  });

  test("should throw if public key is used and fetch polyfill is not defined", () => {
    expect(() =>
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
        },
      })
    ).toThrow(
      "To use Liveblocks client in a non-dom environment with a publicApiKey, you need to provide a fetch polyfill."
    );
  });

  test("should throw if WebSocketPolyfill is not set", () => {
    expect(() =>
      createClientAndEnter({
        authEndpoint: authEndpointCallback,
      })
    ).toThrowError(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );
  });

  test("should throw if throttle is not a number", () => {
    expect(() =>
      createClientAndEnter({
        throttle: "invalid" as unknown as number, // Deliberately use wrong type at runtime
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });

  test("should throw if throttle is less than 80", () => {
    expect(() =>
      createClientAndEnter({
        throttle: 79,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });

  test("should throw if throttle is more than 1000", () => {
    expect(() =>
      createClientAndEnter({
        throttle: 1001,
        authEndpoint: "api/auth",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });

  test("should throw if publicApiKey and authEndpoint are undefined", () => {
    expect(() =>
      createClientAndEnter({
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
        },
      } as ClientOptions)
    ).toThrowError(
      "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
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
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: undefined,
        },
      } as ClientOptions);
    }).toThrowError(
      "You need to polyfill atob to use the client in your environment. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"
    );
  });

  test("should not throw error if atob polyfill option is set", () => {
    expect(() => {
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket,
          fetch: fetchMock,
          atob: atobPolyfillMock,
        },
      } as ClientOptions);
    }).not.toThrow();
  });
});
