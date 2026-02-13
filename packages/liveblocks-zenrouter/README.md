<img src="./assets/zen-router.webp" alt="Zen Router" />

Zen Router is an opinionated router, with batteries included and encouraging
patterns that remain maintable over time as your application grows.

## Installation

```
npm i zenrouter
```

## Purpose

The main purpose of this router is to implement an API backend.

## Quick start

```ts
import { object, string } from "decoders";
import { Router } from "zenrouter";

const app = new Router(/* ... */);

app.route(
  "GET /greet/<name>",

  ({ p }) => ({ result: `Hi, ${p.name}!` })
);

app.route(
  "POST /greet",

  object({
    name: string,
  }),

  ({ body }) => ({
    result: `Hi, ${body.name}!`,
  })
);

export default app;
```

## The Zen Router pipeline

![](./zen-router-diagram.png)

## Principles

General principles:

- It should be hard to make a mistake in your router setup.
- It should be hard to forget something that will bite you later.
- Secure by default.

Pragmatic:

- Implementing real world endpoints should be joyful, easy, and type-safe.
- All requests are JSON (by default)
- All responses are JSON arrays or objects (by default)
- All error responses will have at least an `{ error }` key with a
  human-readable string in there
- You can _throw_ any HTTP error or other exception to short-circuit a non-2xx
  response.
- Will return JSON error responses by default for all known HTTP errors. Can be
  customized.
- CORS support is built-in, and can be enabled with a simple `{ cors: true }`
  that is a sane default for most cases.

Secure/sane by default:

- Will automatically manage OPTIONS routes and responses
- All requests must be authorized. Authorization is not opt-in, but opt-out.
- All params are verified: `/foo/<bar>/<qux>` (strings by default, or possibly
  decoded, always type-safe, available as `p.bar` and `p.qux`)
- All query strings are type-safely accessible: `/foo?abc=hi` accessible as `q`
  will be `{ abc: 'hi' }`
- JSON bodies of POST requests will be decoded using a per-request decoder
- Path params cannot be "empty" strings nor can be optional
- All routes params are URI-decoded by default, this is not left to userland.
- CORS can simply be enabled on a Router instance out of the box, following the
  simple philosophy that when you want to enable CORS, you wish to enable it for
  all endpoints in that router.

Maintainability:

- All route patterns are static, and fully qualified, and thus "greppable". This
  keeps them readable and unambigious over time.
- In particular, this means it won't allow for a "base" prefix URL setup, which
  is often used in other router libraries to DRY up your route strings, but in
  practice this makes the code base harder to user over time (because different
  subrouters can have what seems to be the same route pattern).
- Routes are registered not just by path, but also by method, as part of the
  definition. This will make the routes much more readable and obvious, e.g.
  `app.route("POST /v2/foo/bar")` instead of `app.post("/v2/foo/bar")`.
- No complex middlewares. There is just the request context and auth functions.
  Those are the only two places where "middleware" can live. No per-route
  middlewares.
- No monkey-patching of the request. The request context is the user-defined
  place to carry data alongside the request.
- Default error handling can be configured on a per-status code basis (used when
  handlers throw a (custom) HttpError), individual requests can always bypass
  this by throwing a custom Response.
