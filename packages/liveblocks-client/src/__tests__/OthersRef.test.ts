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
      const p = new OthersRef<P, M>();
      p.setOther(2, { x: 1, y: 1 });

      expect(p.others).toStrictEqual(
        [] // NOTE: Even though .setOther() is called, this is still empty!
      );

      // The "others" will only be populated if both connection and presence
      // information is known for this user. Normally, this information is
      // known before the .setOther() call is made, unlike how this test case
      // is structured.
      p.setConnection(2, "user-123", undefined);
      expect(p.others).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 1, y: 1 } },
      ]);
    });

    it("setting other", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setConnection(3, "user-567", undefined);

      p.setOther(2, { x: 2, y: 2 });
      p.setOther(3, { x: 3, y: 3 });
      p.setOther(2, { x: -2, y: -2 });

      expect(p.others).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: -2, y: -2 } },
        { connectionId: 3, id: "user-567", presence: { x: 3, y: 3 } },
      ]);
    });

    it("setting others removes explicitly-undefined keys", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2, z: undefined });
      //                             ^^^^^^^^^ 🔑

      expect(p.others).toStrictEqual(
        [{ connectionId: 2, id: "user-123", presence: { x: 2, y: 2 } }]
        //                                              ^ 🔑 (no explicit undefined here)
      );
    });

    it("patching others ignores patches for unknown users", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.patchOther(2, { y: 1, z: 2 }); // .setOther() not called yet for actor 2

      expect(p.others).toStrictEqual([]);
    });

    it("patching others", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });
      expect(p.others).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: 2 } },
      ]);

      p.patchOther(2, { y: -2, z: -2 });
      expect(p.others).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: -2, z: -2 } },
      ]);

      p.patchOther(2, { z: undefined });
      expect(p.others).toStrictEqual([
        { connectionId: 2, id: "user-123", presence: { x: 2, y: -2 } },
      ]);
    });

    it("removing connections", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      expect(p.getUser(2)).toStrictEqual({
        connectionId: 2,
        id: "user-123",
        presence: { x: 2, y: 2 },
      });
      p.removeConnection(2);

      expect(p.getUser(2)).toBeUndefined();
      expect(p.others).toStrictEqual([]);

      // Setting other without .setConnection() will have no effect
      p.setOther(2, { x: 2, y: 2 });
      expect(p.getUser(2)).toBeUndefined();
      expect(p.others).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    it("caches immutable results (others)", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      const others1 = p.others;
      const others2 = p.others;
      expect(others1).toBe(others2);

      // These are effectively no-ops
      p.patchOther(2, { x: 2 });
      p.patchOther(2, { y: 2, z: undefined });

      const others3 = p.others;
      expect(others2).toBe(others3); // No observable change!

      const others4 = p.others;
      const others5 = p.others;
      expect(others3).toBe(others4); // Others did not change
      expect(others4).toBe(others5);

      p.patchOther(2, { y: -2 });

      const others6 = p.others;
      const others7 = p.others;
      expect(others5).not.toBe(others6); // Others changed
      expect(others6).toBe(others7);
    });

    it("getUser() returns stable cache results", () => {
      const p = new OthersRef<P, M>();
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      expect(p.getUser(2)).toBe(p.getUser(2));
    });
  });
});
