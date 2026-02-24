import { describe, expect, test } from "vitest";
import { z } from "zod";

import { json, ZenRouter } from "~/index.js";
import { expectResponse } from "~test/utils.js";

const IGNORE_AUTH_FOR_THIS_TEST = () => Promise.resolve(true);

describe("Param decoders (zod)", () => {
  // Zod equivalent of decoders' `numeric`: coerce a string input to a number
  const zodNumeric = z.coerce.number();

  const r = new ZenRouter({
    authorize: IGNORE_AUTH_FOR_THIS_TEST,
    params: {
      x: zodNumeric,
      y: zodNumeric,
    },
  });

  r.route("GET /add/<x>/<y>", ({ p }) => json({ result: p.x + p.y, p }));
  r.route("GET /echo/<name>", ({ p }) => json({ name: p.name }));

  test("placeholders are automatically decoded + validated", async () => {
    const req = new Request("http://example.org/add/1337/42");
    expect(await (await r.fetch(req)).json()).toEqual({
      result: 1379,
      p: { x: 1337, y: 42 },
    });
  });

  test("placeholders that cannot be decoded/transformed will throw a 400 error", async () => {
    const req = new Request("http://example.org/add/1/one");
    const resp = await r.fetch(req);
    await expectResponse(resp, { error: "Bad Request" }, 400);
  });

  test("untyped placeholders still work as strings", async () => {
    const req = new Request("http://example.org/echo/hello");
    expect(await (await r.fetch(req)).json()).toEqual({ name: "hello" });
  });
});

describe("Router body validation (zod)", () => {
  const r = new ZenRouter({ authorize: IGNORE_AUTH_FOR_THIS_TEST });

  r.route(
    "POST /add",
    z.object({ x: z.number(), y: z.number() }),
    ({ body }) => ({ result: body.x + body.y })
  );

  r.route(
    "POST /empty",
    z.object({ a: z.number() }).optional(),
    () => ({ ok: true })
  );

  test("accepts correct body", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: '{"x":41,"y":1}',
    });
    await expectResponse(await r.fetch(req), { result: 42 });
  });

  test("rejects invalid body with actual error message", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: '{"x":41,"y":"not a number"}',
    });
    await expectResponse(
      await r.fetch(req),
      {
        error: "Unprocessable Entity",
        reason:
          "Value at key 'y': Invalid input: expected number, received string",
      },
      422
    );
  });

  test("rejects body with missing fields", async () => {
    const req = new Request("http://example.org/add", {
      method: "POST",
      body: '{"x":41}',
    });
    await expectResponse(
      await r.fetch(req),
      {
        error: "Unprocessable Entity",
        reason:
          "Value at key 'y': Invalid input: expected number, received undefined",
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

  test("can accept empty bodies", async () => {
    {
      const req = new Request("http://example.org/empty", {
        method: "POST",
        body: "nah-ah", // Invalid body
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
        // No body here
      });
      await expectResponse(await r.fetch(req), { ok: true });
    }
  });
});
