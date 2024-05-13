import { QueryParser } from "@liveblocks/query-parser";
import * as fc from "fast-check";

import { objectToQuery } from "../objectToQuery";

describe("objectToQuery", () => {
  it("should convert a simple key/value pair to a query", () => {
    const query = objectToQuery({
      org: "liveblocks:engineering",
    });

    expect(query).toEqual('org:"liveblocks:engineering"');
  });

  it("should convert a nested object with operator to a query", () => {
    const query = objectToQuery({
      org: {
        startsWith: "liveblocks:",
      },
    });

    expect(query).toEqual('org^"liveblocks:"');
  });

  it("should convert an indexed field object to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
      },
    });

    expect(query).toEqual(
      'metadata["status"]:"open" AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"'
    );
  });

  it("should convert regular and indexed field objects to a query", () => {
    const query = objectToQuery({
      metadata: {
        status: "open",
        priority: 3,
        org: {
          startsWith: "liveblocks:",
        },
      },
      resolved: true,
      roomId: {
        startsWith: "engineering:",
      },
    });

    expect(query).toEqual(
      'resolved:true AND roomId^"engineering:" AND metadata["status"]:"open" AND metadata["priority"]:3 AND metadata["org"]^"liveblocks:"'
    );
  });

  it.each([
    "string",
    "string with spaces",
    "string with special characters: !@#$%^&*()",
    "'string with single quotes'",
    '"string with double quotes"',
  ])("should work with funky string value: %s", (value) => {
    const query = objectToQuery({
      org: value,
      metadata: {
        org: value,
      },
    });

    const expectedValue = JSON.stringify(value);

    expect(query).toEqual(
      `org:${expectedValue} AND metadata["org"]:${expectedValue}`
    );
  });

  it("will only generate syntactically valid queries", () =>
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

  it.each(["'string with single quotes'", '"string with double quotes"'])(
    "should work with funky key: %s",
    (key) => {
      const query = objectToQuery({
        metadata: {
          [key]: "value",
        },
      });

      expect(query).toEqual(`metadata[${JSON.stringify(key)}]:"value"`);
    }
  );

  it("should avoid injections", () => {
    const query = objectToQuery({ foo: '" OR evil:"' });
    //                                 ^^^^^^^^^^^^^ Injection attack with double-quoted strings

    const query2 = objectToQuery({ foo: "' OR evil:'" });
    //                                  ^^^^^^^^^^^^^ Injection attack with single-quoted strings

    expect(query).toEqual('foo:"\\" OR evil:\\""');
    expect(query2).toEqual("foo:\"' OR evil:'\"");
  });
});
