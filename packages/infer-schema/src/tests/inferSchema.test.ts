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
  };

  Object.entries(testCases).forEach(([name, storageData]) => {
    it(`correctly infers the "${name}" schema`, () => {
      expect(inferSchema(storageData)).toMatchSnapshot();
    });
  });

  describe("reject non-representable storage data", () => {
    it("rejects storage data with empty keys", () => {
      expect(() => inferSchema(EMPTY_KEY)).toThrowError(
        "Invalid property key: cannot be empty"
      );
    });

    it("rejects storage data with reserved keys", () => {
      expect(() => inferSchema(RESERVED_KEY)).toThrowError(
        "Invalid property key: cannot be a reserved name"
      );
    });

    it("rejects storage data with keys containing whitespace", () => {
      expect(() => inferSchema(KEY_WITH_WHITESPACE)).toThrowError(
        "Invalid property key: cannot contain whitespace"
      );
    });

    it("rejects storage data keys containing forbidden characters", () => {
      expect(() => inferSchema(BRACKET_KEY)).toThrowError(
        "Invalid property key: can only contain alphanumeric characters and underscores"
      );
    });
  });

  it("always generates a valid schema that matches the plain lson or throws a property rejection error", () => {
    fc.assert(
      fc.property(plainLsonArbitraries.object, (storageData) => {
        let schemaText: string;
        try {
          schemaText = inferSchema(storageData as PlainLsonObject);
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          expect(error.message).toMatch(/^Invalid property key:/);
          return;
        }

        expect(() => parse(schemaText)).not.toThrow();
        // TODO: Ensure generates schema actually matches the inputs
      })
    );
  });
});
