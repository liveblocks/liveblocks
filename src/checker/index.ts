import ast from "../ast";
import type { Document, Definition } from "../ast";
import colors from "colors";
import { capitalize, formatCount, ordinal, pluralize } from "../lib/text";
import { enumerate, zip } from "../lib/itertools";
import type { ErrorReporter } from "../lib/error-reporting";
import { prettify } from "../prettify";

const BUILT_IN = "BUILT_IN" as const;
type BUILT_IN = typeof BUILT_IN;

const BUILT_IN_NAMES = [
  "Int",
  "String",
  "LiveList",
  "LiveMap",
  "LiveObject",
] as const;

type Context = {
  hasErrors: boolean; // TODO: Move this into ErrorReporter
  errorReporter: ErrorReporter;

  // A registry of types by their identifier names
  registeredTypes: Map<string, BUILT_IN | Definition>;
};

function makeContext(errorReporter: ErrorReporter): Context {
  return {
    hasErrors: false, // TODO: Move this into ErrorReporter
    errorReporter,
    registeredTypes: new Map(BUILT_IN_NAMES.map((name) => [name, BUILT_IN])),
  };
}

function checkDefinition(definition: Definition, context: Context): void {
  // TODO: Implement me
  // if (definition.name.name === "SelfRef") {
  //   context.hasErrors = true;
  //   context.errorReporter.printSemanticError("foo", [], definition.name.range);
  // }
}

function checkDocument(document: Document, context: Context): Document {
  // Now, first add all definitions to the global registry
  for (const def of document.definitions) {
    const name = def.name.name;
    const existing = context.registeredTypes.get(name);
    if (existing !== undefined) {
      if (existing === BUILT_IN) {
        context.hasErrors = true;
        context.errorReporter.printSemanticError(
          `Type ${JSON.stringify(name)} is a built-in type`,
          [
            'You cannot redefine built-in types like "Int", "String", or "LiveList".',
            "Please use a different name.",
          ],
          def.name.range
        );
      } else {
        context.hasErrors = true;
        context.errorReporter.printSemanticError(
          `A type named ${JSON.stringify(
            name
          )} is defined multiple times (on line ${
            context.errorReporter.lineInfo(existing.name.range?.[0] ?? 0).line1
          } and ${
            context.errorReporter.lineInfo(def.name.range?.[0] ?? 0).line1
          })`,
          [
            "You cannot declare types multiple times.",
            "Please remove the duplicate definition, or use a different name.",
          ],
          def.name.range
        );
      }
    } else {
      // All good, let's register it!
      context.registeredTypes.set(name, def);
    }
  }

  if (!context.registeredTypes.has("Storage")) {
    context.hasErrors = true;
    context.errorReporter.throwSemanticError(
      'Missing root definition "Storage"',
      [
        'Every Liveblocks schema requires at least one type definition named "Storage",',
        "which indicated the root of the storage. You can declare a schema like this:",
        "",
        "  type Storage {",
        "    // Your fields here",
        "  }",
      ]
    );
  }

  for (const def of document.definitions) {
    checkDefinition(def, context);
  }

  if (context.hasErrors) {
    throw new Error("There were errors");
  }

  return document;
}

function check(document: Document, errorReporter: ErrorReporter): Document {
  const context = makeContext(errorReporter);
  return checkDocument(document, context);
}

// function checkWithErrorReporter(
//   node: Node,
//   errorReporter: ErrorReporter
// ): boolean {
//   const context = makeContext(errorReporter);
//   return check(node, context);
// }

// export default checkWithErrorReporter;

// Export these only for direct access in unit tests
// export { makeContext, check as checkWithContext };

export { check };
