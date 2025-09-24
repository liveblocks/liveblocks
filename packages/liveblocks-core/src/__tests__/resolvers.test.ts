import { assertEq } from "tosti";
import { describe, expect, test, vi } from "vitest";

import type {
  ClientOptions,
  ResolveGroupsInfoArgs,
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
      const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
        userIds.map((userId) => ({ name: userId }))
      );
      const client = createClientForTest({
        resolveUsers,
      });

      await Promise.all([
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].usersStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating all users.
      client.resolvers.invalidateUsers();

      assertEq(client[kInternal].usersStore._cacheKeys(), []);

      await client[kInternal].usersStore.enqueue("a");

      assertEq(client[kInternal].usersStore._cacheKeys(), ['"a"']);

      assertEq(resolveUsers.mock.calls.length, 2);
      expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["a", "b"] });
      expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["a"] });
    });

    test("should support invalidating specific users", async () => {
      const resolveUsers = vi.fn(({ userIds }: ResolveUsersArgs) =>
        userIds.map((userId) => ({ name: userId }))
      );
      const client = createClientForTest({
        resolveUsers,
      });

      await Promise.all([
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].usersStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateUsers(["b", "c"]);

      assertEq(client[kInternal].usersStore._cacheKeys(), ['"a"']);

      await Promise.all([
        client[kInternal].usersStore.enqueue("a"),
        client[kInternal].usersStore.enqueue("b"),
        client[kInternal].usersStore.enqueue("c"),
      ]);

      assertEq(client[kInternal].usersStore._cacheKeys(), [
        '"a"',
        '"b"',
        '"c"',
      ]);

      assertEq(resolveUsers.mock.calls.length, 2);
      expect(resolveUsers).toHaveBeenNthCalledWith(1, { userIds: ["a", "b"] });
      expect(resolveUsers).toHaveBeenNthCalledWith(2, { userIds: ["b", "c"] });
    });
  });

  describe("invalidateRoomsInfo", () => {
    test("should support invalidating all rooms", async () => {
      const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
        roomIds.map((roomId) => ({ name: roomId }))
      );
      const client = createClientForTest({
        resolveRoomsInfo,
      });

      await Promise.all([
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating all rooms.
      client.resolvers.invalidateRoomsInfo();

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), []);

      await client[kInternal].roomsInfoStore.enqueue("a");

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), ['"a"']);

      assertEq(resolveRoomsInfo.mock.calls.length, 2);
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, {
        roomIds: ["a", "b"],
      });
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, { roomIds: ["a"] });
    });

    test("should support invalidating specific rooms", async () => {
      const resolveRoomsInfo = vi.fn(({ roomIds }: ResolveRoomsInfoArgs) =>
        roomIds.map((roomId) => ({ name: roomId }))
      );
      const client = createClientForTest({
        resolveRoomsInfo,
      });

      await Promise.all([
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateRoomsInfo(["b", "c"]);

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), ['"a"']);

      await Promise.all([
        client[kInternal].roomsInfoStore.enqueue("a"),
        client[kInternal].roomsInfoStore.enqueue("b"),
        client[kInternal].roomsInfoStore.enqueue("c"),
      ]);

      assertEq(client[kInternal].roomsInfoStore._cacheKeys(), [
        '"a"',
        '"b"',
        '"c"',
      ]);

      assertEq(resolveRoomsInfo.mock.calls.length, 2);
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(1, {
        roomIds: ["a", "b"],
      });
      expect(resolveRoomsInfo).toHaveBeenNthCalledWith(2, {
        roomIds: ["b", "c"],
      });
    });
  });

  describe("invalidateGroupsInfo", () => {
    test("should support invalidating all groups", async () => {
      const resolveGroupsInfo = vi.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
        groupIds.map((groupId) => ({ name: groupId }))
      );
      const client = createClientForTest({
        resolveGroupsInfo,
      });

      await Promise.all([
        client[kInternal].groupsInfoStore.enqueue("a"),
        client[kInternal].groupsInfoStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating all groups.
      client.resolvers.invalidateGroupsInfo();

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), []);

      await client[kInternal].groupsInfoStore.enqueue("a");

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), ['"a"']);

      assertEq(resolveGroupsInfo.mock.calls.length, 2);
      expect(resolveGroupsInfo).toHaveBeenNthCalledWith(1, {
        groupIds: ["a", "b"],
      });
      expect(resolveGroupsInfo).toHaveBeenNthCalledWith(2, { groupIds: ["a"] });
    });

    test("should support invalidating specific groups", async () => {
      const resolveGroupsInfo = vi.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
        groupIds.map((groupId) => ({ name: groupId }))
      );
      const client = createClientForTest({
        resolveGroupsInfo,
      });

      await Promise.all([
        client[kInternal].groupsInfoStore.enqueue("a"),
        client[kInternal].groupsInfoStore.enqueue("b"),
      ]);

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), ['"a"', '"b"']);

      // Invalidating "b" and "c" even though "c" is not in the cache.
      client.resolvers.invalidateGroupsInfo(["b", "c"]);

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), ['"a"']);

      await Promise.all([
        client[kInternal].groupsInfoStore.enqueue("a"),
        client[kInternal].groupsInfoStore.enqueue("b"),
        client[kInternal].groupsInfoStore.enqueue("c"),
      ]);

      assertEq(client[kInternal].groupsInfoStore._cacheKeys(), [
        '"a"',
        '"b"',
        '"c"',
      ]);

      assertEq(resolveGroupsInfo.mock.calls.length, 2);
      expect(resolveGroupsInfo).toHaveBeenNthCalledWith(1, {
        groupIds: ["a", "b"],
      });
      expect(resolveGroupsInfo).toHaveBeenNthCalledWith(2, {
        groupIds: ["b", "c"],
      });
    });
  });
});
