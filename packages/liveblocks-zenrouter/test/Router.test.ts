import type { Json } from "@liveblocks/core";
import {
  json as jsonDecoder,
  number,
  numeric,
  object,
  optional,
} from "decoders";
import { nanoid } from "nanoid";
import { beforeEach, describe, expect, test } from "vitest";

import { ErrorHandler } from "~/ErrorHandler.js";
import { abort, empty, HttpError, json, ZenRouter } from "~/index.js";
import {
  captureConsole,
  disableConsole,
  expectEmptyResponse,
  expectResponse,
  fail,
} from "~test/utils.js";

// Extend Response to be able to generate 101 responses. This is
// what the Cloudflare workers platform support, but you cannot
// construct such a Response in Node.
class WebSocketResponse extends Response {
  constructor(headers?: Record<string, string>) {
    super(null, { headers });
  }
  get status() {
    return 101;
  }
  get statusText() {
    return "Switching Protocols";
  }
}

const IGNORE_AUTH_FOR_THIS_TEST = () => Promise.resolve(true);
const TEST_ORIGIN = "https://example-origin.org";
const ANOTHER_ORIGIN = "https://another-origin.org";

/**
 * Generates the simplest router you can think of.
 */
function simplestRouter() {
  return new ZenRouter({ authorize: IGNORE_AUTH_FOR_THIS_TEST });
}

describe("starting from scratch gives guided experience", () => {
  test("take 0", () => {
    const r = new ZenRouter();
    expect(() => r.fetch).toThrow("No routes configured yet. Try adding one?");
  });

  test("take 1", () => {
    const r = new ZenRouter();
    expect(() =>
      // @ts-expect-error deliberate type error
      r.route("/", fail)
    ).toThrow('Invalid route pattern: "/". Did you mean "GET /"?');
  });
});

describe("Router setup errors", () => {
  test("default context is null when not specified", async () => {
    const r = simplestRouter();
    r.route("GET /", ({ ctx }) => json({ ctx } as any));

    const req = new Request("http://example.org/");
    const resp = await r.fetch(req);
    await expectResponse(resp, { ctx: null });
  });

  test("unless you specifically define how to authorize, the default router will reject all requests", async () => {
    const konsole = captureConsole();

    const r = new ZenRouter();
    r.route("GET /", ({ ctx }) => json({ ctx } as any));

    const req = new Request("http://example.org/");
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Forbidden" }, 403);

    expect(konsole.error).toHaveBeenCalledWith(
      "This request was not checked for authorization. Please configure a generic `authorize` function in the ZenRouter constructor."
    );
  });

  test("fails for patterns without method", () => {
    const r = simplestRouter();
    // @ts-expect-error Not starting with an HTTP method
    expect(() => r.route("i am not valid", fail)).toThrow(
      'Invalid route pattern: "i am not valid"'
    );
  });

  test("fails for patterns without method", () => {
    const r = simplestRouter();
    // @ts-expect-error Not starting with an HTTP method
    expect(() => r.route("/foo", fail)).toThrow(
      'Invalid route pattern: "/foo". Did you mean "GET /foo"?'
    );
  });

  test("fails for patterns with invalid method", () => {
    const r = simplestRouter();
    // @ts-expect-error Not starting with a valid HTTP method
    expect(() => r.route("GRAB /foo", fail)).toThrow(
      'Invalid route pattern: "GRAB /foo"'
    );
  });

  test("fails with duplicate placeholder", () => {
    const r = simplestRouter();
    expect(() => r.route("GET /foo/<x>/<x>", fail)).toThrow(
      "Duplicate capture group name"
    );
  });

  test("fails with placeholder names that aren’t valid JS names", () => {
    const r = simplestRouter();
    expect(() => r.route("GET /foo/<x/y>", fail)).toThrow(
      "Invalid pattern: /foo/<x/y> (error at position 6)"
    );
  });
});

describe("Basic Router", () => {
  const r = new ZenRouter({
    errorHandler: new ErrorHandler(),
    authorize: IGNORE_AUTH_FOR_THIS_TEST,
    getContext: () => null,
    params: {
      x: numeric,
      y: numeric,
    },
  });

  r.onUncaughtError(() =>
    json(
      { error: "Internal server error", details: "Please try again later" },
      500
    )
  );

  r.route("GET /ping", () => json({ data: "pong" }));
  r.route("GET /echo/<name>", ({ p }) => json({ name: p.name }));
  r.route("GET /concat/<a>/<b>", ({ p }) => json({ result: `${p.a}${p.b}` }));
  r.route("GET /add/<x>/<y>", ({ p }) => json({ result: p.x + p.y, p }));
  r.route("GET /custom-error", () => {
    throw new Response("I'm a custom response", { status: 499 });
  });
  r.route("GET /custom-http-error", () => {
    throw new HttpError(488, "Custom Error");
  });
  r.route("GET /broken", () => {
    throw new Error("Random error");
  });
  r.route("GET /echo-query", ({ q }) => json({ q }));
  r.route("GET /empty", () => empty());
  r.route("POST /empty", optional(object({ a: number })), () => ({ ok: true }));

  r.route("GET /test", fail);
  r.route("POST /test", fail);
  r.route("PATCH /test", fail);
  r.route("PUT /test", fail);
  r.route("DELETE /test", fail);

  test("without placeholders", async () => {
    const req = new Request("http://example.org/ping");
    expect(await (await r.fetch(req)).json()).toEqual({
      data: "pong",
    });
  });

  test("one placeholder", async () => {
    const req1 = new Request("http://example.org/echo/foo");
    expect(await (await r.fetch(req1)).json()).toEqual({
      name: "foo",
    });

    const req2 = new Request("http://example.org/echo/bar");
    expect(await (await r.fetch(req2)).json()).toEqual({
      name: "bar",
    });
  });

  test("test paths with multiple dynamic placeholders", async () => {
    const req1 = new Request("http://example.org/concat/foo/bar");
    expect(await (await r.fetch(req1)).json()).toEqual({
      result: "foobar",
    });

    const req2 = new Request("http://example.org/concat/bar/foo");
    expect(await (await r.fetch(req2)).json()).toEqual({
      result: "barfoo",
    });
  });

  test("placeholders are automatically decoded", async () => {
    const req1 = new Request("http://example.org/echo/foo%2Fbar%2Fqux");
    expect(await (await r.fetch(req1)).json()).toEqual({
      name: "foo/bar/qux",
    });

    const req2 = new Request("http://example.org/echo/foo%2F😂");
    expect(await (await r.fetch(req2)).json()).toEqual({
      name: "foo/😂",
    });
  });

  test("placeholders are automatically decoded + validated", async () => {
    const req = new Request("http://example.org/add/1337/42");
    expect(await (await r.fetch(req)).json()).toEqual({
      result: 1379,
      p: { x: 1337, y: 42 },
    });
  });

  test("placeholders that cannot be URI decoded will throw a 400 error", async () => {
    const req = new Request("http://example.org/echo/foo%2Xbar%2Xqux");
    //                                                  ^^^   ^^^ Malformed URL
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Bad Request" }, 400);
  });

  test("placeholders that cannot be decoded/transformed will throw a 400 error", async () => {
    const req = new Request("http://example.org/add/1/one");
    //                                                ^^^ Not a valid number
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Bad Request" }, 400);
  });

  test("non-matching paths will return 404", async () => {
    const req = new Request("http://example.org/i/don't/exist");
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Not Found" }, 404);
  });

  test("matching paths but non-matching methods will return 405", async () => {
    const req = new Request("http://example.org/echo/bar", { method: "POST" });
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Method Not Allowed" }, 405);
    expect(resp.headers.get("Allow")).toEqual("GET, OPTIONS");
  });

  test("accessing the query string", async () => {
    const req = new Request(
      "http://example.org/echo-query?a=1&b=2&c=3&c=4&d[]=d1&d[]=d2&x="
    );
    const resp = await r.fetch(req);
    await expectResponse(resp, {
      q: { a: "1", b: "2", c: "4", "d[]": "d2", x: "" },
    });
  });

  test("can accept empty bodies", async () => {
    {
      const req = new Request("http://example.org/empty", {
        method: "POST",
        body: "nah-ah", // Invalid body ← 🔑
      });
      await expectResponse(await r.fetch(req), { error: "Bad Request" }, 400);
    }

    {
      const req = new Request("http://example.org/empty", {
        method: "POST",
        body: '{"a": 123}', // Valid body
      });
      await expectResponse(await r.fetch(req), { ok: true });
    }

    {
      const req = new Request("http://example.org/empty", {
        method: "POST",
        // No body here ← 🔑
      });
      await expectResponse(await r.fetch(req), { ok: true });
    }
  });

  test("return empty response", async () => {
    const req = new Request("http://example.org/empty");
    const resp = await r.fetch(req);
    expectEmptyResponse(resp);
  });

  test("return custom response", async () => {
    const req = new Request("http://example.org/custom-error");
    const resp = await r.fetch(req);
    await expectResponse(resp, "I'm a custom response", 499);
  });

  test("broken endpoint returns 500", async () => {
    const req = new Request("http://example.org/broken");
    const resp = await r.fetch(req);
    await expectResponse(
      resp,
      {
        error: "Internal server error",
        details: "Please try again later",
      },
      500
    );
  });

  test("custom status error handling", async () => {
    const req = new Request("http://example.org/custom-http-error");
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Custom Error" }, 488);
  });
});

describe("Router authentication", () => {
  test("Authorized when returning truthy value", async () => {
    const r = new ZenRouter({
      authorize: ({ req }) => {
        return req.headers.get("Authorization") === "v3ry-s3cr3t!";
      },
    });

    r.route("GET /", () => json({ ok: true }));

    const req1 = new Request("http://example.org/");
    await expectResponse(await r.fetch(req1), { error: "Forbidden" }, 403);

    const req2 = new Request("http://example.org/", {
      headers: { Authorization: "v3ry-s3cr3t!" },
    });
    await expectResponse(await r.fetch(req2), { ok: true });
  });

  test("Returning parsed auth data", async () => {
    const r = new ZenRouter({
      authorize: ({ req }) => {
        const header = req.headers.get("Authorization");
        if (!header?.startsWith("v3ry-s3cr3t!")) {
          return false;
        }

        return { userId: header.substring("v3ry-s3cr3t!".length).trim() };
      },
    });

    r.route("GET /", ({ auth }) => json({ auth }));

    const req1 = new Request("http://example.org/");
    await expectResponse(await r.fetch(req1), { error: "Forbidden" }, 403);

    const req2 = new Request("http://example.org/", {
      headers: { Authorization: "v3ry-s3cr3t! user-123" },
    });
    await expectResponse(await r.fetch(req2), { auth: { userId: "user-123" } });

    const req3 = new Request("http://example.org/", {
      headers: { Authorization: "v3ry-s3cr3t! user-456" },
    });
    await expectResponse(await r.fetch(req3), { auth: { userId: "user-456" } });
  });
});

describe("Router body validation", () => {
  const r = new ZenRouter({ authorize: IGNORE_AUTH_FOR_THIS_TEST });

  r.route(
    "POST /add",
    object({ x: number, y: number }),

    ({ body }) => ({ result: body.x + body.y })
  );

  // r.registerErrorHandler(ValidationError, (e) => json({ crap: true }, 422));
  // r.registerErrorHandler(422, () => json({ crap: true }, 422));

  test("accepts correct body", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: '{"x":41,"y":1}',
    });
    await expectResponse(await r.fetch(req), { result: 42 });
  });

  test("rejects invalid body", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: '{"x":41,"y":"not a number"}',
    });
    await expectResponse(
      await r.fetch(req),
      {
        error: "Unprocessable Entity",
        reason: "Value at key 'y': Must be number",
      },
      422
    );
  });

  test("broken JSON bodies lead to 400", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: "I'm no JSON",
    });
    await expectResponse(await r.fetch(req), { error: "Bad Request" }, 400);
  });

  test("accessing body without defining a decoder is an error", async () => {
    const konsole = captureConsole();

    const r = new ZenRouter({ authorize: IGNORE_AUTH_FOR_THIS_TEST });

    r.route("POST /", (input) => {
      // Simply accessing the `body` without defining a decoder should fail
      input.body;
      return { ok: true };
    });

    const req = new Request("http://example.org/", { method: "POST" });
    await expectResponse(
      await r.fetch(req),
      { error: "Internal Server Error" },
      500
    );

    expect(konsole.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Uncaught error: Error: Cannot access body: this endpoint did not define a body decoder/
      )
    );
  });
});

function createMiniDbRouter(options: { cors: boolean }) {
  const r = new ZenRouter({ authorize: IGNORE_AUTH_FOR_THIS_TEST, ...options });

  // Simulate a mini DB
  const db = new Map<string, Json>();
  beforeEach(() => db.clear());

  // Implement standard REST methods
  r.route("GET /thing/<key>", ({ p }) => {
    const { key } = p;
    const value = db.get(p.key);
    return value !== undefined ? { key, value } : abort(404);
  });
  r.route("POST /thing", jsonDecoder, ({ body }) => {
    const key = nanoid();
    const value = body;
    db.set(key, value);
    return { key, value };
  });
  r.route("PUT /thing/<key>", jsonDecoder, ({ p, body }) => {
    const { key } = p;
    const value = body;
    db.set(key, value);
    return { key, value };
  });
  r.route("DELETE /thing/<key>", ({ p }) => ({ deleted: db.delete(p.key) }));

  return r;
}

describe("Router automatic OPTIONS responses (without CORS)", () => {
  const r = createMiniDbRouter({ cors: false });

  test("empty db returns 404s", async () => {
    const resp1 = await r.fetch(new Request("http://example.org/thing/foo"));
    await expectResponse(resp1, { error: "Not Found" }, 404);
    expect(Object.fromEntries(resp1.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
    });

    const resp2 = await r.fetch(new Request("http://example.org/thing/bar"));
    await expectResponse(resp2, { error: "Not Found" }, 404);
    expect(Object.fromEntries(resp2.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("writing and reading from db works", async () => {
    const resp1 = await r.fetch(
      new Request("http://example.org/thing/foo", {
        method: "PUT",
        body: "123",
      })
    );
    await expectResponse(resp1, { key: "foo", value: 123 });
    expect(Object.fromEntries(resp1.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
    });

    const resp2 = await r.fetch(new Request("http://example.org/thing/foo"));
    await expectResponse(resp2, { key: "foo", value: 123 });
    expect(Object.fromEntries(resp2.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
    });

    const resp3 = await r.fetch(
      new Request("http://example.org/thing", { method: "POST", body: '"xyz"' })
    );
    await expectResponse(resp3, { key: expect.any(String), value: "xyz" });
    expect(Object.fromEntries(resp3.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("http 405 responses will include allow header #1", async () => {
    const resp = await r.fetch(new Request("http://example.org/thing"));
    await expectResponse(resp, { error: "Method Not Allowed" }, 405);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "POST, OPTIONS",
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("http 405 responses will include allow header #2", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "POST", // Method not valid for this URL
      })
    );
    await expectResponse(resp, { error: "Method Not Allowed" }, 405);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("responds to non-CORS OPTIONS requests", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
    });
  });

  test("responds to non-CORS OPTIONS requests", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
    });
  });

  test("responds to CORS preflight requests", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
        headers: { Origin: TEST_ORIGIN },
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      // NOTE: No Access-Control-* headers here: CORS isn't enabled on this router!
      allow: "GET, PUT, DELETE, OPTIONS",
    });
  });
});

describe("Router automatic OPTIONS responses (with CORS)", () => {
  const r = createMiniDbRouter({ cors: true });

  test("empty db returns 404s", async () => {
    const resp1 = await r.fetch(new Request("http://example.org/thing/foo"));
    await expectResponse(resp1, { error: "Not Found" }, 404);
    expect(Object.fromEntries(resp1.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });

    const resp2 = await r.fetch(new Request("http://example.org/thing/bar"));
    await expectResponse(resp2, { error: "Not Found" }, 404);
    expect(Object.fromEntries(resp2.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });
  });

  test("writing and reading from db works", async () => {
    const resp1 = await r.fetch(
      new Request("http://example.org/thing/foo", {
        method: "PUT",
        body: "123",
      })
    );
    await expectResponse(resp1, { key: "foo", value: 123 });
    expect(Object.fromEntries(resp1.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });

    const resp2 = await r.fetch(new Request("http://example.org/thing/foo"));
    await expectResponse(resp2, { key: "foo", value: 123 });
    expect(Object.fromEntries(resp2.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });

    const resp3 = await r.fetch(
      new Request("http://example.org/thing", { method: "POST", body: '"xyz"' })
    );
    await expectResponse(resp3, { key: expect.any(String), value: "xyz" });
    expect(Object.fromEntries(resp3.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });
  });

  test("http 405 responses will include allow header #1", async () => {
    const resp = await r.fetch(new Request("http://example.org/thing"));
    await expectResponse(resp, { error: "Method Not Allowed" }, 405);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "POST, OPTIONS",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("http 405 responses will include allow header #2", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "POST", // Method not valid for this URL
      })
    );
    await expectResponse(resp, { error: "Method Not Allowed" }, 405);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
      "content-type": "application/json; charset=utf-8",
    });
  });

  test("responds to non-CORS OPTIONS requests", async () => {
    disableConsole();

    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });
  });

  test("responds to non-CORS OPTIONS requests", async () => {
    disableConsole();

    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": "*", // Because alwaysSend defaults to true in CORS config
    });
  });

  test("responds to CORS preflight requests", async () => {
    const resp = await r.fetch(
      new Request("http://example.org/thing/blablabla", {
        method: "OPTIONS",
        headers: {
          Origin: TEST_ORIGIN,
          "Access-Control-Request-Method": "POST",
        },
      })
    );
    expectEmptyResponse(resp);
    expect(Object.fromEntries(resp.headers)).toEqual({
      allow: "GET, PUT, DELETE, OPTIONS",
      "access-control-allow-origin": TEST_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      vary: "Origin",
    });
  });

  test("CORS response with explicitly allowed origin", async () => {
    const r = new ZenRouter({
      cors: { allowedOrigins: [TEST_ORIGIN, ANOTHER_ORIGIN] },
      //                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^ 🔑
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /", () => ({ ok: true }));

    const resp = await r.fetch(
      new Request("http://example.org", {
        headers: {
          // NOTE: This is *NOT* a CORS request!
          // Origin: TEST_ORIGIN,
        },
      })
    );
    await expectResponse(resp, { ok: true });
    expect(Object.fromEntries(resp.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": TEST_ORIGIN, // NOTE: Only the first allowed origin is returned
      vary: "Origin",
    });
  });

  test("will not override custom Vary header", async () => {
    const r = new ZenRouter({
      cors: true,
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /", () => json({ ok: true }, 200, { Vary: "X-Custom" }));

    // Non-CORS
    const resp1 = await r.fetch(
      new Request("http://example.org", {
        headers: {
          // NOTE: This is *NOT* a CORS request!
          // Origin: TEST_ORIGIN,
        },
      })
    );
    await expectResponse(resp1, { ok: true });
    expect(Object.fromEntries(resp1.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      vary: "X-Custom",
    });

    // CORS
    const resp2 = await r.fetch(
      new Request("http://example.org", {
        headers: { Origin: TEST_ORIGIN },
      })
    );
    await expectResponse(resp2, { ok: true });
    expect(Object.fromEntries(resp2.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": TEST_ORIGIN,
      vary: "X-Custom, Origin",
    });
  });
});

describe("CORS edge cases", () => {
  test("won’t add CORS headers if no Origin header on incoming request and sendWildcard isn't set", async () => {
    const r = new ZenRouter({
      cors: { alwaysSend: false },
      //      ^^^^^^^^^^^^^^^^^ 🔑
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /", () => ({ ok: true }));

    const resp = await r.fetch(new Request("http://example.org"));
    await expectResponse(resp, { ok: true });
    expect(Object.fromEntries(resp.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      // No CORS headers!
    });
  });

  test("won’t add CORS headers if no Origin header on incoming request allowCredentials is set", async () => {
    const r = new ZenRouter({
      cors: { allowCredentials: true },
      //      ^^^^^^^^^^^^^^^^^ 🔑
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /", () => ({ ok: true }));

    const resp = await r.fetch(new Request("http://example.org"));
    await expectResponse(resp, { ok: true });
    expect(Object.fromEntries(resp.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      // No CORS headers!
    });
  });

  test("won’t add CORS headers if Origin is not allowed", async () => {
    const r = new ZenRouter({
      cors: { allowedOrigins: [ANOTHER_ORIGIN] },
      //                       ^^^^^^^^^^^^^^ 🔑
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /", () => ({ ok: true }));

    const resp = await r.fetch(
      new Request("http://example.org", {
        headers: {
          Origin: "https://invalid-origin",
        },
      })
    );
    await expectResponse(resp, { ok: true });
    expect(Object.fromEntries(resp.headers)).toEqual({
      "content-type": "application/json; charset=utf-8",
      // No CORS headers!
    });
  });

  test("won’t add CORS headers to (101 response)", async () => {
    const r = new ZenRouter({
      cors: true,
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /socket", () => {
      // Return a 101 response, a socket accept
      const resp = new WebSocketResponse({
        "X-Custom": "my-custom-header",
      });
      return resp;
    });

    const resp = await r.fetch(new Request("http://example.org/socket"));
    expect(resp.status).toEqual(101);
    // expect(resp.status).toEqual(101);
    expect(Object.fromEntries(resp.headers)).toEqual({
      // NOTE: No Access-Control-* headers here: CORS headers should not be on 101 responses!
      "x-custom": "my-custom-header",
    });
  });

  test("won’t add CORS headers to (3xx responses)", async () => {
    const r = new ZenRouter({
      cors: true,
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /301", () => new Response(null, { status: 301 }));
    r.route("GET /303", () => new Response(null, { status: 303 }));
    r.route("GET /308", () => new Response(null, { status: 308 }));

    const resp1 = await r.fetch(new Request("http://example.org/301"));
    expect(resp1.status).toEqual(301);
    expect(Object.fromEntries(resp1.headers)).toEqual({
      // Note: *no* CORS headers to be found here!
    });

    const resp2 = await r.fetch(new Request("http://example.org/303"));
    expect(resp2.status).toEqual(303);
    expect(Object.fromEntries(resp2.headers)).toEqual({
      // Note: *no* CORS headers to be found here!
    });

    const resp3 = await r.fetch(new Request("http://example.org/308"));
    expect(resp3.status).toEqual(308);
    expect(Object.fromEntries(resp3.headers)).toEqual({
      // Note: *no* CORS headers to be found here!
    });
  });

  test("won’t add CORS headers to responses that already contain them", async () => {
    const r = new ZenRouter({
      cors: true,
      authorize: IGNORE_AUTH_FOR_THIS_TEST,
    });
    r.route("GET /custom-cors", () =>
      json({ ok: true }, 200, {
        "Access-Control-Allow-Origin": "I am set manually",
      })
    );

    const resp = await r.fetch(new Request("http://example.org/custom-cors"));

    // NOTE: Arguably, we could make this an uncaught error, because clearly we
    // don't want a route to be setting their own CORS headers and conflict
    // with Zen Router's logic :(
    expect(resp.status).toEqual(200);

    expect(Object.fromEntries(resp.headers)).toEqual({
      // Note: *no* CORS headers to be found here!
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "I am set manually",
    });
  });
});

describe("Error handling setup", () => {
  test("every router has its own error handler", async () => {
    const app1 = new ZenRouter();
    const app2 = new ZenRouter();

    // Configured in r1...
    app1.onError((e) => {
      switch (e.status) {
        case 404:
          return json({ quote: "One does not simply..." }, e.status);
        default:
          return fail();
      }
    });

    // r1 will use the custom defined 404 handler
    app1.route("GET /", fail);
    const resp1 = await app1.fetch(new Request("http://example.org/foo"));
    await expectResponse(resp1, { quote: "One does not simply..." }, 404);

    // ...but r2 will not use it
    app2.route("GET /", fail);
    const resp2 = await app2.fetch(new Request("http://example.org/foo"));
    await expectResponse(resp2, { error: "Not Found" }, 404);
  });

  test("multiple routers can share the same error handler", async () => {
    const errorHandler = new ErrorHandler();
    const app1 = new ZenRouter({ errorHandler });
    const app2 = new ZenRouter({ errorHandler });

    // Configured in r1...
    app1.onError((e) => {
      switch (e.status) {
        case 404:
          return json({ quote: "One does not simply..." }, e.status);
        default:
          return fail();
      }
    });

    // r1 will use the custom defined 404 handler
    app1.route("GET /", fail);
    const resp1 = await app1.fetch(new Request("http://example.org/foo"));
    await expectResponse(resp1, { quote: "One does not simply..." }, 404);

    // ...and now r2 will also use it
    app2.route("GET /", fail);
    const resp2 = await app2.fetch(new Request("http://example.org/foo"));
    await expectResponse(resp2, { quote: "One does not simply..." }, 404);
  });

  test("handles bugs in http error handler itself", async () => {
    const konsole = captureConsole();

    const app = new ZenRouter();
    app.onError(() => {
      throw new Error("Oops, I'm a broken error handler");
    });

    app.route("GET /", fail);

    // Trigger a 404, but the broken error handler will not handle that correctly
    const res = await app.fetch(new Request("http://example.org/foo"));
    await expectResponse(res, { error: "Internal Server Error" }, 500);

    expect(konsole.error).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(
        /^Uncaught error: Error: Oops, I'm a broken error handler/
      )
    );
  });
});
