import { authorize } from ".";

describe("authorize", () => {
  test("should error if public api key is used", async () => {
    const response = await authorize({
      secret: "pk_xxx",
      room: "room",
    });

    expect(response.status).toBe(403);
    expect(response.error && response.error.message).toBe(
      'We expect a secret key ("sk_") here, but we found a public key ("pk_") instead. Hint: You can find your secret key at https://liveblocks.io/dashboard/apikeys. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
    );
  });

  test.each(["unknown", undefined, null, "", {}])(
    "should error if unknown key is used",
    async (secret) => {
      const response = await authorize({
        // @ts-expect-error: we want to test for anything passed as secret
        secret,
        room: "room",
      });

      expect(response.status).toBe(403);
      expect(response.error && response.error.message).toBe(
        'We expect a secret key ("sk_") here, but we found an unknown key instead. Hint: You can find your secret key at https://liveblocks.io/dashboard/apikeys. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
      );
    }
  );
});
