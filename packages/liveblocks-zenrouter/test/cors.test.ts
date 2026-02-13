import { describe, expect, test } from "vitest";

import type { CorsOptions } from "~/cors.js";
import { getCorsHeaders } from "~/cors.js";

import { disableConsole } from "./utils.js";

const url = "https://example.org";
const TEST_ORIGIN = "https://my-example-app.org";

function configureCors(options: Partial<CorsOptions> = {}) {
  return (req: Request) => {
    return Object.fromEntries(getCorsHeaders(req, options) ?? []);
  };
}

/** Builds a "normal" (non-preflight) request, from TEST_ORIGIN */
function makeNormalRequest(method: string, headers: Record<string, string>) {
  return new Request(url, {
    method,
    headers: {
      Origin: TEST_ORIGIN,
      ...headers,
    },
  });
}

/** Builds a preflight request, from TEST_ORIGIN */
function makePreflightRequest(forMethod: string) {
  return new Request(url, {
    method: "OPTIONS",
    headers: {
      Origin: TEST_ORIGIN,
      "Access-Control-Request-Method": forMethod,
      "Access-Control-Request-Headers":
        "CoNtEnT-tYpE,X-Foo,Custom-Header,Accept",
    },
  });
}

describe("Basic CORS responses", () => {
  test("default config", () => {
    const cors = configureCors(/* default */);

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      vary: "Origin",
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "Origin",
    });
  });

  test("only allow whitelisted headers", () => {
    const cors = configureCors({
      allowedHeaders: ["x-foo", "accept"],
    });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "x-foo, accept",
      vary: "Origin",
    });
  });

  test("with max age", () => {
    const cors = configureCors({ maxAge: 600 });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      "access-control-max-age": "600",
      vary: "Origin",
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "Origin",
    });
  });

  test("with expose headers", () => {
    const cors = configureCors({
      exposeHeaders: ["Content-Encoding", "X-Custom"],
    });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      "access-control-expose-headers": "Content-Encoding, X-Custom",
      vary: "Origin",
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-expose-headers": "Content-Encoding, X-Custom",
      vary: "Origin",
    });
  });

  test("with fixed origins", () => {
    const cors = configureCors({
      allowedOrigins: [TEST_ORIGIN, "https://another-origin.org"],
    });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      vary: "Origin",
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "Origin",
    });
  });

  test.each([false, true])(
    "with rejected origin, sendWildcard %",
    (sendWildcard) => {
      const cors = configureCors({
        allowedOrigins: [
          "https://another-origin.org",
          "https://yet-another-origin.org",
        ],
        sendWildcard,
      });

      const preq = makePreflightRequest("PUT");
      expect(cors(preq)).toEqual({
        // NOTE: No CORS headers will be sent for this request!
      });

      const req = makeNormalRequest("POST", {});
      expect(cors(req)).toEqual({
        // NOTE: No CORS headers will be sent for this request!
      });
    }
  );

  test("sending wildcard", () => {
    const cors = configureCors({ sendWildcard: true });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      // NOTE: No Vary header!
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": "*",
      // NOTE: No Vary header!
    });
  });

  test("sends CORS headers, even for non-CORS requests (default)", () => {
    disableConsole();

    const cors = configureCors({
      // These are the defaults
      // allowedOrigins: "*",
      // alwaysSend: true,
      // supportsCredentials: false,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual({ "access-control-allow-origin": "*" });
    expect(cors(req1)).toEqual({ "access-control-allow-origin": "*" });
    expect(cors(req2)).toEqual({ "access-control-allow-origin": "*" });
  });

  test("sends CORS headers, even for non-CORS requests (except when credentials)", () => {
    const cors = configureCors({
      // These are the defaults
      // allowedOrigins: "*",
      // alwaysSend: true,
      allowCredentials: true,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual(/* no CORS here! */ {});
    expect(cors(req1)).toEqual(/* no CORS here! */ {});
    expect(cors(req2)).toEqual(/* no CORS here! */ {});
  });

  test("sends CORS headers, even for non-CORS requests (except when credentials, except when fixed)", () => {
    disableConsole();

    const cors = configureCors({
      // These are the defaults
      allowedOrigins: ["https://fixed.org", "https://dev.fixed.org"],
      // alwaysSend: true,
      allowCredentials: true,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual({
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": "https://fixed.org", // Only the first one will be returned
      vary: "Origin",
    });
    expect(cors(req1)).toEqual({
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": "https://fixed.org", // Only the first one will be returned
      vary: "Origin",
    });
    expect(cors(req2)).toEqual({
      "access-control-allow-credentials": "true",
      "access-control-allow-origin": "https://fixed.org", // Only the first one will be returned
      vary: "Origin",
    });
  });

  test("won’t send CORS headers, if alwaysSend = false (not the default), fixed", () => {
    const cors = configureCors({
      // These are the defaults
      allowedOrigins: ["https://fixed.org", "https://dev.fixed.org"],
      alwaysSend: false,
      allowCredentials: true,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual(/* no CORS */ {});
    expect(cors(req1)).toEqual(/* no CORS */ {});
    expect(cors(req2)).toEqual(/* no CORS */ {});
  });

  test("won’t send CORS headers, if alwaysSend = false (not the default), wildcard", () => {
    const cors = configureCors({
      // These are the defaults
      // allowedOrigins: '*',
      alwaysSend: false,
      allowCredentials: true,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual(/* no CORS */ {});
    expect(cors(req1)).toEqual(/* no CORS */ {});
    expect(cors(req2)).toEqual(/* no CORS */ {});
  });

  test("won’t send CORS headers, if alwaysSend = false (not the default), wildcard, no credentials", () => {
    const cors = configureCors({
      // These are the defaults
      // allowedOrigins: '*',
      alwaysSend: false,
      // supportsCredentials: false,
    });

    // Make requests without an Origin header
    const preq = new Request(url, { method: "OPTIONS" });
    const req1 = new Request(url, { method: "GET" });
    const req2 = new Request(url, { method: "POST" });

    expect(cors(preq)).toEqual(/* no CORS */ {});
    expect(cors(req1)).toEqual(/* no CORS */ {});
    expect(cors(req2)).toEqual(/* no CORS */ {});
  });

  test("without Vary header", () => {
    const cors = configureCors({ varyHeader: false });

    const preq = makePreflightRequest("PUT");
    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-foo, custom-header, accept",
      // No Vary header
    });

    const req = makeNormalRequest("POST", {});
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      // No Vary header
    });
  });
});

describe("Invalid CORS configurations", () => {
  test("allowing wildcard + allowing credentials is not allowed by the spec", () => {
    const cors = configureCors({
      allowCredentials: true,
      sendWildcard: true,
    });

    const preq = makePreflightRequest("PUT");
    expect(() => cors(preq)).toThrow("Invalid CORS configuration");

    const req = makeNormalRequest("POST", {});
    expect(() => cors(req)).toThrow("Invalid CORS configuration");
  });
});

describe("Non-standard, Liveblocks-specific, CORS responses", () => {
  test("Custom X-Relay-Origin header", () => {
    const cors = configureCors(/* default */);

    const preq = new Request(url, {
      method: "OPTIONS",
      headers: {
        // NOTE: Non-standard X-Relay-Origin header works as Origin
        "X-Relay-Origin": TEST_ORIGIN,
        "Access-Control-Request-Method": "OPTIONS",
        "Access-Control-Request-Headers": "x-foo", // Must be lower-cased, without spaces
      },
    });

    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "x-foo",
      vary: "Origin",
    });

    const req = new Request(url, {
      method: "POST",
      headers: {
        // NOTE: Non-standard X-Relay-Origin header works as Origin
        "X-Relay-Origin": TEST_ORIGIN,
      },
    });
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "Origin",
    });
  });

  test("Origin takes precedence over Custom X-Relay-Origin header when both are used", () => {
    const cors = configureCors(/* default */);

    const preq = new Request(url, {
      method: "OPTIONS",
      headers: {
        // NOTE: Non-standard X-Relay-Origin header works as Origin
        "X-Relay-Origin": "https://my-custom-app.org",
        Origin: TEST_ORIGIN,
        "Access-Control-Request-Method": "OPTIONS",
        "Access-Control-Request-Headers": "X-Foo,Custom-Header", // Must be lower-cased, without spaces
      },
    });

    expect(cors(preq)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "x-foo, custom-header",
      vary: "Origin",
    });

    const req = new Request(url, {
      method: "POST",
      headers: {
        // NOTE: Non-standard X-Relay-Origin header works as Origin
        Origin: TEST_ORIGIN,
        "X-Relay-Origin": "https://my-custom-app.org",
      },
    });
    expect(cors(req)).toEqual({
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "Origin",
    });
  });
});
