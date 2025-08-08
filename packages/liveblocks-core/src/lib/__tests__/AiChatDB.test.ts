import type { AiChat, ISODateString } from "../../types/ai";
import { AiChatDB } from "../../AiChatDB";

function iso(s: string): ISODateString {
  return new Date(s).toISOString() as ISODateString;
}

function dummyAiChatData(partial: Partial<AiChat> & Pick<AiChat, "id">): AiChat {
  return {
    id: partial.id,
    title: partial.title ?? `title-${partial.id}`,
    metadata: partial.metadata ?? {},
    createdAt: partial.createdAt ?? iso("2024-01-01T00:00:00Z"),
    lastMessageAt: partial.lastMessageAt,
    deletedAt: partial.deletedAt,
  } as AiChat;
}

describe("AiChatDB", () => {
  test("upsert adds and sorts by lastMessageAt then createdAt (most recent first)", () => {
    const db = new AiChatDB();

    const a = dummyAiChatData({ id: "a", createdAt: iso("2024-01-01T00:00:00Z") });
    const b = dummyAiChatData({ id: "b", createdAt: iso("2024-01-02T00:00:00Z") });
    const c = dummyAiChatData({ id: "c", createdAt: iso("2024-01-01T00:00:00Z"), lastMessageAt: iso("2024-01-03T00:00:00Z") });

    db.upsert(a);
    db.upsert(b);
    db.upsert(c);

    const ids = db.findMany({}).map((ch) => ch.id);
    expect(ids).toEqual(["c", "b", "a"]);
  });

  test("tie-breaker: same timestamps are ordered by id (descending)", () => {
    const db = new AiChatDB();

    const a = dummyAiChatData({ id: "a", createdAt: iso("2024-01-01T00:00:00Z") });
    const b = dummyAiChatData({ id: "b", createdAt: iso("2024-01-01T00:00:00Z") });
    db.upsert(a);
    db.upsert(b);

    const ids = db.findMany({}).map((ch) => ch.id);
    // With equal createdAt, comparator places higher id first
    expect(ids).toEqual(["b", "a"]);
  });

  test("markDeleted removes from sorted list but keeps in map (getEvenIfDeleted)", () => {
    const db = new AiChatDB();
    const x = dummyAiChatData({ id: "x" });
    db.upsert(x);

    expect(db.findMany({}).map((c) => c.id)).toEqual(["x"]);

    db.markDeleted("x");

    expect(db.findMany({})).toEqual([]);
    const stored = db.getEvenIfDeleted("x");
    expect(stored?.id).toBe("x");
    expect(stored?.deletedAt).toBeDefined();

    // Re-marking a deleted chat is a no-op
    const deletedAt = stored!.deletedAt;
    db.markDeleted("x");
    expect(db.getEvenIfDeleted("x")?.deletedAt).toBe(deletedAt);
  });

  test("upsert of a previously deleted chat id is ignored", () => {
    const db = new AiChatDB();
    const y = dummyAiChatData({ id: "y", createdAt: iso("2024-01-01T00:00:00Z") });
    db.upsert(y);
    db.markDeleted("y");

    // Attempt to resurrect with newer timestamps should be ignored
    db.upsert(
      dummyAiChatData({ id: "y", createdAt: iso("2025-01-01T00:00:00Z") })
    );

    expect(db.findMany({})).toEqual([]); // still excluded from list
    const stored = db.getEvenIfDeleted("y");
    expect(stored?.deletedAt).toBeDefined();
    expect(stored?.createdAt).toBe(iso("2024-01-01T00:00:00Z"));
  });

  test("upserting a chat already deleted (incoming deletedAt) stores in map but not in list", () => {
    const db = new AiChatDB();
    const z = dummyAiChatData({ id: "z", deletedAt: iso("2024-01-10T00:00:00Z") });
    db.upsert(z);

    expect(db.findMany({})).toEqual([]);
    expect(db.getEvenIfDeleted("z")?.deletedAt).toBeDefined();
  });

  describe("metadata filtering", () => {
    test("no metadata query returns all non-deleted chats", () => {
      const db = new AiChatDB();
      db.upsert(dummyAiChatData({ id: "m1", metadata: { a: "1" } }));
      db.upsert(dummyAiChatData({ id: "m2", metadata: { b: ["x", "y"] } }));
      db.upsert(dummyAiChatData({ id: "m3", metadata: {} }));
      db.upsert(dummyAiChatData({ id: "m4", metadata: { a: "2" }, deletedAt: iso("2024-01-01T00:00:00Z") }));

      const ids = db.findMany({}).map((c) => c.id);
      expect(ids.sort()).toEqual(["m1", "m2", "m3"].sort());
    });

    test("string exact match for single metadata key", () => {
      const db = new AiChatDB();
      db.upsert(dummyAiChatData({ id: "s1", metadata: { tag: "urgent" } }));
      db.upsert(dummyAiChatData({ id: "s2", metadata: { tag: "normal" } }));
      db.upsert(dummyAiChatData({ id: "s3", metadata: {} }));
      db.upsert(dummyAiChatData({ id: "s4", metadata: { tag: ["urgent"] } as any }));

      const ids = db.findMany({ metadata: { tag: "urgent" } }).map((c) => c.id);
      // Only s1 matches exactly; s4 has array and should NOT match string
      expect(ids).toEqual(["s1"]);
    });

    test("array requires all values present and metadata value must be an array", () => {
      const db = new AiChatDB();
      db.upsert(dummyAiChatData({ id: "a1", metadata: { tag: ["urgent", "p1", "work"] } }));
      db.upsert(dummyAiChatData({ id: "a2", metadata: { tag: ["urgent"] } }));
      db.upsert(dummyAiChatData({ id: "a3", metadata: { tag: "urgent" } as any }));
      db.upsert(dummyAiChatData({ id: "a4", metadata: { tag: ["p1"] } }));

      const ids = db
        .findMany({ metadata: { tag: ["urgent", "p1"] } })
        .map((c) => c.id)
        .sort();
      expect(ids).toEqual(["a1"].sort());
    });

    test("null means key must be absent", () => {
      const db = new AiChatDB();
      db.upsert(dummyAiChatData({ id: "n1", metadata: {} }));
      db.upsert(dummyAiChatData({ id: "n2", metadata: { archived: "yes" } }));
      db.upsert(dummyAiChatData({ id: "n3", metadata: { archived: "" } }));

      const ids = db.findMany({ metadata: { archived: null } }).map((c) => c.id);
      expect(ids.sort()).toEqual(["n1"].sort());
    });

    test("multiple metadata keys are AND-ed", () => {
      const db = new AiChatDB();
      db.upsert(
        dummyAiChatData({ id: "m1", metadata: { team: "alpha", tag: ["urgent", "p1"] } })
      );
      db.upsert(dummyAiChatData({ id: "m2", metadata: { team: "alpha", tag: ["p1"] } }));
      db.upsert(dummyAiChatData({ id: "m3", metadata: { team: "beta", tag: ["urgent", "p1"] } }));
      db.upsert(dummyAiChatData({ id: "m4", metadata: { tag: ["urgent", "p1"] } }));

      const ids = db
        .findMany({ metadata: { team: "alpha", tag: ["urgent", "p1"] } })
        .map((c) => c.id);
      expect(ids).toEqual(["m1"]);
    });

    test("filter respects sorting order of results", () => {
      const db = new AiChatDB();
      db.upsert(
        dummyAiChatData({ id: "r1", metadata: { tag: ["x"] }, createdAt: iso("2024-01-01T00:00:00Z") })
      );
      db.upsert(
        dummyAiChatData({ id: "r2", metadata: { tag: ["x"] }, lastMessageAt: iso("2024-02-01T00:00:00Z") })
      );
      db.upsert(
        dummyAiChatData({ id: "r3", metadata: { tag: ["x"] }, createdAt: iso("2024-01-15T00:00:00Z") })
      );
      db.upsert(dummyAiChatData({ id: "r4", metadata: { tag: ["y"] } }));

      const ids = db.findMany({ metadata: { tag: ["x"] } }).map((c) => c.id);
      expect(ids).toEqual(["r2", "r3", "r1"]);
    });
  });
});



