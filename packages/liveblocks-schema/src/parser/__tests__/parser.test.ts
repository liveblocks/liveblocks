import * as fc from "fast-check";

import * as ast from "../../ast";
import { parseDocument as parse } from "..";
import { expectDocument } from "./helpers";

describe("syntactic parser", () => {
  it("fails on all non-valid inputs", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((value) => typeof value !== "string"),
        fc.anything(),

        (arg1, arg2) => {
          expect(() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (parse as any)(arg1, arg2)
          ).toThrow();
        }
      )
    );
  });

  it("rejects all non-valid documents", () => {
    fc.assert(
      fc.property(
        // NOTE: This test assumes that fast-check will not magically generate
        // a syntactically valid schema text. There is too much entropy for
        // that to happen :)
        fc.string(),

        (input) => {
          expect(() => parse(input as string)).toThrow();
        }
      )
    );
  });

  it("minimal document", () => {
    expectDocument(
      `
      type Foo {
        cx: Float
        cy: Float
        r: Float
      }

      type Foo {          // Double type defs are syntactically valid
        version: Int
        version: Int      // Double field defs are syntactically valid
        mycircle?: LiveObject<Bar>
        //                    ^^^ Will parse the syntax, even though semantically incorrect
        someField: _undefinedThing_
      }

      type abc {}         // Lowercased type names are syntactically valid
      `,

      ast.document([
        ast.objectTypeDefinition(ast.typeName("Foo"), [
          ast.fieldDef(ast.identifier("cx"), false, ast.floatType()),
          ast.fieldDef(ast.identifier("cy"), false, ast.floatType()),
          ast.fieldDef(ast.identifier("r"), false, ast.floatType()),
        ]),

        ast.objectTypeDefinition(ast.typeName("Foo"), [
          ast.fieldDef(ast.identifier("version"), false, ast.intType()),
          ast.fieldDef(ast.identifier("version"), false, ast.intType()),
          ast.fieldDef(
            ast.identifier("mycircle"),
            true,
            ast.typeRef(ast.typeName("Bar"), true)
          ),
          ast.fieldDef(
            ast.identifier("someField"),
            false,
            ast.typeRef(ast.typeName("_undefinedThing_"), false)
          ),
        ]),

        ast.objectTypeDefinition(ast.typeName("abc"), []),
      ])
    );
  });
});
