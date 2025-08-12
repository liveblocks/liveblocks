import { describe, expect, test } from "vitest";

import { ManagedOthers } from "../ManagedOthers";

type P = {
  x: number;
  y: number;
  z?: number;
};

type M = {
  id: string;
  info?: {
    avatar: string;
  };
  scopes: string[];
};

describe('Read-only "others" ref cache', () => {
  describe('Tracking "others"', () => {
    test("setting alone is not enough other", () => {
      const others = new ManagedOthers<P, M>();
      others.setOther(2, { x: 1, y: 1 });

      expect(others.get()).toStrictEqual(
        [] // NOTE: Even though .setOther() is called, this is still empty!
      );

      // The "others" will only be populated if both connection and presence
      // information is known for this user. Normally, this information is
      // known before the .setOther() call is made, unlike how this test case
      // is structured.
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 1, y: 1 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("setting other", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setConnection(3, "user-567", undefined, ["room:write"]);

      others.setOther(2, { x: 2, y: 2 });
      others.setOther(3, { x: 3, y: 3 });
      others.setOther(2, { x: -2, y: -2 });

      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: -2, y: -2 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
        {
          connectionId: 3,
          id: "user-567",
          presence: { x: 3, y: 3 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("setting other as read-only", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:read"]);
      others.setConnection(3, "user-567", undefined, ["room:write"]);

      others.setOther(2, { x: 2, y: 2 });
      others.setOther(3, { x: 3, y: 3 });

      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 2, y: 2 },
          isReadOnly: true,
          canWrite: false,
          canComment: false,
        },
        {
          connectionId: 3,
          id: "user-567",
          presence: { x: 3, y: 3 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("setting others removes explicitly-undefined keys", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setOther(2, { x: 2, y: 2, z: undefined });
      //                                  ^^^^^^^^^ 🔑

      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 2, y: 2 },
          //          ^ 🔑 (no explicit undefined here)
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("patching others ignores patches for unknown users", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.patchOther(2, { y: 1, z: 2 }); // .setOther() not called yet for actor 2

      expect(others.get()).toStrictEqual([]);
    });

    test("patching others", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setOther(2, { x: 2, y: 2 });
      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 2, y: 2 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);

      others.patchOther(2, { y: -2, z: -2 });
      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 2, y: -2, z: -2 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);

      others.patchOther(2, { z: undefined });
      expect(others.get()).toStrictEqual([
        {
          connectionId: 2,
          id: "user-123",
          presence: { x: 2, y: -2 },
          isReadOnly: false,
          canWrite: true,
          canComment: true,
        },
      ]);
    });

    test("removing connections", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setOther(2, { x: 2, y: 2 });

      expect(others.getUser(2)).toStrictEqual({
        connectionId: 2,
        id: "user-123",
        presence: { x: 2, y: 2 },
        isReadOnly: false,
        canWrite: true,
        canComment: true,
      });
      others.removeConnection(2);

      expect(others.getUser(2)).toBeUndefined();
      expect(others.get()).toStrictEqual([]);

      // Setting other without .setConnection() will have no effect
      others.setOther(2, { x: 2, y: 2 });
      expect(others.getUser(2)).toBeUndefined();
      expect(others.get()).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    test("caches immutable results (others)", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setOther(2, { x: 2, y: 2 });

      const others1 = others.get();
      const others2 = others.get();
      expect(others1).toBe(others2);

      // These are effectively no-ops
      others.patchOther(2, { x: 2 });
      others.patchOther(2, { y: 2, z: undefined });

      const others3 = others.get();
      expect(others2).toBe(others3); // No observable change!

      const others4 = others.get();
      const others5 = others.get();
      expect(others3).toBe(others4); // Others did not change
      expect(others4).toBe(others5);

      others.patchOther(2, { y: -2 });

      const others6 = others.get();
      const others7 = others.get();
      expect(others5).not.toBe(others6); // Others changed
      expect(others6).toBe(others7);
    });

    test("getUser() returns stable cache results", () => {
      const others = new ManagedOthers<P, M>();
      others.setConnection(2, "user-123", undefined, ["room:write"]);
      others.setOther(2, { x: 2, y: 2 });

      expect(others.getUser(2)).toBe(others.getUser(2));
    });
  });
});
