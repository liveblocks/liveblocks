import didyoumean from "didyoumean";
import type {
  Document,
  Definition,
  Node,
  TypeName,
  InstantiatedType,
} from "../ast";
import type { ErrorReporter } from "../lib/error-reporting";

const BUILT_IN = "BUILT_IN" as const;
type BUILT_IN = typeof BUILT_IN;

const BUILT_IN_NAMES = [
  "Int",
  "String",
  "LiveList",
  "LiveMap",
  "LiveObject",
] as const;

type RegisteredTypeInfo = {
  definition: BUILT_IN | Definition;
  cardinality: number;
};

type Context = {
  hasErrors: boolean; // TODO: Move this into ErrorReporter
  errorReporter: ErrorReporter;

  // A registry of types by their identifier names
  registeredTypes: Map<string, RegisteredTypeInfo>;
};

function makeContext(errorReporter: ErrorReporter): Context {
  return {
    hasErrors: false, // TODO: Move this into ErrorReporter
    errorReporter,
    registeredTypes: new Map(
      BUILT_IN_NAMES.map((name) => [
        name,
        {
          definition: BUILT_IN,

          // Only our hardcoded "Live" objects take params for now, you cannot
          // define your own custom parameterized types
          cardinality:
            name === "LiveList"
              ? 1
              : name === "LiveMap"
              ? 2
              : name === "LiveObject"
              ? 1
              : 0,
        },
      ])
    ),
  };
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

function checkObjectTypeDef(definition: Definition, context: Context): void {
  for (const [first, second] of dupes(definition.fields, (f) => f.name.name)) {
    context.hasErrors = true;
    context.errorReporter.printSemanticError(
      `A field named ${JSON.stringify(
        first.name.name
      )} is defined multiple times (on line ${
        context.errorReporter.lineInfo(first.name.range?.[0] ?? 0).line1
      } and ${
        context.errorReporter.lineInfo(second.name.range?.[0] ?? 0).line1
      })`,
      [],
      second.name.range
    );
  }

  for (const field of definition.fields) {
    checkNode(field.type, context);
  }
}

function checkTypeName(node: TypeName, context: Context): void {
  const typeDef = context.registeredTypes.get(node.name);
  if (typeDef === undefined) {
    const suggestion = didyoumean(
      node.name,
      Array.from(context.registeredTypes.keys())
    );

    context.hasErrors = true;
    context.errorReporter.printSemanticError(
      `Unknown type ${JSON.stringify(node.name)}`,
      [
        `I didn't understand what ${JSON.stringify(node.name)} refers to.`,
        suggestion ? `Did you mean ${JSON.stringify(suggestion)}?` : null,
      ],
      node.range
    );
  } else if (typeDef.cardinality > 0) {
    context.hasErrors = true;
    context.errorReporter.printSemanticError(
      `Type ${JSON.stringify(node.name)} is a type that needs ${
        typeDef.cardinality
      } arguments`,
      [`Did you mean to write ${JSON.stringify(node.name + "<...>")}?`],
      node.range
    );
  }
}

function checkInstantiatedType(node: InstantiatedType, context: Context): void {
  // if (!context.registeredTypes.has(node.name)) {
  //   const suggestion = didyoumean(
  //     node.name,
  //     Array.from(context.registeredTypes.keys())
  //   );
  //   context.hasErrors = true;
  //   context.errorReporter.printSemanticError(
  //     `Unknown type ${JSON.stringify(node.name)}`,
  //     [
  //       `I didn't understand what ${JSON.stringify(node.name)} refers to.`,
  //       suggestion ? `Did you mean ${JSON.stringify(suggestion)}?` : null,
  //     ],
  //     node.range
  //   );
  // }
}

function checkDocument(document: Document, context: Context): void {
  // Now, first add all definitions to the global registry
  for (const def of document.definitions) {
    const name = def.name.name;
    const existing = context.registeredTypes.get(name);
    if (existing !== undefined) {
      if (existing.definition === BUILT_IN) {
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
            context.errorReporter.lineInfo(
              existing.definition.name.range?.[0] ?? 0
            ).line1
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
      context.registeredTypes.set(name, {
        definition: def,
        cardinality: 0, // You cannot define custom types with params in the schema yourself
      });
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
    checkNode(def, context);
  }

  if (context.hasErrors) {
    throw new Error("There were errors");
  }
}

function checkNode(node: Node, context: Context): void {
  switch (node._kind) {
    case "Document":
      return checkDocument(node, context);

    case "ObjectTypeDef":
      return checkObjectTypeDef(node, context);

    case "TypeName":
      return checkTypeName(node, context);

    case "InstantiatedType":
      return checkInstantiatedType(node, context);

    // Ignore the following node types
    case "StringLiteral":
      return;

    default:
      throw new Error(`TODO: Implement checker for «${node._kind}» nodes`);
  }
}

function check(doc: Document, errorReporter: ErrorReporter): Document {
  const context = makeContext(errorReporter);
  checkDocument(doc, context);
  return doc;
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
