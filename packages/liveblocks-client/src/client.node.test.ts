/**
 * @jest-environment node
 */

// We're using node-fetch 2.X because 3+ only support ESM and jest is a pain to use with ESM
import { Response } from "node-fetch";

import { MockWebSocket } from "../test/utils";
import { createClient } from ".";
import type { ClientOptions } from "./types";

(global as any).atob = (data: string) => Buffer.from(data, "base64");

const token =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb29tSWQiOiJrNXdtaDBGOVVMbHJ6TWdadFMyWl8iLCJhcHBJZCI6IjYwNWE0ZmQzMWEzNmQ1ZWE3YTJlMDkxNCIsImFjdG9yIjowLCJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2N30.AinBUN1gzA1-QdwrQ3cT1X4tNM_7XYCkKgHH94M5wszX-1AEDIgsBdM_7qN9cv0Y7SDFTUVGYLinHgpBonE8tYiNTe4uSpVUmmoEWuYLgsdUccHj5IJYlxPDGb1mgesSNKdeyfkFnu8nFjramLQXBa5aBb5Xq721m4Lgy2dtL_nFicavhpyCsdTVLSjloCDlQpQ99UPY--3ODNbbznHGYu8IyI1DnqQgDPlbAbFPRF6CBZiaUZjSFTRGnVVPE0VN3NunKHimMagBfHrl4AMmxG4kFN8ImK1_7oXC_br1cqoyyBTs5_5_XeA9MTLwbNDX8YBPtjKP1z2qTDpEc22Oxw";

async function fetchMock() {
  return new Response(JSON.stringify({ token }));
}

async function authEndpointCallback() {
  return {
    token,
  };
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
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      })
    ).not.toThrow();
  });

  test("should not throw if public key is used and fetch polyfill is defined", () => {
    expect(() =>
      createClientAndEnter({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      })
    ).not.toThrow();
  });

  test("should not throw if WebSocketPolyfill is set", () => {
    expect(() => {
      createClientAndEnter({
        authEndpoint: authEndpointCallback,
        WebSocketPolyfill: MockWebSocket,
      });
    }).not.toThrow();
  });

  test("should throw if authEndpoint is string and fetch polyfill is not defined", () => {
    expect(() =>
      createClientAndEnter({
        authEndpoint: "/api/auth",
        WebSocketPolyfill: MockWebSocket,
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
        throttle: "invalid" as any,
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

  test("should throw if publicApiKey and authEndpoint are undefined", () => {
    expect(() =>
      createClientAndEnter({
        WebSocketPolyfill: MockWebSocket,
        fetchPolyfill: fetchMock,
      } as ClientOptions)
    ).toThrowError(
      "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
    );
  });
});
