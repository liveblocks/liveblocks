import { authorize } from ".";

describe("authorize", () => {
  test.each([null, "", undefined, {}])(
    "should check that room is a non-empty string",
    async (room) => {
      await authorize({
        room,
        secret: "sk_xxx",
      }).then((response) => {
        expect(response.error && response.error.message).toBe(
          "Invalid room. Please provide a non-empty string as the room. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize"
        );
      });
    }
  );
});
