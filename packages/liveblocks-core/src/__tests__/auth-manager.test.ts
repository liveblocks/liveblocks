import { rest } from "msw";
import { setupServer } from "msw/node";
import { createAuthManager } from "../auth-manager";
import type { ParsedAuthToken } from "../protocol/AuthToken";

describe("auth-manager - public api key", () => {
  test("should return public api key", async () => {
    const authManager = createAuthManager({ publicApiKey: "pk_123" });

    const authValue = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "public"; publicApiKey: string };

    expect(authValue.type).toEqual("public");
    expect(authValue.publicApiKey).toEqual("pk_123");
  });
});

describe("auth-manager - secret auth", () => {
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6ODcsInNjb3BlcyI6WyJyb29tOndyaXRlIl0sImsiOiJzZWMtbGVnYWN5In0.2DhcT0qwAMdhD0LwA0RAuRXzyjRVQrP6afFL9GG6vwh2gTyx-THw0clFof5WIx9skDuq064IITXgdU9r_vE04Vq9zxdbb0M_mOzISop9iGcWMWIyT-nNdWf3ly1zumNivKjhXcyCXW7t6VsVvvvt78Q5vLAkZIZxNxyBlWebKr2NR9t-PP2C6qlu64EgRH6mhMA7upc1UkkNp65ndVvIinEN92KKkzEjoTq8gv1MM5vMFxNY-Cvx673KY6xfO6op01Z0LE1lT_9YRixErCJZ2fnk_iheARH_0MXT29N76kEX1UA3OXhU_cWHX54kS-hPY_bQqGbjC-cuISLjhF5rpQ";
  const server = setupServer(
    rest.post("/mocked-api/auth", (_req, res, ctx) => {
      return res(ctx.json({ token }));
    }),
    rest.post("/mocked-api/403", (_req, res, ctx) => {
      return res(ctx.status(403));
    }),
    rest.post("/mocked-api/401-with-details", (_req, res, ctx) => {
      return res(ctx.status(401), ctx.text("wrong key type"));
    }),
    rest.post("/mocked-api/not-json", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.text("this is not json"));
    }),
    rest.post("/mocked-api/missing-token", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.json({}));
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should return token", async () => {
    const authManager = createAuthManager({ authEndpoint: "/mocked-api/auth" });

    const authValue = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValue.type).toEqual("secret");
    expect(authValue.token.raw).toEqual(token);
  });
});
