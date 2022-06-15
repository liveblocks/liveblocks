import { authorize } from ".";

describe("authorize", () => {
  test("should error if public api key is used", async () => {
    const response = await authorize({
      secret: "pk_xxx",
      room: "room",
    });

    expect(response.status).toBe(403);
    expect(response.error && response.error.message).toBe(
      "Invalid key. You are using the public key which is not supported. Please use the secret key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
    );
  });

  test("should error if unknown key is used", async () => {
    const response = await authorize({
      secret: "unknown",
      room: "room",
    });

    expect(response.status).toBe(403);
    expect(response.error && response.error.message).toBe(
      "Invalid key. Please use the secret key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
    );
  });
});
