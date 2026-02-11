import { expectError, expectType } from "tsd";
import { number, numeric, object, string } from "decoders";

import { HttpError, ValidationError, ZenRouter } from "zenrouter";

declare const req: Request;

async () => {
  const app = new ZenRouter();

  app.route("GET /<foo>", ({ ctx, p }) => {
    expectType<Readonly<unknown>>(ctx);
    expectType<string>(p.foo);
    fail("no implementation");
  });

  expectType<Response>(await app.fetch(req, 1, "a", true));
};

// With a getContext() function
async () => {
  const app = new ZenRouter({
    getContext: (request, ...args) => ({ hello: "world", request, args }),
  });

  app.route("GET /", ({ ctx }) => {
    expectType<string>(ctx.hello); // "world"
    expectType<string>(ctx.request.url);
    expectType<readonly any[]>(ctx.args);
    fail("no implementation");
  });
};

// With a authorize() function
async () => {
  const app = new ZenRouter({
    authorize: ({ ctx }) => ({
      userId: "user-123",
      passThrough: { ctx },
    }),
  });

  app.route("GET /", ({ ctx, auth }) => {
    expectType<Readonly<unknown>>(ctx);
    expectType<Readonly<unknown>>(auth.passThrough.ctx); // same thing
    expectType<string>(auth.userId); // "user-123"
    fail("no implementation");
  });
};

// With a getContext() + authorize() function
async () => {
  const app = new ZenRouter({
    getContext: () => ({ abc: 123 }),
    authorize: ({ ctx }) => ({
      userId: "user-456",
      passThrough: { ctx },
    }),
  });

  app.route("GET /", ({ ctx, auth }) => {
    expectType<Readonly<{ abc: number }>>(ctx);
    expectType<Readonly<{ abc: number }>>(auth.passThrough.ctx); // same thing
    expectType<string>(auth.userId); // "user-456"
    fail("no implementation");
  });
};

// With centralized param validation
async () => {
  const app = new ZenRouter({
    params: {
      id: numeric,
      hex: string.transform((x) => parseInt(x, 16)),
    },
  });

  app.route("GET /rooms/<id>", ({ p }) => {
    expectType<number>(p.id);
    fail("no implementation");
  });

  app.route("GET /foo/<id>/bar/<name>", ({ p }) => {
    expectType<number>(p.id);
    expectType<string>(p.name);
    expectError(p.hex); // Not part of the pattern, so not available
    fail("no implementation");
  });

  app.route("GET /foo/<id>/bar/<name>/hex/<hex>", ({ p }) => {
    expectType<number>(p.id);
    expectType<string>(p.name);
    expectType<number>(p.hex); // Compare to the prev test, here hex *is* available
    fail("no implementation");
  });

  // Check body decoding
  app.route(
    "POST /foo/<id>",

    ({ body }) => {
      expectType<never>(body);
      fail("no implementation");
    }
  );

  // Check body decoding
  app.route(
    "POST /foo/<id>",

    object({ foo: string, bar: number }),

    ({ body }) => {
      expectType<string>(body.foo);
      expectType<number>(body.bar);
      expectError(body.qux);
      fail("no implementation");
    }
  );

  // Accessing query params
  app.route(
    "GET /foo",

    ({ q }) => {
      // Accessing query params like ?foo=123&bar=hi are always optional
      expectType<string | undefined>(q.foo);
      expectType<string | undefined>(q.bar);
      expectType<string | undefined>(q.i_do_not_exist);
      fail("no implementation");
    }
  );
};

// Type-safety of error handlers
async () => {
  const app = new ZenRouter();

  app.onUncaughtError((e) => {
    expectType<unknown>(e);
    fail();
  });

  app.onError((e) => {
    expectType<HttpError | ValidationError>(e);
    if (e instanceof ValidationError) {
      expectType<string>(e.reason);
    }
    fail();
  });
};
