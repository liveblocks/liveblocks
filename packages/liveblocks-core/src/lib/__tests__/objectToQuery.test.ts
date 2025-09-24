/* eslint-disable quotes */
import { QueryParser } from "@liveblocks/query-parser";
import * as fc from "fast-check";
import { assertEq } from "tosti";
import { describe, test } from "vitest";

import { objectToQuery, quote } from "../objectToQuery";

describe("objectToQuery", () => {
  test("should convert a simple key/value pair to a query", () => {
    const query = objectToQuery({
      org: "liveblocks:engineering",
    });

    assertEq(query, "org:'liveblocks:engineering'");
  });

  test("should convert a nested object with operator to a query", () => {
    const query = objectToQuery({
      org: {
        startsWith: "liveblocks:",
      },
    });

    assertEq(query, "org^'liveblocks:'");
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

    assertEq(
      query,
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

    assertEq(
      query,
      "resolved:true roomId^'engineering:' metadata['status']:'open' metadata['priority']:3 metadata['color']:null metadata['org']^'liveblocks:'"
    );
  });

  test("should convert an indexed field object with number operators to a query", () => {
    const query = objectToQuery({
      metadata: {
        priority: 3,
        posX: {
          gt: 100,
          lt: 200,
        },
        level: {
          gt: 25,
        },
        volume: {
          lt: 50,
        },
        age: {
          gte: 18,
          lte: 65,
        },
      },
    });

    expect(query).toEqual(
      "metadata['priority']:3 metadata['posX']<200 metadata['posX']>100 metadata['level']>25 metadata['volume']<50 metadata['age']>=18 metadata['age']<=65"
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

    assertEq(query, `org:${expectedValue} metadata['org']:${expectedValue}`);
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
          parser.parse(query);
        }
      )
    ));

  test("previous regressions", () => {
    const BS = "\\";
    const SQ = "'";
    const DQ = '"';
    const NEWLINE = "\n";
    assertEq(BS.length, 1);
    assertEq(NEWLINE.length, 1);
    assertEq(SQ.length, 1);
    assertEq(DQ.length, 1);

    {
      const query = objectToQuery({
        metadata: { foo: BS },
      });
      assertEq(query, `metadata['foo']:'${BS}${BS}'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + NEWLINE },
      });
      assertEq(query, `metadata['foo']:'${BS}${BS}${BS}n'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + "n" },
      });
      assertEq(query, `metadata['foo']:'${BS}${BS}n'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + "x" },
      });
      assertEq(query, `metadata['foo']:'${BS}${BS}x'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: DQ },
      });
      assertEq(query, `metadata['foo']:'"'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + SQ },
      });
      assertEq(query, `metadata['foo']:"${BS}${BS}'"`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: BS + DQ },
      });
      assertEq(query, `metadata['foo']:'${BS}${BS}"'`);
    }

    {
      const query = objectToQuery({
        metadata: { foo: SQ },
      });
      assertEq(query, `metadata['foo']:"'"`);
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

    assertEq(query, `metadata[${quote(key)}]:'value'`);
  });

  test("should avoid injections", () => {
    const query1 = objectToQuery({ foo: '" OR evil:"' });
    //                                 ^^^^^^^^^^^^^ Injection attack with double-quoted strings

    const query2 = objectToQuery({ foo: "' OR evil:'" });
    //                                  ^^^^^^^^^^^^^ Injection attack with single-quoted strings

    assertEq(query1, "foo:'\" OR evil:\"'");
    assertEq(query2, "foo:\"' OR evil:'\"");
  });
});
