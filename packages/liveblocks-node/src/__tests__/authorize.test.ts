import { authorize } from "..";

describe("authorize (legacy API)", () => {
  test.each([null, "", undefined, {}])(
    "should check that room is a non-empty string",
    async (room) => {
      await authorize({
        // @ts-expect-error: we want to test for anything passed as room
        room,
        userId: "user1",
        secret: "sk_xxx",
      }).then((response) => {
        expect(response.error && response.error.message).toBe(
          'Invalid value for field "room". Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
        );
      });
    }
  );

  test.each([
    "foo",
    "slashes/are/fine",
    "so/is-punctuation, and whitespace!@#$%^&()_ ",
    "emojis, too! 🐯🤘",
  ])("works with various room IDs", async (room) => {
    await authorize({
      room,
      userId: "user1",
      secret: "sk_xxx",
    }).then((response) => {
      expect(response.status).toBe(403);
      expect(response.body).toMatch(/Invalid secret key/);
    });
  });

  test.each([null, "", undefined, {}])(
    "should check that userId is a non-empty string",
    async (userId) => {
      await authorize({
        // @ts-expect-error: we want to test for anything passed as userId,
        userId,
        room: "123",
        secret: "sk_xxx",
      }).then((response) => {
        expect(response.error && response.error.message).toBe(
          'Invalid value for field "userId". Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
        );
      });
    }
  );

  test.each([null, "", undefined, {}])(
    "should check that secret is a non-empty string",
    async (secret) => {
      await authorize({
        userId: "userA",
        room: "123",
        // @ts-expect-error: we want to test for anything passed as userId,
        secret,
      }).then((response) => {
        expect(response.error && response.error.message).toBe(
          'Invalid value for field "secret". Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize'
        );
      });
    }
  );
});
