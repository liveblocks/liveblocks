import { FULL_ACCESS, Permissions } from "../Permissions";

const P1 = "room:read";
const P2 = "room:write";
const P3 = "comments:read";
// const P4 = "comments:write";

describe("PermissionSet", () => {
  test("empty throws error", () => {
    expect(new Permissions().isEmpty()).toEqual(true);
  });

  test("adding permissions makes it not empty", () => {
    expect(new Permissions().allow("xyz", FULL_ACCESS).isEmpty()).toEqual(
      false
    );
  });

  test("adding permissions makes it not empty", () => {
    expect(new Permissions().allow("xyz", FULL_ACCESS).toJSON()).toEqual({
      xyz: ["room:write", "comments:write"],
    });
  });

  test("throws when no room name", () => {
    expect(() => new Permissions().allow("", []).toJSON()).toThrow(
      "Invalid room name or pattern"
    );
  });

  test("throws when room name too long", () => {
    expect(() =>
      new Permissions()
        .allow("definitely-a-waaaaaaaaaaaaaaaaaaaay-too-long-room-name", [])
        .toJSON()
    ).toThrow("Invalid room name or pattern");
  });

  test("throws when permission list is empty", () => {
    expect(() => new Permissions().allow("foobar", [])).toThrow(
      "Permission list cannot be empty"
    );
  });

  test("throws when room name contains asterisk", () => {
    expect(() => new Permissions().allow("foo*bar", []).toJSON()).toThrow(
      "Invalid room name or pattern"
    );
  });

  test("allows prefixes when room name contains asterisk", () => {
    expect(new Permissions().allow("foobar*", [P1]).toJSON()).toEqual({
      "foobar*": [P1],
    });
  });

  test("setting invalid permissions will throw", () => {
    expect(() =>
      new Permissions()
        .allow(
          "foobar*",
          // @ts-expect-error - Deliberate incorrect string value
          ["x", "y"]
        )
        .toJSON()
    ).toThrow("Not a valid permission: x");
  });

  test("permissions are additive", () => {
    expect(
      new Permissions()
        .allow("foo", [P1])
        .allow("bar", [P2])
        .allow("foo", [P3])
        .toJSON()
    ).toEqual({
      foo: [P1, P3],
      bar: [P2],
    });
  });

  test("permissions are deduped", () => {
    expect(
      new Permissions()
        .allow("r", [P1])
        .allow("r", [P2, P3])
        .allow("r", [P1, P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .toJSON()
    ).toEqual({
      r: [P1, P2, P3],
    });
  });

  test("adding more than 10 permission entries throws", () => {
    const p = new Permissions()
      .allow("room0", [P1])
      .allow("room1", [P1])
      .allow("room2", [P1])
      .allow("room3", [P1])
      .allow("room4", [P1])
      .allow("room5", [P1])
      .allow("room6", [P1])
      .allow("room7", [P1])
      .allow("room8", [P1])
      .allow("room9", [P1]);

    // 11 is still fine
    expect(p.toJSON()).toEqual({
      room0: [P1],
      room1: [P1],
      room2: [P1],
      room3: [P1],
      room4: [P1],
      room5: [P1],
      room6: [P1],
      room7: [P1],
      room8: [P1],
      room9: [P1],
    });

    expect(() => p.allow("one-more-room", [P1])).toThrow(
      "You cannot add permissions for more than 10 rooms in a single token"
    );

    // But adding to an _existing_ entry would be fine
    expect(() => p.allow("room7", [P2])).not.toThrow();
  });

  test("sealing", () => {
    const p = new Permissions().allow("r", [P1]).allow("r", [P2, P3]);

    p.seal();

    // Cannot seal twice
    expect(() => p.seal()).toThrow(
      "You cannot reuse Permissions instances. Please create a new instance every time."
    );

    // After sealing, you cannot add more permissions
    expect(() => p.allow("r", [P1])).toThrow(
      "You can no longer change these permissions."
    );
  });
});
