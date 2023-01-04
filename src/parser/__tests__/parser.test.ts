import * as ast from "../../ast";
import { expectDocument } from "./helpers";

describe("documents", () => {
  it("minimal document", () => {
    expectDocument(
      "type Foo { version: Int }",
      ast.Document([
        ast.ObjectTypeDef(
          ast.TypeName("Foo"),
          ast.ObjectLiteralExpr([
            ast.FieldDef(
              ast.Identifier("version"),
              false,
              ast.TypeRef(ast.TypeName("Int"))
            ),
          ])
        ),
      ])
    );
  });
});
