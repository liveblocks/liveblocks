import type {
  ClientOptions,
  ResolveRoomsInfoArgs,
  ResolveUsersArgs,
} from "../client";
import { createClient } from "../client";
import { kInternal } from "../internal";
import { MockWebSocket } from "./_MockWebSocketServer";

function createClientForTest(
  options?: Omit<ClientOptions, "publicApiKey" | "authEndpoint" | "polyfills">
) {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
    ...options,
  });

  return client;
}

describe("resolvers", () => {
  describe("invalidateUsers", () => {
    test("should support invalidating all users", async () => {
      const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
        userIds.map((userId) => ({ name: userId }))
      );
      const client = createClientForTest({
        resolveUsers,
      });

      await Promise.all([
        client[kInternal].usersStore.get("a"),
        client[kInternal].usersStore.get("b"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"', '"b"']);

      // Invalidating all users.
      client.resolvers.invalidateUsers();

      expect(client[kInternal].usersStore._cacheKeys()).toEqual([]);

      await client[kInternal].usersStore.get("a");

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"']);

      expect(resolveUsers).toHaveBeenCalledTimes(2);
      expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["a", "b"] });
      expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["a"] });
    });

    test("should support invalidating specific users", async () => {
      const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
        userIds.map((userId) => ({ name: userId }))
      );
      const client = createClientForTest({
        resolveUsers,
      });

      await Promise.all([
        client[kInternal].usersStore.get("a"),
        client[kInternal].usersStore.get("b"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"', '"b"']);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateUsers(["b", "c"]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].usersStore.get("a"),
        client[kInternal].usersStore.get("b"),
        client[kInternal].usersStore.get("c"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
        '"c"',
      ]);

      expect(resolveUsers).toHaveBeenCalledTimes(2);
      expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["a", "b"] });
      expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["b", "c"] });
    });

    test("should support invalidating specific users using a predicate", async () => {
      const resolveUsers = jest.fn(({ userIds }: ResolveUsersArgs) =>
        userIds.map((userId) => ({ name: userId }))
      );
      const client = createClientForTest({
        resolveUsers,
      });

      await Promise.all([
        client[kInternal].usersStore.get("a"),
        client[kInternal].usersStore.get("b"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"', '"b"']);

      // Invalidate users with name "b".
      const invalidatePredicate = jest.fn((user) => user.name === "b");
      client.resolvers.invalidateUsers(invalidatePredicate);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].usersStore.get("a"),
        client[kInternal].usersStore.get("b"),
        client[kInternal].usersStore.get("c"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
        '"c"',
      ]);

      expect(resolveUsers).toHaveBeenCalledTimes(2);
      expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["a", "b"] });
      expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["b", "c"] });

      expect(invalidatePredicate).toHaveBeenCalledTimes(2);
      expect(invalidatePredicate).toHaveBeenNthCalledWith(1, { name: "a" });
      expect(invalidatePredicate).toHaveBeenNthCalledWith(2, { name: "b" });
    });
  });

  describe("invalidateRoomsInfo", () => {
    test("should support invalidating all rooms", async () => {
      const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
        roomIds.map((roomId) => ({ name: roomId }))
      );
      const client = createClientForTest({
        resolveRoomsInfo,
      });

      await Promise.all([
        client[kInternal].roomsInfoStore.get("a"),
        client[kInternal].roomsInfoStore.get("b"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
      ]);

      // Invalidating all rooms.
      client.resolvers.invalidateRoomsInfo();

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([]);

      await client[kInternal].roomsInfoStore.get("a");

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual(['"a"']);

      expect(resolveRoomsInfo).toHaveBeenCalledTimes(2);
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, {
        roomIds: ["a", "b"],
      });
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, { roomIds: ["a"] });
    });

    test("should support invalidating specific rooms", async () => {
      const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
        roomIds.map((roomId) => ({ name: roomId }))
      );
      const client = createClientForTest({
        resolveRoomsInfo,
      });

      await Promise.all([
        client[kInternal].roomsInfoStore.get("a"),
        client[kInternal].roomsInfoStore.get("b"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
      ]);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateRoomsInfo(["b", "c"]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].roomsInfoStore.get("a"),
        client[kInternal].roomsInfoStore.get("b"),
        client[kInternal].roomsInfoStore.get("c"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
        '"c"',
      ]);

      expect(resolveRoomsInfo).toHaveBeenCalledTimes(2);
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, {
        roomIds: ["a", "b"],
      });
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, {
        roomIds: ["b", "c"],
      });
    });

    test("should support invalidating specific rooms using a predicate", async () => {
      const resolveRoomsInfo = jest.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
        roomIds.map((roomId) => ({ name: roomId }))
      );
      const client = createClientForTest({
        resolveRoomsInfo,
      });

      await Promise.all([
        client[kInternal].roomsInfoStore.get("a"),
        client[kInternal].roomsInfoStore.get("b"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
      ]);

      // Invalidate rooms with name "b".
      const invalidatePredicate = jest.fn((room) => room.name === "b");
      client.resolvers.invalidateRoomsInfo(invalidatePredicate);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].roomsInfoStore.get("a"),
        client[kInternal].roomsInfoStore.get("b"),
        client[kInternal].roomsInfoStore.get("c"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
        '"c"',
      ]);

      expect(resolveRoomsInfo).toHaveBeenCalledTimes(2);
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, {
        roomIds: ["a", "b"],
      });
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, {
        roomIds: ["b", "c"],
      });

      expect(invalidatePredicate).toHaveBeenCalledTimes(2);
      expect(invalidatePredicate).toHaveBeenNthCalledWith(1, { name: "a" });
      expect(invalidatePredicate).toHaveBeenNthCalledWith(2, { name: "b" });
    });
  });
});
