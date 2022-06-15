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
  test.each([
    // [publicApiKey, authEndpoint, errorMessage]
    [
      undefined,
      undefined,
      "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      null,
      undefined,
      "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      undefined,
      null,
      "authEndpoint must be a string or a function. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientAuthEndpoint",
    ],
    [
      "sk_xxx",
      undefined,
      "Invalid key. You are using the secret key which is not supported. Please use the public key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey",
    ],
    [
      "pk_xxx",
      "/api/auth",
      "You cannot use both publicApiKey and authEndpoint. Please use either publicApiKey or authEndpoint, but not both. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
    [
      "pk_xxx",
      authEndpointCallback,
      "You cannot use both publicApiKey and authEndpoint. Please use either publicApiKey or authEndpoint, but not both. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient",
    ],
  ])(
    "should throw if publicApiKey & authEndpoint are misconfigured",
    (publicApiKey, authEndpoint, errorMessage) => {
      expect(() =>
        createClientAndEnter({
          // @ts-expect-error: publicApiKey could be anything for a non-typescript user so we want to allow for this test
          publicApiKey,
          // @ts-expect-error: authEndpoint could be anything for a non-typescript user so we want to allow for this test
          authEndpoint,
          WebSocketPolyfill: MockWebSocket,
          fetchPolyfill: fetchMock,
          atobPolyfill: atobPolyfillMock,
        })
      ).toThrowError(errorMessage);
    }
  );

  test("should not throw if authEndpoint is string and fetch polyfill is defined", () => {
    expect(() =>
      createClientAndEnter({
        authEndpoint: "/api/auth",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
        atobPolyfill: atobPolyfillMock,
      })
    ).not.toThrow();
  });

  test("should not throw if public key is used and fetch polyfill is defined", () => {
    expect(() =>
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
        atobPolyfill: atobPolyfillMock,
      })
    ).not.toThrow();
  });

  test("should not throw if WebSocketPolyfill is set", () => {
    expect(() => {
      createClientAndEnter({
        authEndpoint: authEndpointCallback,
        WebSocketPolyfill: MockWebSocket,
        atobPolyfill: atobPolyfillMock,
      });
    }).not.toThrow();
  });

  test("should throw if authEndpoint is string and fetch polyfill is not defined", () => {
    expect(() =>
      createClientAndEnter({
        authEndpoint: "/api/auth",
        WebSocketPolyfill: MockWebSocket,
        atobPolyfill: atobPolyfillMock,
      })
    ).toThrow(
      "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
    );
  });

  test("should throw if public key is used and fetch polyfill is not defined", () => {
    expect(() =>
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: MockWebSocket,
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
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });

  test("should throw if throttle is less than 80", () => {
    expect(() =>
      createClientAndEnter({
        throttle: 79,
        authEndpoint: "api/auth",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });

  test("should throw if throttle is more than 1000", () => {
    expect(() =>
      createClientAndEnter({
        throttle: 1001,
        authEndpoint: "api/auth",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
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
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
        atobPolyfill: undefined,
      } as ClientOptions);
    }).toThrowError(
      "You need to polyfill atob to use the client in your environment. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"
    );
  });

  test("should not throw error if atob polyfill option is set", () => {
    expect(() => {
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
        atobPolyfill: atobPolyfillMock,
      } as ClientOptions);
    }).not.toThrow();
  });
});
