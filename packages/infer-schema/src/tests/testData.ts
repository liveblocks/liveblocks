import type { PlainLsonObject } from "../plainLson";

export const EMPTY: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {},
};

export const BASIC_LIVE_OBJECT: PlainLsonObject = {
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

export const BASIC_MERGE: PlainLsonObject = {
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

export const BASIC_UNMERGEABLE: PlainLsonObject = {
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

export const EMPTY_KEY: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    "": {
      liveblocksType: "LiveObject",
      data: {},
    },
  },
};

export const KEY_WITH_WHITESPACE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    "test key": {
      liveblocksType: "LiveObject",
      data: {},
    },
  },
};

export const RESERVED_KEY = {
  liveblocksType: "LiveObject",
  data: {
    liveblocksType: {
      liveblocksType: "LiveObject",
      data: {},
    },
  },
} as unknown as PlainLsonObject;

export const BRACKET_KEY: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    "d{": {
      liveblocksType: "LiveObject",
      data: {},
    },
    "d]": {
      liveblocksType: "LiveObject",
      data: {},
    },
  },
};

export const EDGE_CASE: PlainLsonObject = {
  liveblocksType: "LiveObject",
  data: {
    "": {
      liveblocksType: "LiveObject",
      data: { "": { liveblocksType: "LiveObject", data: {} } },
    },
  },
};
