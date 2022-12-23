// import ast from "../../ast";
// import prettify from "../";

// describe("prettify", () => {
//   it("int literals", () => {
//     expect(prettify(ast.IntLiteral(42, "42"))).toEqual("42");
//     expect(prettify(ast.ConstructorExpr(ast.TypeName("True")))).toEqual("True");
//   });

//   it("string literals have a preferred quoting style", () => {
//     // For simple strings, prefer single quotes (')
//     expect(prettify(ast.StringLiteral("hi", "'hi'"))).toEqual("'hi'");
//     expect(prettify(ast.StringLiteral("hi", '"hi"'))).toEqual("'hi'");
//     expect(prettify(ast.StringLiteral("hi", "`hi`"))).toEqual("'hi'");

//     // For strings with a single quote char in them, prefer double quotes (")
//     expect(prettify(ast.StringLiteral("hello's", "'hello\\'s'"))).toEqual(
//       '"hello\'s"'
//     );
//     expect(prettify(ast.StringLiteral("hello's", '"hello\'s"'))).toEqual(
//       '"hello\'s"'
//     );
//     expect(prettify(ast.StringLiteral("hello's", "`hello's`"))).toEqual(
//       '"hello\'s"'
//     );
//   });
// });

// Module cannot be empty :(
export {};
