import original_didyoumean from "didyoumean";

import type {
  Definition,
  Document,
  FieldDef,
  ObjectLiteralExpr,
  ObjectTypeDefinition,
  Range,
  TypeExpr,
  TypeName,
  TypeRef,
} from "../ast";
import { isBuiltInScalar, visit } from "../ast";
import { assertNever } from "../lib/assert";
import DefaultMap from "../lib/DefaultMap";
import type { ErrorReporter } from "../lib/error-reporting";

function quote(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

const TYPENAME_REGEX = /^[A-Z_]/;

// TODO Ideally _derive_ this list of builtins directly from the grammar
// instead somehow?
const BUILTINS = ["String", "Int", "Float", "Boolean"];

/**
 * Reserve these names for future use.
 */
const RESERVED_TYPENAMES_REGEX = /^Live|^(Presence|Array)$/i;

class Context {
  errorReporter: ErrorReporter;

  // A registry of user-defined types by their identifier names. Defined during
  // the first checkDocument pass.
  registeredTypes: Map<string, Definition>;

  // Reverse lookup table, to find which type definitions depend on which other
  // type definitions. Defined during the first checkDocument pass.
  usedBy: DefaultMap<string, Set<string>>;

  // Set of types that (directly or indirectly) have Live constructs in their
  // field definitions. As such, these types can only be used by other Live
  // types. Defined during the first checkDocument pass.
  liveOnlyTypes: Set<string>;

  constructor(errorReporter: ErrorReporter) {
    this.errorReporter = errorReporter;
    this.registeredTypes = new Map();
    this.usedBy = new DefaultMap(() => new Set());
    this.liveOnlyTypes = new Set();
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

function checkNoDuplicateFields(fieldDefs: FieldDef[], context: Context): void {
  // Check for any duplicate field names
  for (const [first, second] of dupes(fieldDefs, (f) => f.name.name)) {
    context.report(
      `A field named ${quote(
        first.name.name
      )} is defined multiple times (on line ${context.lineno(
        first.name.range
      )} and ${context.lineno(second.name.range)})`,
      [],
      second.name.range
    );
  }
}

function checkObjectLiteralExpr(
  obj: ObjectLiteralExpr,
  context: Context
): void {
  checkNoDuplicateFields(obj.fields, context);

  // Check that none of the fields here use a "live" reference
  for (const field of obj.fields) {
    if (field.type._kind === "TypeRef" && field.type.asLiveObject) {
      context.report(`Cannot use a LiveObject here`, [], field.type.range);
    }
  }
}

function checkTypeName(node: TypeName, context: Context): void {
  if (!TYPENAME_REGEX.test(node.name)) {
    context.report(
      "Type names should start with an uppercase character",
      [],
      node.range
    );
  }

  // Continue collecting more errors

  if (BUILTINS.some((bname) => bname === node.name)) {
    context.report(
      `Type name ${quote(node.name)} is a built-in type`,
      [],
      node.range
    );
  } else if (RESERVED_TYPENAMES_REGEX.test(node.name)) {
    context.report(
      `Type name ${quote(node.name)} is reserved for future use`,
      [],
      node.range
    );
  }
}

/**
 * Wrap didyoumean to avoid dealing with a million different possible output
 * values.
 */
function didyoumean(value: string, alternatives: string[]): string[] {
  const output = original_didyoumean(value, alternatives);
  if (!output) {
    return [];
  } else if (Array.isArray(output)) {
    return output;
  } else {
    return [output];
  }
}

function checkTypeRefTargetExists(node: TypeRef, context: Context): void {
  const name = node.ref.name;
  const typeDef = context.registeredTypes.get(name);
  if (typeDef === undefined) {
    // If we land here, it means there's an unknown type reference. Possibly
    // caused by misspellings or people trying to learn/play with the language.
    // Let's be friendly to them and assist them with fixing the problem,
    // especially around common mistakes.
    let alternatives: string[] = didyoumean(
      node.ref.name,
      BUILTINS.concat(Array.from(context.registeredTypes.keys()))
    );

    if (alternatives.length === 0) {
      // It can be expected that people will try to put "number" in as a type,
      // because that's TypeScript's syntax. If there is no custom type name
      // found that closely matches this typo, then try to suggest one more thing
      // to nudge them.
      alternatives = /^num(ber)?$/i.test(name)
        ? ["Float", "Int"]
        : [
            /* no alternatives */
          ];
    }

    const suggestion =
      alternatives.length > 0
        ? `. Did you mean ${alternatives
            .map((alt) => quote(alt))
            .join(" or ")}?`
        : "";

    context.report(`Unknown type ${quote(name)}` + suggestion, [], node.range);
  }
}

function checkLiveObjectPayloadIsObjectType(
  typeRef: TypeRef,
  context: Context
): void {
  // Check that the payload of a LiveObject type is an object type
  if (
    typeRef.asLiveObject &&
    context.registeredTypes.get(typeRef.ref.name)?._kind !==
      "ObjectTypeDefinition"
  ) {
    context.report(
      "Not an object type",
      ["LiveObject can only be used on object types"],
      typeRef.ref.range
    );
    return undefined;
  }
}

function checkTypeRef(ref: TypeRef, context: Context): void {
  checkTypeRefTargetExists(ref, context);

  checkLiveObjectPayloadIsObjectType(ref, context);

  //
  // For each definition, first ensure that it and annotate whether or not they
  // are usable in "live contexts" only. For example, in a definition like:
  //
  //   type Foo {
  //     a: LiveObject<Bar>  // or LiveList, or ...
  //   }
  //
  // It should be impossible to refer to Foo as a "normal" type, without
  // wrapping it in a Live<...> wrapper itself.
  //
  checkLiveRefs(ref, context);
}

function checkNoForbiddenRefs(
  node: ObjectTypeDefinition | TypeExpr,
  context: Context,
  forbidden: Set<string>
): void {
  if (isBuiltInScalar(node)) {
    return;
  }

  switch (node._kind) {
    case "ObjectTypeDefinition":
      for (const field of node.fields) {
        // TODO for later. Allow _some_ self-references. For example, if
        // `field.optional`, then it'd be perfectly fine to use
        // self-references. But for reasons unrelated to the technical parsing,
        // we're currently not allowing them. See
        // https://github.com/liveblocks/liveblocks.io/issues/910 for context.
        checkNoForbiddenRefs(field.type, context, forbidden);
      }
      break;

    case "ObjectLiteralExpr":
      for (const field of node.fields) {
        // TODO for later. Allow _some_ self-references. For example, if
        // `field.optional`, then it'd be perfectly fine to use
        // self-references. But for reasons unrelated to the technical parsing,
        // we're currently not allowing them. See
        // https://github.com/liveblocks/liveblocks.io/issues/910 for context.
        checkNoForbiddenRefs(field.type, context, forbidden);
      }
      break;

    case "TypeRef": {
      if (forbidden.has(node.ref.name)) {
        context.report(
          `Cyclical reference detected: ${quote(node.ref.name)}`,
          [],
          node.range
        );
      }

      const def = context.registeredTypes.get(node.ref.name);
      if (def !== undefined) {
        const s = new Set(forbidden);
        s.add(node.ref.name);
        checkNoForbiddenRefs(def, context, s);
      }
      break;
    }

    default:
      return assertNever(node, "Unhandled case");
  }
}

function checkLiveRefs(typeRef: TypeRef, context: Context): void {
  // If the type referenced here requires a live context, this must be written
  // as a LiveObject<> wrapper.
  if (context.liveOnlyTypes.has(typeRef.ref.name) && !typeRef.asLiveObject) {
    context.report(
      `Type ${quote(
        typeRef.ref.name
      )} can only be used as a Live type. Did you mean to write 'LiveObject<${
        typeRef.ref.name
      }>'?`,
      [],
      typeRef.range
    );
  }
}

function checkObjectTypeDefinition(
  def: ObjectTypeDefinition,
  context: Context
): void {
  checkNoDuplicateFields(def.fields, context);

  // Checks to make sure there are no self-references in object definitions
  checkNoForbiddenRefs(def, context, new Set([def.name.name]));
}

function checkDocument(doc: Document, context: Context): void {
  // Now, first add all definitions to the global registry
  for (const def of doc.definitions) {
    const name = def.name.name;
    const existing = context.registeredTypes.get(name);
    if (existing !== undefined) {
      context.report(
        `A type named ${quote(
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

      // Also, while registering it, quickly search all subnodes to see if any
      // of its field definitions use a Live wrapper. If so, we should mark the
      // object type definition to require a Live type.
      visit(
        def,
        {
          // TODO: Add all other future LiveXxxTypeExprs here, too
          // TODO: Would be nicer if we could use a NodeGroup as a visitor
          //       function directly, perhaps?
          //       i.e. LiveTypeExpr: () => { ... }?
          TypeRef: (typeRef) => {
            if (typeRef.asLiveObject) {
              context.liveOnlyTypes.add(def.name.name);
            }
            context.usedBy.getOrCreate(typeRef.ref.name).add(def.name.name);
          },
        },
        null
      );
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
        "    # Your fields here",
        "  }",
      ]
    );
  }

  // Now that we know which types are "live only", we'll need to do another
  // quick pass to let that requirements infect all of their (indirect)
  // dependencies too
  const queue = [...context.liveOnlyTypes];
  let curr: string | undefined;
  while ((curr = queue.pop()) !== undefined) {
    context.usedBy.get(curr)?.forEach((dependant) => {
      if (!context.liveOnlyTypes.has(dependant)) {
        context.liveOnlyTypes.add(dependant);
        queue.push(dependant);
      }
    });
  }
}

export type CheckedDocument = {
  /**
   * The raw AST node.
   */
  // FIXME(nvie) Keep or remove?
  // ast: Document;

  /**
   * A map of bindings from user-defined type names to their respective
   * definitions.
   */
  // FIXME(nvie) Keep or remove?
  // types: Map<string, Definition>;

  /**
   * Direct access to the root "Storage" definition.
   */
  root: ObjectTypeDefinition;

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
      ObjectTypeDefinition: checkObjectTypeDefinition,
      TypeName: checkTypeName,
      TypeRef: checkTypeRef,
    },
    context
  );

  if (context.errorReporter.hasErrors) {
    throw new Error("There were errors");
  }

  return {
    // FIXME(nvie) Keep or remove?
    // ast: doc,
    // types: context.registeredTypes,

    root: context.registeredTypes.get("Storage") as ObjectTypeDefinition,
    getDefinition(typeRef: TypeRef): Definition {
      const def = context.registeredTypes.get(typeRef.ref.name);
      if (def === undefined) {
        throw new Error(`Unknown type name "${typeRef.ref.name}"`);
      }
      return def;
    },
  };
}
