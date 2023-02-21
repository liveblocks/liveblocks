import { inferStorageType } from "..";
import { inferSchema, schemaToAst } from "../schema";
import { PlainLsonObject } from "../types";
import { prettify } from "@liveblocks/schema/src/prettify";

const EMPTY: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {},
};

const SINGLE_SCALAR_ATTRIBUTE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    a: 1,
  },
};

const SINGLE_LIVE_OBJECT_ATTRIBUTE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    a: {
      liveblocksType: "LiveObject",
      data: {
        name: "John",
      },
    },
  },
};

const BASIC_OBJECT: PlainLsonObject = {
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

describe("inferType", () => {
  const testCases = {
    EMPTY,
    SINGLE_SCALAR_ATTRIBUTE,
    SINGLE_LIVE_OBJECT_ATTRIBUTE,
    BASIC_OBJECT,
  };

  Object.entries(testCases).forEach(([name, schema]) => {
    it(`correctly infers the "${name}" type`, () => {
      expect(inferStorageType(schema)).toMatchSnapshot();
    });

    it(`correctly infers the "${name}" schema`, () => {
      expect(inferSchema(inferStorageType(schema))).toMatchSnapshot();
    });

    it(`correctly infers the "${name}" schema ast`, () => {
      expect(
        schemaToAst(inferSchema(inferStorageType(schema)))
      ).toMatchSnapshot();
    });

    // Just here for debugging
    it(`correctly infers the "${name}" schema text`, () => {
      expect(
        prettify(schemaToAst(inferSchema(inferStorageType(schema))))
      ).toMatchSnapshot();
    });
  });
});
