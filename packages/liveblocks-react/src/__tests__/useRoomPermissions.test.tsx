import { Permission } from "@liveblocks/core";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";

import { useRoomPermissions } from "../_private";
import { act, createContextsForTest, renderHook } from "./_utils";

function toPermissionList(
  permissions: ReadonlySet<Permission> | undefined
): Permission[] | undefined {
  return permissions === undefined ? undefined : Array.from(permissions);
}

describe("useRoomPermissions", () => {
  test("distinguishes unknown permissions from known empty permissions", () => {
    const roomId = "room";
    const {
      liveblocks: { LiveblocksProvider },
      umbrellaStore,
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useRoomPermissions(roomId), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toBeUndefined();

    act(() => {
      umbrellaStore.permissionHints.update(
        {
          [roomId]: [],
        },
        new Date("2026-06-01T07:11:09.000Z")
      );
    });

    expect(toPermissionList(result.current)).toEqual([]);

    unmount();
  });

  test("replaces permission hints for a room", () => {
    const roomId = "room";
    const {
      liveblocks: { LiveblocksProvider },
      umbrellaStore,
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useRoomPermissions(roomId), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    act(() => {
      umbrellaStore.permissionHints.update(
        {
          [roomId]: [Permission.CommentsNone],
        },
        new Date("2026-06-01T07:11:09.000Z")
      );
    });

    expect(toPermissionList(result.current)).toEqual([Permission.CommentsNone]);

    act(() => {
      umbrellaStore.permissionHints.update(
        {
          [roomId]: [Permission.CommentsWrite],
        },
        new Date("2026-06-01T07:12:09.000Z")
      );
    });

    expect(toPermissionList(result.current)).toEqual([
      Permission.CommentsWrite,
    ]);

    act(() => {
      umbrellaStore.permissionHints.update(
        {
          [roomId]: [Permission.CommentsNone],
        },
        new Date("2026-06-01T07:10:09.000Z")
      );
    });

    expect(toPermissionList(result.current)).toEqual([
      Permission.CommentsWrite,
    ]);

    act(() => {
      umbrellaStore.permissionHints.update(
        {
          [roomId]: [Permission.CommentsNone],
        },
        new Date("2026-06-01T07:13:09.000Z")
      );
    });

    expect(toPermissionList(result.current)).toEqual([Permission.CommentsNone]);

    unmount();
  });
});
