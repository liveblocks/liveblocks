import { Liveblocks } from "../new-auth";

const P1 = "room:read";
const P2 = "room:write";
const P3 = "comments:read";
// const P4 = "comments:write";

function makeSession(options?: { secret?: string }) {
  const client = new Liveblocks({
    secret: options?.secret ?? "sk_testingtesting",
  });
  return client.prepareSession("user-123");
}

describe("authorization (new API)", () => {
  test("throws when no secret key is provided", () => {
    expect(() =>
      makeSession({
        // @ts-expect-error - Deliberately not a string value
        secret: 123,
      })
    ).toThrow(
      'Invalid value for field "secret". Secret keys must start with "sk_". Please provide the secret key from your Liveblocks dashboard at https://liveblocks.io/dashboard/apikeys.'
    );
  });

  test("throws when an invalid secret key is provided", () => {
    expect(() =>
      makeSession({
        secret: "pk_thisisntsecret",
      })
    ).toThrow(
      'Invalid value for field "secret". Secret keys must start with "sk_". Please provide the secret key from your Liveblocks dashboard at https://liveblocks.io/dashboard/apikeys.'
    );
  });

  test("default set has no permissions", () => {
    expect(makeSession().hasPermissions()).toEqual(false);
  });

  test("adding permissions makes it have permissions", () => {
    const session = makeSession();
    expect(session.allow("xyz", session.FULL_ACCESS).hasPermissions()).toEqual(
      true
    );
  });

  test("can assign FULL_ACCESS permissions", () => {
    const session = makeSession();
    expect(
      session.allow("xyz", session.FULL_ACCESS).serializePermissions()
    ).toEqual({
      xyz: ["room:write", "comments:write"],
    });
  });

  test("can assign READ_ACCESS permissions", () => {
    const session = makeSession();
    expect(
      session.allow("xyz", session.READ_ACCESS).serializePermissions()
    ).toEqual({
      xyz: ["room:read", "room:presence:write", "comments:read"],
    });
  });

  test("throws when no room name", () => {
    expect(() => makeSession().allow("", []).serializePermissions()).toThrow(
      "Invalid room name or pattern"
    );
  });

  test("throws when room name too long", () => {
    expect(() =>
      makeSession().allow("a".repeat(129), []).serializePermissions()
    ).toThrow("Invalid room name or pattern");
  });

  test("throws when permission list is empty", () => {
    expect(() => makeSession().allow("foobar", [])).toThrow(
      "Permission list cannot be empty"
    );
  });

  test("throws when room name contains asterisk", () => {
    expect(() =>
      makeSession().allow("foo*bar", []).serializePermissions()
    ).toThrow("Invalid room name or pattern");
  });

  test("allows prefixes when room name contains asterisk", () => {
    expect(makeSession().allow("foobar*", [P1]).serializePermissions()).toEqual(
      {
        "foobar*": [P1],
      }
    );
  });

  test("setting invalid permissions will throw", () => {
    expect(() =>
      makeSession()
        .allow(
          "foobar*",
          // @ts-expect-error - Deliberate incorrect string value
          ["x", "y"]
        )
        .serializePermissions()
    ).toThrow("Not a valid permission: x");
  });

  test("permissions are additive", () => {
    expect(
      makeSession()
        .allow("foo", [P1])
        .allow("bar", [P2])
        .allow("foo", [P3])
        .serializePermissions()
    ).toEqual({
      foo: [P1, P3],
      bar: [P2],
    });
  });

  test("permissions are deduped", () => {
    expect(
      makeSession()
        .allow("r", [P1])
        .allow("r", [P2, P3])
        .allow("r", [P1, P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .allow("r", [P3])
        .serializePermissions()
    ).toEqual({
      r: [P1, P2, P3],
    });
  });

  test("adding more than 10 permission entries throws", () => {
    const p = makeSession()
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
    expect(p.serializePermissions()).toEqual({
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
    const p = makeSession().allow("r", [P1]).allow("r", [P2, P3]);

    p.seal();

    // Cannot seal twice
    expect(() => p.seal()).toThrow(
      "You cannot reuse Session instances. Please create a new session every time."
    );

    // After sealing, you cannot add more permissions
    expect(() => p.allow("r", [P1])).toThrow(
      "You can no longer change these permissions."
    );
  });
});
