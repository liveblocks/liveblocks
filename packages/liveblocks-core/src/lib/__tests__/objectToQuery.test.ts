/* eslint-disable quotes */
import { QueryParser } from "@liveblocks/query-parser";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { objectToQuery, quote } from "../objectToQuery";

describe("objectToQuery", () => {
  test("should convert a simple key/value pair to a query", () => {
    const query = objectToQuery({
      org: "liveblocks:engineering",
    });

    expect(query).toEqual("org:'liveblocks:engineering'");
  });

  test("should convert a nested object with operator to a query", () => {
    const query = objectToQuery({
      org: {
        startsWith: "liveblocks:",
      },
    });

    expect(query).toEqual("org^'liveblocks:'");
  });

  test("should convert an indexed field object to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
        color: null,
      },
    });

    expect(query).toEqual(
      "metadata['status']:'open' metadata['priority']:3 metadata['color']:null metadata['org']^'liveblocks:'"
    );
  });

  test("should convert regular and indexed field objects to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
        color: null,
      },
      resolved: true,
      roomId: {
        startsWith: "engineering:",
      },
    });

    expect(query).toEqual(
      "resolved:true roomId^'engineering:' metadata['status']:'open' metadata['priority']:3 metadata['color']:null metadata['org']^'liveblocks:'"
    );
  });

  test.each([
    "string",
    "string with spaces",
    "string with special characters: !@#$%^&*()",
    '"string with double quotes"',
    "'string with single quotes'",
    "string with 'single' and \"double\" quotes",
  ])("should work with funky string value: %s", (value) => {
    const query = objectToQuery({
      org: value,
      metadata: {
        org: value,
      },
    });

    const expectedValue = quote(value);

    expect(query).toEqual(
      `org:${expectedValue} metadata['org']:${expectedValue}`
    );
  });

  test("will only generate syntactically valid queries", () =>
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string(),
          fc.oneof(
            fc.string(),
            fc.dictionary(fc.string(), fc.string(), { minKeys: 1 })
          ),
          { minKeys: 1 }
        ),
        fc.context(),

        (objValue, ctx) => {
          let query: string;
          try {
            query = objectToQuery(objValue);
          } catch {
            // If there was a parse error, we cannot assert anything reasonable
            // about the result
            return;
          }

          const fields = Object.fromEntries(
            Object.entries(objValue).flatMap(([k, v]) =>
              typeof v === "string" ? [[k, "mixed"] as const] : []
            )
          );
          const indexableFields = Object.fromEntries(
            Object.entries(objValue).flatMap(([k, v]) =>
              typeof v !== "string" ? [[k, "mixed"] as const] : []
            )
          );

          const parser = new QueryParser({
            fields,
            indexableFields,
          });

          ctx.log(`Generated query that did not parse was: →${query}←`);
          expect(() => parser.parse(query)).not.toThrow();
        }
      )
    ));

  test("previous regressions", () => {
    const BS = "\\";
    const SQ = "'";
    const DQ = '"';
    const NEWLINE = "\n";
    expect(BS.length).toEqual(1);
    expect(NEWLINE.length).toEqual(1);
    expect(SQ.length).toEqual(1);
    expect(DQ.length).toEqual(1);

    {
      const query = objectToQuery({
        metadata: { foo: BS },
      });
      expect(query).toEqual(`metadata['foo']:'${BS}${BS}'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + NEWLINE },
      });
      expect(query).toEqual(`metadata['foo']:'${BS}${BS}${BS}n'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + "n" },
      });
      expect(query).toEqual(`metadata['foo']:'${BS}${BS}n'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + "x" },
      });
      expect(query).toEqual(`metadata['foo']:'${BS}${BS}x'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: DQ },
      });
      expect(query).toEqual(`metadata['foo']:'"'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + SQ },
      });
      expect(query).toEqual(`metadata['foo']:"${BS}${BS}'"`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + DQ },
      });
      expect(query).toEqual(`metadata['foo']:'${BS}${BS}"'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: SQ },
      });
      expect(query).toEqual(`metadata['foo']:"'"`);
    }
  });

  test.each([
    "'string with single quotes'",
    '"string with double quotes"',
    '"string with both \'single\' and "double" quotes"',
    "`strings with \\`tick\\` quotes`",
  ])("should work with funky key: %s", (key) => {
    const query = objectToQuery({
      metadata: {
        [key]: "value",
      },
    });

    expect(query).toEqual(`metadata[${quote(key)}]:'value'`);
  });

  test("should avoid injections", () => {
    const query1 = objectToQuery({ foo: '" OR evil:"' });
    //                                 ^^^^^^^^^^^^^ Injection attack with double-quoted strings

    const query2 = objectToQuery({ foo: "' OR evil:'" });
    //                                  ^^^^^^^^^^^^^ Injection attack with single-quoted strings

    expect(query1).toEqual("foo:'\" OR evil:\"'");
    expect(query2).toEqual("foo:\"' OR evil:'\"");
  });
});
