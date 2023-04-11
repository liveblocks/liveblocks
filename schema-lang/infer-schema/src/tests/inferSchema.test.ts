import { parse } from "@liveblocks/schema";
import fc from "fast-check";

import type { PlainLsonObject } from "..";
import { inferSchema } from "..";
import { plainLsonArbitraries } from "./arbitraries";
import {
  BASIC_LIVE_OBJECT,
  BASIC_MERGE,
  BASIC_UNMERGEABLE,
  BRACKET_KEY,
  CIRCULAR_MERGE,
  EMPTY,
  EMPTY_KEY,
  KEY_WITH_WHITESPACE,
  RESERVED_KEY,
} from "./testData";

describe("inferSchema", () => {
  const testCases = {
    EMPTY,
    BASIC_MERGE,
    BASIC_UNMERGEABLE,
    BASIC_LIVE_OBJECT,
    RESERVED_KEY,
    BRACKET_KEY,
    KEY_WITH_WHITESPACE,
    EMPTY_KEY,
    CIRCULAR_MERGE,
  };

  Object.entries(testCases).forEach(([name, storageData]) => {
    it(`correctly infers the "${name}" schema`, () => {
      const inferredText = inferSchema(storageData);
      expect(inferredText).toMatchSnapshot();

      // Now try to parse the inferred text
      expect(() => {
        try {
          parse(inferredText);
        } catch (e) {
          if (/not yet supported/.test((e as Error).message)) {
            // Some language features are not yet supported in the
            // parser/checker, but will be in the future. If the error message
            // contains "not supported yet", we'll safely ignore this error and
            // assume the rest of the generation happened fine.
            return;
          }
          throw e;
        }
      }).not.toThrow();
    });
  });

  it("always generates a valid schema that matches the plain lson or includes a fixme comment", () => {
    fc.assert(
      fc.property(
        plainLsonArbitraries.object,

        (storageData) => {
          const schemaText = inferSchema(storageData as PlainLsonObject);
          if (!schemaText.includes("# FIXME: ")) {
            expect(() => parse(schemaText)).not.toThrow();
          }
        }
      )
    );
  });
});
