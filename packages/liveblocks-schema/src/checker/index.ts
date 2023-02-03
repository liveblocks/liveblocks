import didyoumean from "didyoumean";
import type {
  TypeRef,
  Definition,
  Document,
  LiveObjectTypeExpr,
  ObjectLiteralExpr,
  ObjectTypeDef,
  Range,
} from "../ast";
import { visit } from "../ast";
import type { ErrorReporter } from "../lib/error-reporting";

class Context {
  errorReporter: ErrorReporter;

  // A registry of user-defined types by their identifier names
  registeredTypes: Map<string, Definition>;

  constructor(errorReporter: ErrorReporter) {
    this.errorReporter = errorReporter;
    this.registeredTypes = new Map();
  }

  //
  // Convenience helpers
  //

  lineno(range?: Range): string {
    if (range === undefined) {
      return "???";
    }

    const startLine = this.errorReporter.lineInfo(range[0]).line1;
    const endLine = this.errorReporter.lineInfo(range[1]).line1;
    if (startLine === endLine) {
      return `${startLine}`;
    } else {
      return `${startLine}–${endLine}`;
    }
  }

  report(title: string, description: (string | null)[], range?: Range): void {
    // FIXME(nvie) Don't throw on the first error! Collect a few (max 3?) and then throw as one error.
    // this.errorReporter.printSemanticError(title, description, range);
    this.errorReporter.throwSemanticError(title, description, range);
  }
}

function dupes<T>(items: Iterable<T>, keyFn: (item: T) => string): [T, T][] {
  const seen = new Map<string, T>();

  const dupes: [T, T][] = [];
  for (const item of items) {
    const key = keyFn(item);
    const existing = seen.get(key);
    if (existing !== undefined) {
      dupes.push([existing, item]);
    } else {
      seen.set(key, item);
    }
  }

  return dupes;
}

function checkObjectLiteralExpr(
  obj: ObjectLiteralExpr,
  context: Context
): void {
  for (const [first, second] of dupes(obj.fields, (f) => f.name.name)) {
    context.report(
      `A field named ${JSON.stringify(
        first.name.name
      )} is defined multiple times (on line ${context.lineno(
        first.name.range
      )} and ${context.lineno(second.name.range)})`,
      [],
      second.name.range
    );
  }
}

function checkLiveObjectTypeExpr(
  node: LiveObjectTypeExpr,
  context: Context
): void {
  // Check that the payload of a LiveObject type is an object type
  if (
    context.registeredTypes.get(node.of.name.name)?._kind !== "ObjectTypeDef"
  ) {
    context.report(
      "Not an object type",
      ["LiveObject expressions can only wrap object types"],
      node.of.range
    );
    return undefined;
  }
}

function checkTypeRef(node: TypeRef, context: Context): void {
  const typeDef = context.registeredTypes.get(node.name.name);
  if (typeDef === undefined) {
    const suggestion = didyoumean(
      node.name.name,
      Array.from(context.registeredTypes.keys())
    );

    context.report(
      `Unknown type ${JSON.stringify(node.name)}`,
      [
        `I didn't understand what ${JSON.stringify(node.name)} refers to.`,
        suggestion ? `Did you mean ${JSON.stringify(suggestion)}?` : null,
      ],
      node.range
    );
  }
}

// XXX Check that type definitions don't use reserved types names e.g. `type String { ... }`)
// XXX Other examples: Boolean, LiveXxx, Regex, List, Email

// XXX Check that lowercased type names are disallowed (e.g. `type henk { ... }`)
//                                                                 ^ Must start with uppercase

function checkDocument(doc: Document, context: Context): void {
  // Now, first add all definitions to the global registry
  for (const def of doc.definitions) {
    // XXX Factor out into checkDefinition?
    const name = def.name.name;
    const existing = context.registeredTypes.get(name);
    if (existing !== undefined) {
      context.report(
        `A type named ${JSON.stringify(
          name
        )} is defined multiple times (on line ${context.lineno(
          existing.name.range
        )} and ${context.lineno(def.name.range)})`,
        [
          "You cannot declare types multiple times.",
          "Please remove the duplicate definition, or use a different name.",
        ],
        def.name.range
      );
    } else {
      // All good, let's register it!
      context.registeredTypes.set(name, def);
    }
  }

  if (!context.registeredTypes.has("Storage")) {
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
}

export type CheckedDocument = {
  /**
   * The raw AST node.
   */
  // XXX Keep or remove?
  // ast: Document;

  /**
   * A map of bindings from user-defined type names to their respective
   * definitions.
   */
  // XXX Keep or remove?
  // types: Map<string, Definition>;

  /**
   * Direct access to the root "Storage" definition.
   */
  root: ObjectTypeDef;

  /**
   * Look up the Definition of a user-defined type by a Reference to it. This
   * lookup is guaranteed to exist in the semantic check phase.
   */
  getDefinition(ref: TypeRef): Definition;
};

export function check(
  doc: Document,
  errorReporter: ErrorReporter
): CheckedDocument {
  const context = new Context(errorReporter);

  // Check the entire tree
  visit(
    doc,
    {
      Document: checkDocument,
      ObjectLiteralExpr: checkObjectLiteralExpr,
      LiveObjectTypeExpr: checkLiveObjectTypeExpr,
      TypeRef: checkTypeRef,
    },
    context
  );

  if (context.errorReporter.hasErrors) {
    throw new Error("There were errors");
  }

  return {
    // XXX Keep or remove?
    // ast: doc,
    // types: context.registeredTypes,

    root: context.registeredTypes.get("Storage") as ObjectTypeDef,
    getDefinition(ref: TypeRef): Definition {
      const def = context.registeredTypes.get(ref.name.name);
      if (def === undefined) {
        throw new Error(`Unknown type name "${ref.name.name}"`);
      }
      return def;
    },
  };
}
