import { authorize } from "..";

describe("authorize", () => {
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
          "Invalid room. Please provide a non-empty string as the room. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
        );
      });
    }
  );

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
          "Invalid userId. Please provide a non-empty string as the userId. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
        );
      });
    }
  );
});
