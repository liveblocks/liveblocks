import * as ast from "../../ast";
import { expectDocument } from "./helpers";

describe("documents", () => {
  it("minimal document", () => {
    expectDocument(
      `
      type Circle {
        cx: Float
        cy: Float
        r: Float
      }

      type Foo {
        version: Int
        mycircle?: LiveObject<Circle>
      }
      `,

      ast.document([
        ast.objectTypeDef(
          ast.identifier("Circle"),
          ast.objectLiteralExpr([
            ast.fieldDef(ast.identifier("cx"), false, ast.floatKeyword()),
            ast.fieldDef(ast.identifier("cy"), false, ast.floatKeyword()),
            ast.fieldDef(ast.identifier("r"), false, ast.floatKeyword()),
          ])
        ),

        ast.objectTypeDef(
          ast.identifier("Foo"),
          ast.objectLiteralExpr([
            ast.fieldDef(ast.identifier("version"), false, ast.intKeyword()),
            ast.fieldDef(
              ast.identifier("mycircle"),
              true,
              ast.liveObjectTypeExpr(ast.typeRef(ast.identifier("Circle")))
            ),
          ])
        ),
      ])
    );
  });
});
