import { inferStorageType } from "..";
import { inferSchema, inferredSchemaToAst } from "../schema";
import { PlainLsonObject } from "../types";
import { prettify } from "@liveblocks/schema/src/prettify";

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
        mesh: { b: 1 },
        sole: "#808960",
        stripes: "#e3fccb",
        laces: "#c3f4bb",
      },
    },
    strokes: {
      liveblocksType: "LiveObject",
      data: {
        mesh: { a: 1 },
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

  Object.entries(testCases).forEach(([name, schema]) => {
    /*
    it(`correctly infers the "${name}" type`, () => {
      expect(inferStorageType(schema)).toMatchSnapshot();
    });

    it(`correctly infers the "${name}" schema`, () => {
      expect(inferSchema(inferStorageType(schema))).toMatchSnapshot();
    });

    it(`correctly infers the "${name}" schema ast`, () => {
      expect(
        inferredSchemaToAst(inferSchema(inferStorageType(schema)))
      ).toMatchSnapshot();
    });
    */

    it(`correctly infers the "${name}" schema`, () => {
      expect(
        prettify(inferredSchemaToAst(inferSchema(inferStorageType(schema))))
      ).toMatchSnapshot();
    });
  });
});
