import { parseDocument } from "../../parser/index.js";
import { prettify } from "../index.js";

describe("prettify", () => {
  it("minimal schema", () => {
    expect(prettify(parseDocument("type Foo {x: number,    }"))).toEqual(
      "type Foo {\n  x: number\n}"
    );
    expect(
      prettify(
        parseDocument("type Foo {x: Int,  y	: \t	String ; \t z: string ; }")
      )
    ).toEqual("type Foo {\n  x: Int\n  y: String\n  z: string\n}");
  });
});
