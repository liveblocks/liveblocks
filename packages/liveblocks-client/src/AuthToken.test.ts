import type { JwtMetadata } from "./AuthToken";
import { isTokenExpired, parseRoomAuthToken } from "./AuthToken";

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

describe("parseRoomAuthToken", () => {
  const roomToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2Nywicm9vbUlkIjoiazV3bWgwRjlVTGxyek1nWnRTMlpfIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJhY3RvciI6MCwic2NvcGVzIjpbIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIiwicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.IQFyw54-b4F6P0MTSzmBVwdZi2pwPaxZwzgkE2l0Mi4";
  const apiToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2NywiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJzY29wZXMiOlsicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.7Wplt6YV_YbpPAcAFyC8pX8tk5BGNy53GdoH1_u8sjo";

  test("should parse a valid token", () => {
    const parsedToken = parseRoomAuthToken(roomToken);
    expect(parsedToken).toEqual({
      iat: 1616723667,
      exp: 1616727267,
      roomId: "k5wmh0F9ULlrzMgZtS2Z_",
      appId: "605a4fd31a36d5ea7a2e0914",
      actor: 0,
      scopes: [
        "websocket:presence",
        "websocket:storage",
        "room:read",
        "room:write",
      ],
    });
  });

  test("should throw if token is not a room token", () => {
    try {
      parseRoomAuthToken(apiToken);
    } catch (error) {
      expect(error).toEqual(
        new Error(
          "Authentication error: we expected a room token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientWithCallback"
        )
      );
    }
  });
});
