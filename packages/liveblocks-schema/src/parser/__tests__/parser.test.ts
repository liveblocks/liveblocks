import * as fc from "fast-check";

import * as ast from "../../ast";
import { parseDocument as parse } from "..";
import { expectDocument, expectLegacyDocument } from "./helpers";

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

  it("minimal document (legacy parse mode)", () => {
    expectLegacyDocument(
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
        list: LiveList<Bar>
        //             ^^^ Will parse the syntax, even though semantically incorrect
        map: LiveMap<String, LiveList<LiveMap<Bar[], Qux>[]>>
        //                                    ^^^^^ Will parse the syntax, even though semantically incorrect
      }

      type abc {}         // Lowercased type names are syntactically valid
      `,

      ast.document([
        ast.objectTypeDefinition(
          ast.typeName("Foo"),
          [
            ast.fieldDef(ast.identifier("cx"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("cy"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("r"), false, ast.numberType()),
          ],
          null,
          false /* always false during the parsing phase */
        ),

        ast.objectTypeDefinition(
          ast.typeName("Foo"),
          [
            ast.fieldDef(ast.identifier("version"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("version"), false, ast.numberType()),
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

            ast.fieldDef(
              ast.identifier("list"),
              false,
              ast.liveListType(ast.typeRef(ast.typeName("Bar"), false))
            ),

            ast.fieldDef(
              ast.identifier("map"),
              false,
              ast.liveMapType(
                ast.stringType(),
                ast.liveListType(
                  ast.arrayType(
                    ast.liveMapType(
                      ast.arrayType(ast.typeRef(ast.typeName("Bar"), false)),
                      ast.typeRef(ast.typeName("Qux"), false)
                    )
                  )
                )
              )
            ),
          ],
          null,
          false /* always false during the parsing phase */
        ),

        ast.objectTypeDefinition(
          ast.typeName("abc"),
          [],
          null,
          false /* always false during the parsing phase */
        ),
      ])
    );
  });

  it("minimal document (normal parse mode)", () => {
    expectDocument(
      `
      type Foo {
        cx: number
        cy: number
        r: number
      }

      type Foo {          // Double type defs are syntactically valid
        version: number
        version: number      // Double field defs are syntactically valid
        mycircle?: LiveObject<Bar>
        //                    ^^^ Will parse the syntax, even though semantically incorrect
        someField: _undefinedThing_
        list: LiveList<Bar>
        //             ^^^ Will parse the syntax, even though semantically incorrect
        map: LiveMap<string, LiveList<LiveMap<Bar[], Qux>[]>>
        //                                    ^^^^^ Will parse the syntax, even though semantically incorrect
      }

      type abc {}         // Lowercased type names are syntactically valid
      `,

      ast.document([
        ast.objectTypeDefinition(
          ast.typeName("Foo"),
          [
            ast.fieldDef(ast.identifier("cx"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("cy"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("r"), false, ast.numberType()),
          ],
          null,
          false /* always false during the parsing phase */
        ),

        ast.objectTypeDefinition(
          ast.typeName("Foo"),
          [
            ast.fieldDef(ast.identifier("version"), false, ast.numberType()),
            ast.fieldDef(ast.identifier("version"), false, ast.numberType()),
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

            ast.fieldDef(
              ast.identifier("list"),
              false,
              ast.liveListType(ast.typeRef(ast.typeName("Bar"), false))
            ),

            ast.fieldDef(
              ast.identifier("map"),
              false,
              ast.liveMapType(
                ast.stringType(),
                ast.liveListType(
                  ast.arrayType(
                    ast.liveMapType(
                      ast.arrayType(ast.typeRef(ast.typeName("Bar"), false)),
                      ast.typeRef(ast.typeName("Qux"), false)
                    )
                  )
                )
              )
            ),
          ],
          null,
          false /* always false during the parsing phase */
        ),

        ast.objectTypeDefinition(
          ast.typeName("abc"),
          [],
          null,
          false /* always false during the parsing phase */
        ),
      ])
    );
  });

  it("large document (snapshot test)", () => {
    expect(
      parse(
        `
      # Comment
      // Another comment

      type Color { r: number, g: number, b: number }

      type Circle {
        cx: number
        cy: number
        r: number
        fill?: Color[]
        stroke?: Color
        third?: { r: number, g: number, b: number }[]
      }

      type Foo {}
      type Foo {          // Double type defs are syntactically valid
        version: number
        version: number      // Double field defs are syntactically valid
        mycircle?: LiveObject<Bar>
        //                    ^^^ Will parse the syntax, even though semantically incorrect
        someField: _undefinedThing_
        list: LiveList<LiveMap<number[], LiveList<Bar[][]>>>
        //                     ^^^^^^^^ Will parse, but is invalid
      }

      type abc {}         // Lowercased type names are syntactically valid
      `
      )
    ).toMatchSnapshot();
  });

  it("large legacy document (snapshot test)", () => {
    expect(
      parse(
        `
      # Comment
      // Another comment

      type Color { r: Int, g: Int, b: Int }

      type Circle {
        cx: Float
        cy: Float
        r: Float
        fill?: Color[]
        stroke?: Color
        third?: { r: Int, g: Int, b: Int }[]
      }

      type Foo {}
      type Foo {          // Double type defs are syntactically valid
        version: Int
        version: Int      // Double field defs are syntactically valid
        mycircle?: LiveObject<Bar>
        //                    ^^^ Will parse the syntax, even though semantically incorrect
        someField: _undefinedThing_
        list: LiveList<LiveMap<Int[], LiveList<Bar[][]>>>
        //                     ^^^^^ Will parse, but is invalid
      }

      type abc {}         // Lowercased type names are syntactically valid
      `
      )
    ).toMatchSnapshot();
  });
});
