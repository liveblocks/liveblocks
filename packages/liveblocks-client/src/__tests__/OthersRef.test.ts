import { OthersRef } from "../OthersRef";

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
};

describe('Read-only "others" ref cache', () => {
  describe('Tracking "others"', () => {
    it("setting alone is not enough other", () => {
      const others = new OthersRef<P, M>();
      others.setOther(2, { x: 1, y: 1 });

      expect(others.current).toStrictEqual(
        [] // NOTE: Even though .setOther() is called, this is still empty!
      );

      // The "others" will only be populated if both connection and presence
      // information is known for this user. Normally, this information is
      // known before the .setOther() call is made, unlike how this test case
      // is structured.
      others.setConnection(2, "user-123", undefined, false);
      expect(others.current).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 1, y: 1 } },
      ]);
    });

    it("setting other", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setConnection(3, "user-567", undefined, false);

      others.setOther(2, { x: 2, y: 2 });
      others.setOther(3, { x: 3, y: 3 });
      others.setOther(2, { x: -2, y: -2 });

      expect(others.current).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: -2, y: -2 } },
        { connectionId: 3, id: "user-567", presence: { x: 3, y: 3 } },
      ]);
    });

    it("setting others removes explicitly-undefined keys", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setOther(2, { x: 2, y: 2, z: undefined });
      //                             ^^^^^^^^^ 🔑

      expect(others.current).toStrictEqual(
        [{ connectionId: 2, id: "user-123", presence: { x: 2, y: 2 } }]
        //                                              ^ 🔑 (no explicit undefined here)
      );
    });

    it("patching others ignores patches for unknown users", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.patchOther(2, { y: 1, z: 2 }); // .setOther() not called yet for actor 2

      expect(others.current).toStrictEqual([]);
    });

    it("patching others", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setOther(2, { x: 2, y: 2 });
      expect(others.current).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: 2 } },
      ]);

      others.patchOther(2, { y: -2, z: -2 });
      expect(others.current).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: -2, z: -2 } },
      ]);

      others.patchOther(2, { z: undefined });
      expect(others.current).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: -2 } },
      ]);
    });

    it("removing connections", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setOther(2, { x: 2, y: 2 });

      expect(others.getUser(2)).toStrictEqual({
        connectionId: 2,
        id: "user-123",
        presence: { x: 2, y: 2 },
      });
      others.removeConnection(2);

      expect(others.getUser(2)).toBeUndefined();
      expect(others.current).toStrictEqual([]);

      // Setting other without .setConnection() will have no effect
      others.setOther(2, { x: 2, y: 2 });
      expect(others.getUser(2)).toBeUndefined();
      expect(others.current).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    it("caches immutable results (others)", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setOther(2, { x: 2, y: 2 });

      const others1 = others.current;
      const others2 = others.current;
      expect(others1).toBe(others2);

      // These are effectively no-ops
      others.patchOther(2, { x: 2 });
      others.patchOther(2, { y: 2, z: undefined });

      const others3 = others.current;
      expect(others2).toBe(others3); // No observable change!

      const others4 = others.current;
      const others5 = others.current;
      expect(others3).toBe(others4); // Others did not change
      expect(others4).toBe(others5);

      others.patchOther(2, { y: -2 });

      const others6 = others.current;
      const others7 = others.current;
      expect(others5).not.toBe(others6); // Others changed
      expect(others6).toBe(others7);
    });

    it("getUser() returns stable cache results", () => {
      const others = new OthersRef<P, M>();
      others.setConnection(2, "user-123", undefined, false);
      others.setOther(2, { x: 2, y: 2 });

      expect(others.getUser(2)).toBe(others.getUser(2));
    });
  });
});
