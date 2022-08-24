import { Presence } from "../Presence";

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

describe("Presence", () => {
  it("empty", () => {
    const p = new Presence({ x: 0, y: 0, z: undefined });
    expect(p.toImmutable()).toStrictEqual({
      me: { x: 0, y: 0 },
      others: [],
    });
  });

  describe('Tracking "me"', () => {
    it("patching me", () => {
      const p = new Presence<P, never>({ x: 0, y: 0 });
      p.patchMe({ y: 1, z: 2 });

      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 1, z: 2 },
        others: [],
      });
    });

    it("patching me with undefineds deletes keys", () => {
      const p = new Presence<P, never>({ x: 1, y: 2 });
      p.patchMe({ x: undefined });
      expect(p.me).toStrictEqual({ y: 2 });
      p.patchMe({ y: undefined });
      expect(p.me).toStrictEqual({});
      p.patchMe({ z: undefined });
      expect(p.me).toStrictEqual({});
    });
  });

  describe('Tracking "others"', () => {
    it("setting alone is not enough other", () => {
      const p = new Presence<P, M>({
        x: 0,
        y: 0,
      });
      p.setOther(2, { x: 1, y: 1 });

      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 0 },
        others: [], // NOTE: Even though .setOther() is called, this is still empty!
      });

      // The "others" will only be populated if both connection and presence
      // information is known for this user. Normally, this information is
      // known before the .setOther() call is made, unlike how this test case
      // is structured.
      p.setConnection(2, "user-123", undefined);
      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 0 },
        others: [{ x: 1, y: 1 }],
      });
    });

    it("setting other", () => {
      const p = new Presence<P, M>({ x: 0, y: 0 });
      p.setConnection(2, "user-123", undefined);
      p.setConnection(3, "user-567", undefined);

      p.setOther(2, { x: 2, y: 2 });
      p.setOther(3, { x: 3, y: 3 });
      p.setOther(2, { x: -2, y: -2 });

      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 0 },
        others: [
          { x: -2, y: -2 },
          { x: 3, y: 3 },
        ],
      });
    });

    it("setting others removes explicitly-undefined keys", () => {
      const p = new Presence<P, M>({ x: 0, y: 0 });
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2, z: undefined });
      //                             ^^^^^^^^^ 🔑

      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 0 },
        others: [{ x: 2, y: 2 }],
        //                   ^ 🔑 (no explicit undefined here)
      });
    });

    it("patching others ignores patches for unknown users", () => {
      const p = new Presence<P, M>({ x: 0, y: 0 });
      p.setConnection(2, "user-123", undefined);
      p.patchOther(2, { y: 1, z: 2 }); // .setOther() not called yet for actor 2

      expect(p.toImmutable()).toStrictEqual({
        me: { x: 0, y: 0 },
        others: [],
      });
    });

    it("patching others", () => {
      const p = new Presence<P, M>({ x: 1, y: 2 });
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });
      expect(p.toImmutable().others).toStrictEqual([{ x: 2, y: 2 }]);

      p.patchOther(2, { y: -2, z: -2 });
      expect(p.toImmutable().others).toStrictEqual([{ x: 2, y: -2, z: -2 }]);

      p.patchOther(2, { z: undefined });
      expect(p.toImmutable().others).toStrictEqual([{ x: 2, y: -2 }]);
    });

    it("removing connections", () => {
      const p = new Presence<P, M>({ x: 1, y: 2 });
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      expect(p.getUser(2)).toStrictEqual({
        connectionId: 2,
        id: "user-123",
        info: undefined,
        presence: { x: 2, y: 2 },
      });
      p.removeConnection(2);

      expect(p.getUser(2)).toBeUndefined();
      expect(p.toImmutable().others).toStrictEqual([]);

      // Setting other without .setConnection() will have no effect
      p.setOther(2, { x: 2, y: 2 });
      expect(p.getUser(2)).toBeUndefined();
      expect(p.toImmutable().others).toStrictEqual([]);
    });
  });

  describe("caching", () => {
    it("caches immutable results", () => {
      const p = new Presence<P, M>({ x: 0, y: 0 });
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      const imm1 = p.toImmutable();
      const imm2 = p.toImmutable();
      expect(imm1).toBe(imm2);

      // These are effectively no-ops
      p.patchMe({ x: 0 });
      p.patchMe({ y: 0, z: undefined });
      p.patchOther(2, { x: 2 });
      p.patchOther(2, { y: 2, z: undefined });

      const imm3 = p.toImmutable();
      expect(imm2).toBe(imm3); // No observable change!

      p.patchMe({ y: -1 });

      const imm4 = p.toImmutable();
      const imm5 = p.toImmutable();
      expect(imm3).not.toBe(imm4);
      expect(imm4).toBe(imm5);

      p.patchOther(2, { y: -2 });

      const imm6 = p.toImmutable();
      const imm7 = p.toImmutable();
      expect(imm5).not.toBe(imm6);
      expect(imm6).toBe(imm7);
    });

    it("getUser() returns stable cache results", () => {
      const p = new Presence<P, M>({ x: 0, y: 0 });
      p.setConnection(2, "user-123", undefined);
      p.setOther(2, { x: 2, y: 2 });

      expect(p.me).toBe(p.me);
      expect(p.getUser(2)).toBe(p.getUser(2));
    });
  });
});
