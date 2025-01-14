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
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"', '"b"']);

      // Invalidating all users.
      client.resolvers.invalidateUsers();

      expect(client[kInternal].usersStore._cacheKeys()).toEqual([]);

      await client[kInternal].usersStore.enqueue("a");

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
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
      ]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"', '"b"']);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateUsers(["b", "c"]);

      expect(client[kInternal].usersStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
        client[kInternal].usersStore.enqueue("c"),
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
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
      ]);

      // Invalidating all rooms.
      client.resolvers.invalidateRoomsInfo();

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([]);

      await client[kInternal].roomsInfoStore.enqueue("a");

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
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
      ]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual([
        '"a"',
        '"b"',
      ]);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateRoomsInfo(["b", "c"]);

      expect(client[kInternal].roomsInfoStore._cacheKeys()).toEqual(['"a"']);

      await Promise.all([
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
        client[kInternal].roomsInfoStore.enqueue("c"),
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
  });
});
