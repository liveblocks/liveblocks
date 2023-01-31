import { prettify } from "../";
import { parse } from "../../parser";

describe("prettify", () => {
  it("minimal schema", () => {
    expect(prettify(parse("type Foo {x: Int,    }"))).toEqual(
      "type Foo {\n  x: Int\n}"
    );
  });
});
