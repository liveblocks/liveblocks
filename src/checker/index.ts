// import ast, { Node, Type, TypeRef } from "../ast";
// import colors from "colors";
// import { capitalize, formatCount, ordinal, pluralize } from "../lib/text";
// import { enumerate, zip } from "../lib/itertools";
// import type { ErrorReporter } from "../lib/error-reporting";

// import prettify from "../prettify";

// type LUT<T> = { [name: string]: T };

// /**
//  * TODO: Explain what's on the Context, and why we keep it there.
//  */
// type Context = {
//   errorReporter: ErrorReporter;

//   // A registry of types by their identifier names
//   types: LUT<Type>;
// };

// function buildContext(errorReporter: ErrorReporter): Context {
//   return {
//     errorReporter,
//     types: {},
//   };
// }

// function nn<T>(value: T | null | undefined, hint: string): T {
//   if (value !== null && value !== undefined) {
//     return value;
//   } else {
//     throw new Error(`Not a valid non-nullable value: ${hint}`);
//   }
// }

// function explain(node: Node): string {
//   if (node._kind === "CallExpr") {
//     return `the return value of \`${prettify(node.callee)}\``;
//   } else if (node._kind === "VariablePat") {
//     return `the variable \`${prettify(node)}\``;
//   } else {
//     return `this value`;
//   }
// }

// /**
//  * TODO: UNIT TEST THIS FUNCTION
//  */
// function matchTypeRefs(typeRef1: TypeRef, typeRef2: TypeRef): boolean {
//   if (typeRef1.name.name !== typeRef2.name.name) return false;
//   if (typeRef1.args.length !== typeRef2.args.length) return false;
//   return typeRef1.args
//     .map((arg, i) => arg === typeRef2.args[i])
//     .every((x) => x);
// }

// /**
//  * TODO: UNIT TEST THIS FUNCTION
//  */
// function matchType(type1: Type, type2: Type): boolean {
//   if (type1._kind !== type2._kind) {
//     // Two different kind of types can never match
//     return false;
//   } else if (type1._kind === "TypeRef" && type2._kind === "TypeRef") {
//     return matchTypeRefs(type1, type2);
//   } else {
//     throw new Error(`Don't know how to match nodes of ${type1._kind} yet`);
//   }
// }

// /**
//  * Given a node and a type, will:
//  * - Check that the Node's type matched the given type (if it has one)
//  * - Infer the Node's type as the given type (if it has none)
//  */
// function matchOrInferType(node: Node, targetType: Type): boolean {
//   if (!node._type) {
//     // Infers LHS via RHS
//     node._type = targetType;
//     return true;
//   } else {
//     return matchType(node._type, targetType);
//   }
// }

// /**
//  * TODO: Explain what this function does, high-level.
//  *
//  * Returns whether this node type checks.
//  */
// function check(node: Node, context: Context): boolean {
//   // Never reprocess the same node twice
//   if (node._type) return true;

//   switch (node._kind) {
//     case "Document": {
//       let ok;
//       for (const def of node.definitions) {
//         ok = check(def, context);
//         if (!ok) return false;
//       }
//       return true;
//     }

//     case "Assignment": {
//       let ok;
//       // TODO: Rename to `tryInfer()`? :: (Node, Context) => Maybe<Type>
//       ok = check(node.pattern, context); // TODO: It's OK if pattern has no inferred type yet
//       if (!ok) return false;

//       // TODO: Call this `infer()`? :: (Node, Context) => Type
//       // To make clear that after this call, this Node is expected to
//       // have a known type?
//       ok = check(node.expr, context);
//       if (!ok) return false;

//       const exprType = nn(node.expr._type, "rhs of assignment");
//       ok = matchOrInferType(node.pattern, exprType);
//       if (!ok) {
//         context.errorReporter.printTypeError(
//           "The type for this assignment does not match",
//           [
//             `${capitalize(explain(node.expr))} is of type`,
//             exprType,
//             "",
//             "But the assignment must be for a",
//             node.pattern._type ?? "?",
//           ],
//           node.expr.range
//         );
//         return false;
//       }

//       // TODO: This should become aware of the current "scope"
//       if (node.pattern._kind === "VariablePat") {
//         context.types[node.pattern.name.name] = exprType;
//       } else {
//         // TODO: Implement this
//         context.errorReporter.printTypeError(
//           `Not implemented yet!`,
//           [
//             `${colors.bgYellow(
//               colors.black(" TODO ")
//             )}: Implement assignment logic for ${colors.blue(
//               node.pattern._kind
//             )}!`,
//           ],
//           node.pattern.range
//         );
//       }

//       return true;
//     }

//     case "CallExpr": {
//       let ok;
//       ok = check(node.callee, context);
//       if (!ok) return false;

//       const ftype = nn(node.callee._type, "type of callee");
//       if (ftype._kind !== "FunctionType") {
//         context.errorReporter.printTypeError(
//           "This value must be a function in order to invoke it",
//           ["This value is of type", ftype],
//           node.callee.range
//         );
//         return false;
//       }

//       const numNeeded = ftype.args.length;
//       const numGiven = node.args.length;
//       if (numNeeded !== numGiven) {
//         context.errorReporter.printTypeError(
//           `Function \`${prettify(node.callee)}\` expects ${pluralize(
//             numNeeded,
//             "argument"
//           )}, but got ${numNeeded > numGiven ? "only " : ""}${formatCount(
//             node.args.length
//           )}.`,
//           [],
//           node.callee.range
//         );
//         return false;
//       }

//       for (const [index, [value, paramType]] of enumerate(
//         zip(
//           node.args,
//           ftype.args // TODO: Rename to ftype.params?
//         ),
//         1
//       )) {
//         ok = check(value, context);
//         if (!ok) return false;

//         ok = matchType(nn(value._type, "native func arg type"), paramType);
//         if (!ok) {
//           context.errorReporter.printTypeError(
//             `The ${ordinal(index)} argument to \`${prettify(
//               node.callee
//             )}\` has an unexpected type.`,
//             [
//               `${capitalize(explain(value))} is of type`,
//               nn(value._type, "arg to function"),
//               "",
//               `But the ${ordinal(index)} argument to \`${prettify(
//                 node.callee
//               )}\` is expected to be a`,
//               paramType,
//             ],
//             value.range
//           );
//           return false;
//         }
//       }

//       // TODO: Support keyword arg checks here, too. Argument name
//       // information isn't stored in the ftype, though, so we might need
//       // to use the full function definition AST node for this purpose.

//       matchOrInferType(node, ftype.returnType);
//       return true;
//     }

//     case "Identifier": {
//       const type = context.types[node.name];
//       if (type === undefined) {
//         context.errorReporter.printTypeError(
//           `I don't recognize variable \`${colors.bold(node.name)}\`.`,
//           [],
//           node.range
//         );
//         return false;
//       }
//       matchOrInferType(node, type);
//       return true;
//     }

//     case "IntLiteral": {
//       return matchOrInferType(node, ast.TypeRef(ast.TypeName("Int")));
//     }

//     case "StringLiteral": {
//       return matchOrInferType(node, ast.TypeRef(ast.TypeName("Str")));
//     }

//     case "VariablePat": {
//       if (node.type) {
//         matchOrInferType(node, node.type);
//       }
//       return true;
//     }

//     default: {
//       context.errorReporter.printTypeError(
//         `Not implemented yet!`,
//         [
//           `${colors.bgYellow(
//             colors.black(" TODO ")
//           )}: Implement type checker for ${colors.blue(node._kind)}!`,
//         ],
//         node.range
//       );
//       return false;
//     }
//   }
// }

// function checkWithErrorReporter(
//   node: Node,
//   errorReporter: ErrorReporter
// ): boolean {
//   const context = buildContext(errorReporter);
//   return check(node, context);
// }

// export default checkWithErrorReporter;

// // Export these only for direct access in unit tests
// export { buildContext, check as checkWithContext };

export {}; // Module cannot be empty
