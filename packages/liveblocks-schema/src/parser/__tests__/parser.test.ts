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

      type Unions {
        a: String | Int[]
        b: (String | Int)[]

        // All of these are the same
        c: (String | Int | null)
        d: ((String | Int) | null)
        e: (String | (Int | null))
        f: ((String | (Int | null)))
        g: null | Int | String  # But order is retained
      }
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

        ast.objectTypeDefinition(
          ast.typeName("Unions"),
          [
            ast.fieldDef(
              ast.identifier("a"),
              false,
              ast.unionType([ast.stringType(), ast.arrayType(ast.numberType())])
            ),
            ast.fieldDef(
              ast.identifier("b"),
              false,
              ast.arrayType(ast.unionType([ast.stringType(), ast.numberType()]))
            ),

            // These are all the same
            ast.fieldDef(
              ast.identifier("c"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("d"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("e"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("f"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),

            // ...but order is retained
            ast.fieldDef(
              ast.identifier("g"),
              false,
              ast.unionType([
                ast.nullType(),
                ast.numberType(),
                ast.stringType(),
              ])
            ),
          ],
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

      type Unions {
        a: string | number[]
        b: (string | number)[]

        // All of these are the same
        c: (string | number | null)
        d: ((string | number) | null)
        e: (string | (number | null))
        f: ((string | (number | null)))
        g: null | number | string  # But order is retained
      }
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

        ast.objectTypeDefinition(
          ast.typeName("Unions"),
          [
            ast.fieldDef(
              ast.identifier("a"),
              false,
              ast.unionType([ast.stringType(), ast.arrayType(ast.numberType())])
            ),
            ast.fieldDef(
              ast.identifier("b"),
              false,
              ast.arrayType(ast.unionType([ast.stringType(), ast.numberType()]))
            ),

            // These are all the same
            ast.fieldDef(
              ast.identifier("c"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("d"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("e"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),
            ast.fieldDef(
              ast.identifier("f"),
              false,
              ast.unionType([
                ast.stringType(),
                ast.numberType(),
                ast.nullType(),
              ])
            ),

            // ...but order is retained
            ast.fieldDef(
              ast.identifier("g"),
              false,
              ast.unionType([
                ast.nullType(),
                ast.numberType(),
                ast.stringType(),
              ])
            ),
          ],
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

      type Unions {
        a: string | number | number[]
        b: (string | number | number)[]

        // All of these are the same
        c: (string | number | number | null)
        d: ((string | number) | null)
        e: (string | (number | null))
        f: ((string | (number | null)))
        g: null | number | string  # But order is retained
      }
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

      type Unions {
        a: String | Int | Int[]
        b: (String | Int | Int)[]

        // All of these are the same
        c: (String | Int | Int | null)
        d: ((String | Int) | null)
        e: (String | (Int | null))
        f: ((String | (Int | null)))
        g: null | Int | String  # But order is retained
      }
      `
      )
    ).toMatchSnapshot();
  });
});
