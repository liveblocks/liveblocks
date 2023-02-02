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
          ast.typeName("Circle"),
          ast.objectLiteralExpr([
            ast.fieldDef(
              ast.identifier("cx"),
              false,
              ast.typeRef(ast.typeName("Float"))
            ),
            ast.fieldDef(
              ast.identifier("cy"),
              false,
              ast.typeRef(ast.typeName("Float"))
            ),
            ast.fieldDef(
              ast.identifier("r"),
              false,
              ast.typeRef(ast.typeName("Float"))
            ),
          ])
        ),

        ast.objectTypeDef(
          ast.typeName("Foo"),
          ast.objectLiteralExpr([
            ast.fieldDef(
              ast.identifier("version"),
              false,
              ast.typeRef(ast.typeName("Int"))
            ),
            ast.fieldDef(
              ast.identifier("mycircle"),
              true,
              ast.typeRef(ast.typeName("LiveObject"), [
                ast.typeRef(ast.typeName("Circle")),
              ])
            ),
          ])
        ),
      ])
    );
  });
});
