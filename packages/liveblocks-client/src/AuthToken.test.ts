import type { JwtMetadata } from "./AuthToken";
import { isTokenExpired } from "./AuthToken";

describe("isTokenExpired", () => {
  const MINUTES = 60 * 1000;
  const HOURS = 60 * MINUTES;
  const DAYS = 24 * HOURS;

  test("token is valid", () => {
    const validToken: JwtMetadata = {
      iat: (Date.now() - 15 * MINUTES) / 1000,
      exp: (Date.now() + 3 * HOURS) / 1000,
    };

    expect(isTokenExpired(validToken)).toBe(false);
  });

  test("token is expired", () => {
    const expiredToken: JwtMetadata = {
      iat: (Date.now() - 1 * DAYS) / 1000,
      exp: (Date.now() - 15 * MINUTES) / 1000,
    };

    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  test("future token is invalid", () => {
    const futureToken: JwtMetadata = {
      iat: (Date.now() + 15 * MINUTES) / 1000,
      exp: (Date.now() + 1 * DAYS) / 1000,
    };

    expect(isTokenExpired(futureToken)).toBe(true);
  });
});
