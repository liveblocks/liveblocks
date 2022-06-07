import { isTokenExpired } from "./AuthToken";
import type { JwtMetadata } from "./AuthToken";

describe("isTokenValid", () => {
  const ONE_DAY_AGO = Date.now() - 24 * 60 * 60 * 1000;
  const SIX_MINUTES_AGO = Date.now() - 60 * 60 * 1000 * 6;
  const IN_FIVE_MINUTES = Date.now() + 60 * 60 * 1000 * 5;

  test("token is valid", () => {
    const validToken: JwtMetadata = {
      iat: Date.now(),
      exp: IN_FIVE_MINUTES,
    };

    expect(isTokenExpired(validToken)).toBe(false);
  });

  test("token is expired", () => {
    const expiredToken: JwtMetadata = {
      iat: ONE_DAY_AGO,
      exp: SIX_MINUTES_AGO,
    };

    expect(isTokenExpired(expiredToken)).toBe(true);
  });
});
