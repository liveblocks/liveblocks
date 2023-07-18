import { parseAuthToken, Permission } from "../../protocol/AuthToken";

describe("parseRoomAuthToken", () => {
  const roomToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6ODcsInNjb3BlcyI6WyJyb29tOndyaXRlIl19.uS0VcdeAPdMfJ2rseRRUnL_X3I-h6ljPKEiu1xfKRG0Qrth0zdqo2ngn7NZ8_fLcQBaIvaZ4q5vXg_Nex81Ae9sjmmLhjxHcE-iA-BC82NROVSnyGdVHJRMNqs6h57pCdiXwCwpcLjqi_EOIS8gmMB8dcRX748Wpa4C2T0e94An8_vP6eD66JKndxjFvVPrB_LSOOlQZoxW9USPS7ZUTAECeGQscrXnss_-1TJEaGf0RxVkNQsDfUKu4TjWYa3iBvBPip--Ev1bBETh0IHrGNsWVUd-691cCRAemiC_ADBaOg5IEszqoEw96Xe9BtQeWrjAgMKKrPS72cwkikVmiJQ";

  const apiToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTY3MjM2NjcsImV4cCI6MTYxNjcyNzI2NywiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA5MTQiLCJzY29wZXMiOlsicm9vbTpyZWFkIiwicm9vbTp3cml0ZSJdfQ.7Wplt6YV_YbpPAcAFyC8pX8tk5BGNy53GdoH1_u8sjo";

  test("should parse a valid token", () => {
    const { parsed } = parseAuthToken(roomToken);
    expect(parsed).toEqual({
      actor: 87,
      appId: "605a4fd31a36d5ea7a2e08f1",
      exp: 1664570010,
      iat: 1664566410,
      roomId: "KXa6UclvraeGZNdXVz67Z",
      scopes: [Permission.Write],
    });
  });

  test("should throw if token is not a room token", () => {
    try {
      parseAuthToken(apiToken);
    } catch (error) {
      expect(error).toEqual(
        new Error(
          "Authentication error: we expected a room token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
        )
      );
    }
  });
});
