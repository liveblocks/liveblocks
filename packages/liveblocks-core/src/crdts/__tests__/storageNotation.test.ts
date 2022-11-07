import type { PlainLsonObject } from "../storageNotation";
import { storageNotationToLiveObject } from "../storageNotation";

describe("storageNotation", () => {
  it("convert to LiveObject", () => {
    const example: PlainLsonObject = {
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

    const liveObject = storageNotationToLiveObject(example);

    expect(liveObject._toImmutable()).toEqual({
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
});
