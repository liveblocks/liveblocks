import type { StorageNotationRoot } from "../storageNotation";
import { storageNotationToLiveObject } from "../storageNotation";

describe("Storage notation", () => {
  const example: StorageNotationRoot = {
    liveblocksType: "LiveObject",
    data: {
      aLiveObject: {
        liveblocksType: "LiveObject",
        data: {
          a: 1,
        },
      },
      aLiveList: {
        liveblocksType: "LiveList",
        data: ["a", "b"],
      },
      aLiveMap: {
        liveblocksType: "LiveMap",
        data: {
          a: 1,
          b: 2,
        },
      },
    },
  };

  it("convert to LiveObject", () => {
    const liveObject = storageNotationToLiveObject(example);

    expect(liveObject.toImmutable()).toEqual({
      aLiveList: ["a", "b"],
      aLiveMap: new Map([
        ["a", 1],
        ["b", 2],
      ]),
      aLiveObject: {
        a: 1,
      },
    });
  });

  it("root must always be a LiveObject", () => {
    const exampleList = example.data.aLiveList;
    expect(() => storageNotationToLiveObject(exampleList as any)).toThrow();
  });

  it("throws when there is missing data", () => {
    const missingData = { liveblocksType: "LiveObject" /* no data field */ };
    expect(() => storageNotationToLiveObject(missingData as any)).toThrow();
  });
});
