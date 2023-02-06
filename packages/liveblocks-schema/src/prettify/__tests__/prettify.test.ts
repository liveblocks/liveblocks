import { parseDocument } from "../../parser";
import { prettify } from "../";

describe("prettify", () => {
  it("minimal schema", () => {
    expect(prettify(parseDocument("type Foo {x: Int,    }"))).toEqual(
      "type Foo {\n  x: Int\n}"
    );
  });
});
