import * as ast from "../../ast";
import { expectDocument, expectTypeExpr, parseDocument } from "./helpers";

const String = ast.StringLiteral;

describe("documents", () => {
  it("empty document", () => {
    expectDocument("", ast.Document([]));
  });
});

describe("comments", () => {
  it("line comment", () => {
    const result = parseDocument("// This is comment\n");
    expect(result.comments.length).toBe(1);
    expect(result.comments[0].text).toEqual(" This is comment");
  });

  it("block comment (multi-line)", () => {
    const result = parseDocument("/* This is\n   a multi-line comment */");
    expect(result.comments.length).toBe(1);
    expect(result.comments[0].text).toEqual(
      " This is\n   a multi-line comment "
    );
  });
});

// describe("literals", () => {
//   // it("ints", () => {
//   //   expectTypeExpr("0", Int(0));
//   //   expectTypeExpr("1", Int(1));
//   //   expectTypeExpr("3782643", Int(3782643));
//   //   expectTypeExpr("1_2_3_4", Int(1234, "1_2_3_4"));
//   // });

//   // it("floats", () => {
//   //   expectTypeExpr("0.0", Float(0.0, "0.0"));
//   //   expectTypeExpr(".0", Float(0.0, ".0"));
//   //   expectTypeExpr("1.000000000", Float(1, "1.000000000"));
//   //   expectTypeExpr("3.141592", Float(3.141592, "3.141592"));
//   //   expectTypeExpr("3_000.14_15_92", Float(3000.141592, "3_000.14_15_92"));
//   // });
// });

describe("strings", () => {
  it("single-line", () => {
    expectTypeExpr("'hello'", String("hello", "'hello'"));
    expectTypeExpr('"hello"', String("hello", '"hello"'));

    // Unless they escape them
    expectTypeExpr(
      "'hello\\nworld'",
      String("hello\nworld", "'hello\\nworld'")
    );
    expectTypeExpr(
      '"hello\\nworld"',
      String("hello\nworld", '"hello\\nworld"')
    );

    // prettier-ignore
    expectTypeExpr(
            '"\\"hello\\""',
            String('"hello"', '"\\"hello\\""'),
        )
  });
});

describe("identifiers", () => {
  it("identifier names", () => {
    expectTypeExpr("x", ast.Identifier("x"));
    expectTypeExpr("xxx", ast.Identifier("xxx"));
    expectTypeExpr("xxx_xxx", ast.Identifier("xxx_xxx"));

    // ALL_CAPS names are allowed, but a single capital letter isn't enough
    expectTypeExpr("ALL_CAPS", ast.Identifier("ALL_CAPS"));
    expectTypeExpr("A4_PAPER", ast.Identifier("A4_PAPER"));
    expectTypeExpr("W", ast.Identifier("W"));
    expectTypeExpr("A4", ast.Identifier("A4"));

    // Not idiomatic, but... technically allowed
    expectTypeExpr("xxxXxx", ast.Identifier("xxxXxx"));
  });
});

// describe("type expressions", () => {
//   it("type references", () => {
//     expectTypeExpr("Int", TypeRef(TypeName("Int")));
//     expectTypeExpr(
//       "Maybe<Str>",
//       TypeRef(TypeName("Maybe"), [TypeRef(TypeName("Str"))])
//     );
//     expectTypeExpr(
//       " Array < Foo < Bar ,  Qux , > ,  Baz > ",
//       TypeRef(TypeName("Array"), [
//         TypeRef(TypeName("Foo"), [
//           TypeRef(TypeName("Bar")),
//           TypeRef(TypeName("Qux")),
//         ]),
//         TypeRef(TypeName("Baz")),
//       ])
//     );
//   });

//   it("record types", () => {
//     expectTypeExpr("{}", RecordType([]));

//     expectTypeExpr(
//       "{ x: Int, y: Str }",
//       RecordType([
//         Field(ast.Identifier("x"), TypeRef(TypeName("Int"))),
//         Field(ast.Identifier("y"), TypeRef(TypeName("Str"))),
//       ])
//     );

//     expectTypeEqual("\n{\nx\n:\nInt\n,\ny\n:\nStr\n}\n", "{ x: Int, y: Str }");

//     // Commas or newlines
//     expectTypeEqual("{ x: Int, y: Str }", "{ x: Int \n y: Str }");
//   });

//   it("literal types", () => {
//     expectTypeExpr("42", LiteralType(Int(42)));
//     expectTypeExpr("-3.14", LiteralType(Float(-3.14, "-3.14")));
//     expectTypeExpr("'hi'", LiteralType(String("hi", "'hi'")));
//   });
// });
// });
