import { ThreadDB } from "../ThreadDB";
import { dummyThreadData } from "./_dummies";

describe("ThreadDB", () => {
  test("empty db", () => {
    const db = new ThreadDB();
    expect(db.get("th_123")).toEqual(undefined);
  });

  test("automatically keeps threads sorted", () => {
    const db = new ThreadDB();

    const th1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-10-08"),
    });
    const th2 = dummyThreadData({
      id: "th_def",
      roomId: "room2",
      createdAt: new Date("2024-10-09"),
    });
    const th3 = dummyThreadData({
      id: "th_klm",
      roomId: "room1",
      createdAt: new Date("2024-10-10"),
    });
    const th4 = dummyThreadData({
      id: "th_pqr",
      roomId: "room3",
      createdAt: new Date("2024-10-11"),
      deletedAt: new Date(),
    });
    // XXX Add this test: if comments is [], it should get implicitly marked deleted when added to the DB
    // const th5 = dummyThreadData({
    //   id: "th_xyz",
    //   roomId: "room3",
    //   createdAt: new Date("2024-10-11"),
    //   comments: [], // Empty comments array will also count as deleted
    // });

    db.add(th1);
    db.add(th2);
    db.add(th3);
    db.add(th4);
    // db.add(th5);

    expect(db.get("th_abc")!.id).toEqual("th_abc");
    expect(db.get("th_def")!.id).toEqual("th_def");
    expect(db.get("th_klm")!.id).toEqual("th_klm");
    expect(db.get("th_pqr")).toEqual(undefined);
    expect(db.getEvenIfDeleted("th_pqr")!.id).toEqual("th_pqr");
    expect(db.get("th_nonexisting")).toEqual(undefined);

    expect(db.findMany({ roomId: "room0" }, "asc")).toEqual([]);
    expect(db.findMany({ roomId: "room1" }, "asc")).toEqual([th1, th3]);
    expect(db.findMany({ roomId: "room1" }, "desc")).toEqual([th3, th1]);
    expect(db.findMany({ roomId: "room2" }, "asc")).toEqual([th2]);
    expect(db.findMany({ roomId: "room3" }, "asc")).toEqual([
      /* th4 is explicitly deleted */
      /* th5 is also (implicitly) deleted */
    ]);
  });
});
