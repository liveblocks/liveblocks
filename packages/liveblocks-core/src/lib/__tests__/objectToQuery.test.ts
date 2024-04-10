import { objectToQuery } from "../objectToQuery";

describe("objectToQuery", () => {
  it("should convert a simple key/value pair to a query", () => {
    const query = objectToQuery({
      org: "liveblocks:engineering",
    });

    expect(query).toEqual('org:"liveblocks:engineering"');
  });

  it("should convert a nested object with operator to a query", () => {
    const query = objectToQuery({
      org: {
        startsWith: "liveblocks:",
      },
    });

    expect(query).toEqual('org^"liveblocks:"');
  });

  it("should convert an indexed field object to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
      },
    });

    expect(query).toEqual(
      'metadata["status"]:"open" AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"'
    );
  });

  it("should convert regular and indexed field objects to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
      },
      resolved: true,
      roomId: {
        startsWith: "engineering:",
      },
    });

    expect(query).toEqual(
      'resolved:true AND roomId^"engineering:" AND metadata["status"]:"open" AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"'
    );
  });
});
