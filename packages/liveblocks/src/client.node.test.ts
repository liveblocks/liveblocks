/**
 * @jest-environment node
 */

import { createClient } from ".";
// We're using node-fetch 2.X because 3+ only support ESM and jest is a pain to use with ESM
import fetch from "node-fetch";
import WebSocket from "ws";

async function authEndpointCallback(room: string) {
  return {
    token: "",
  };
}

describe("createClient", () => {
  test("should not throw if authEndpoint is string and fetch polyfill is defined", () => {
    expect(() =>
      createClient({
        authEndpoint: "/api/auth",
        WebSocketPolyfill: WebSocket,
        fetchPolyfill: fetch,
      })
    ).not.toThrow();
  });

  test("should not throw if public key is used and fetch polyfill is defined", () => {
    expect(() =>
      createClient({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: WebSocket,
        fetchPolyfill: fetch,
      })
    ).not.toThrow();
  });

  test("should not throw if WebSocketPolyfill is set", () => {
    expect(() =>
      createClient({
        authEndpoint: authEndpointCallback,
        WebSocketPolyfill: WebSocket,
      })
    ).not.toThrow();
  });

  test("should throw if authEndpoint is string and fetch polyfill is not defined", () => {
    expect(() =>
      createClient({
        authEndpoint: "/api/auth",
        WebSocketPolyfill: WebSocket,
      })
    ).toThrow(
      "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
    );
  });

  test("should throw if public key is used and fetch polyfill is not defined", () => {
    expect(() =>
      createClient({
        publicApiKey: "pk_xxx",
        WebSocketPolyfill: WebSocket,
      })
    ).toThrow(
      "To use Liveblocks client in a non-dom environment with a publicApiKey, you need to provide a fetch polyfill."
    );
  });

  test("should throw if WebSocketPolyfill is not set", () => {
    expect(() =>
      createClient({
        authEndpoint: authEndpointCallback,
      })
    ).toThrowError(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );
  });

  test("should throw if throttle is not a number", () => {
    expect(() =>
      createClient({
        throttle: "invalid" as any,
        authEndpoint: "api/auth",
      })
    ).toThrowError("throttle should be a number between 80 and 1000.");
  });
});
