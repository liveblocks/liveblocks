import * as ast from "../../ast";
import { expectDocument } from "./helpers";

describe("documents", () => {
  it("minimal document", () => {
    expectDocument(
      "type Foo { version: Int }",
      ast.document([
        ast.objectTypeDef(
          ast.typeName("Foo"),
          ast.objectLiteralExpr([
            ast.fieldDef(
              ast.identifier("version"),
              false,
              ast.typeRef(ast.typeName("Int"))
            ),
          ])
        ),
      ])
    );
  });
});
