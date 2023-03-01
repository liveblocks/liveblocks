import fc from "fast-check";

const plainLsonPropertyArbitrary = fc
  .string()
  .filter((key) => key !== "liveblocksType");

export const plainLsonJsonArbitraries = fc.letrec((tie) => ({
  // array: fc.array(tie("value")),
  value: fc.oneof(tie("scalar"), tie("object")), // , tie("array")
  object: fc.dictionary(plainLsonPropertyArbitrary, tie("value"), {
    maxKeys: 10,
  }),
  scalar: fc.oneof(fc.string(), fc.float(), fc.boolean(), fc.integer()),
}));

export const plainLsonArbitraries = fc.letrec((tie) => ({
  /*
  list: fc.record({
    liveblocksType: fc.constant("LiveList"),
    data: fc.array(tie("value")),
  }),
  map: fc.record({
    liveblocksType: fc.constant("LiveMap"),
    data: fc.dictionary(plainLsonPropertyArbitrary, tie("value")),
  }),
  */
  object: fc.record({
    liveblocksType: fc.constant("LiveObject"),
    data: fc.dictionary(plainLsonPropertyArbitrary, tie("value")),
  }),
  value: fc.oneof(
    { depthSize: 1 },
    plainLsonJsonArbitraries.value,
    tie("object")
  ), // , tie("list"), tie("map")
}));
