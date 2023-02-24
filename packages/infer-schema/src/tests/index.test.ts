import { parse } from "@liveblocks/schema";

import type { PlainLsonObject } from "..";
import { inferSchema } from "..";

const EMPTY: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {},
};

const BASIC_LIVE_OBJECT: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    fills: {
      liveblocksType: "LiveObject",
      data: {
        mesh: "#981515",
        sole: "#808960",
        stripes: "#e3fccb",
        laces: "#c3f4bb",
      },
    },
    strokes: {
      liveblocksType: "LiveObject",
      data: {
        mesh: "#aa88ff",
        sole: "#800000",
        laces: "#00ff00",
      },
    },
  },
};

const BASIC_MERGE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    fills: {
      liveblocksType: "LiveObject",
      data: {
        position: { x: 0, y: 0 },
        sole: "#808960",
        stripes: "#e3fccb",
        laces: "#c3f4bb",
      },
    },
    strokes: {
      liveblocksType: "LiveObject",
      data: {
        position: { x: 1.4, y: 4.2 },
        sole: "#800000",
        laces: "#00ff00",
      },
    },
  },
};

const BASIC_UNMERGEABLE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    fills: {
      liveblocksType: "LiveObject",
      data: {
        mesh: { a: 1 },
        sole: "#808960",
        stripes: "#e3fccb",
        laces: "#c3f4bb",
      },
    },
    strokes: {
      liveblocksType: "LiveObject",
      data: {
        mesh: { a: "something" },
        sole: "#800000",
        laces: "#00ff00",
      },
    },
  },
};

describe("inferType", () => {
  const testCases = {
    EMPTY,
    BASIC_MERGE,
    BASIC_UNMERGEABLE,
    BASIC_LIVE_OBJECT,
  };

  Object.entries(testCases).forEach(([name, storageData]) => {
    it(`correctly infers the "${name}" schema`, () => {
      const schemaText = inferSchema(storageData);
      expect(() => parse(schemaText)).not.toThrow();

      // TODO: Ensure generates schema actually matches the input

      expect(schemaText).toMatchSnapshot();
    });
  });
});
