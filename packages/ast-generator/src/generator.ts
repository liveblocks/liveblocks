import fs from "fs";
import prettier from "prettier";
import invariant from "tiny-invariant";

const TYPEOF_CHECKS = new Set(["number", "string", "boolean"]);
const BUILTIN_TYPES = new Set(["number", "string", "boolean"]);

// e.g. "SomeNode" or "@SomeUnion"
type BaseNodeRef =
  | {
      ref: "Node";
      name: string;
    }
  | {
      ref: "NodeUnion";
      name: string;
    };

// e.g. "SomeNode+" or "@SomeUnion*"
type MultiNodeRef =
  | BaseNodeRef
  | {
      ref: "List";
      of: BaseNodeRef;
      min: 0 | 1;
    };

// e.g. "SomeNode?" or "@SomeUnion*?"
type NodeRef =
  | MultiNodeRef
  | {
      ref: "Optional";
      of: MultiNodeRef;
    };

// e.g. ['FloatLiteral', 'IntLiteral', '@StringExpr']
type NodeUnion = {
  name: string;
  members: NodeRef[];
};

type Field = {
  name: string;
  ref: NodeRef;
};

// e.g. { pattern: '@AssignmentPattern', expr: '@Expr' }
type Node = {
  name: string;
  fieldsByName: LUT<Field>;
  fields: Field[];
};

type LUT<T> = { [key: string]: T };

type Grammar = {
  nodesByName: LUT<Node>;
  nodes: Node[]; // Sorted list of nodes

  unionsByName: LUT<NodeUnion>;
  unions: NodeUnion[]; // Sorted list of node unions
};

function takeWhile<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const result = [];
  for (const item of items) {
    if (predicate(item)) {
      result.push(item);
    } else {
      break;
    }
  }
  return result;
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const gold: T[] = [];
  const dirt: T[] = [];
  for (const item of items) {
    if (predicate(item)) {
      gold.push(item);
    } else {
      dirt.push(item);
    }
  }
  return [gold, dirt];
}

function lowercaseFirst(text: string): string {
  return text[0].toLowerCase() + text.slice(1);
}

function parseBaseNodeRef(spec: string): BaseNodeRef {
  const match = spec.match(/^(@?[a-z]+)$/i);
  invariant(match, `Invalid reference: "${spec}"`);
  if (spec.startsWith("@")) {
    return {
      ref: "NodeUnion",
      name: spec.substring(1),
    };
  } else {
    return {
      ref: "Node",
      name: spec,
    };
  }
}

function parseMultiNodeRef(spec: string): MultiNodeRef {
  if (spec.endsWith("*")) {
    return {
      ref: "List",
      of: parseBaseNodeRef(spec.substring(0, spec.length - 1)),
      min: 0,
    };
  } else if (spec.endsWith("+")) {
    return {
      ref: "List",
      of: parseBaseNodeRef(spec.substring(0, spec.length - 1)),
      min: 1,
    };
  } else {
    return parseBaseNodeRef(spec);
  }
}

function parseSpec(spec: string): NodeRef {
  if (spec.endsWith("?")) {
    return {
      ref: "Optional",
      of: parseMultiNodeRef(spec.substring(0, spec.length - 1)),
    };
  } else {
    return parseMultiNodeRef(spec);
  }
}

/**
 * Given a NodeRef instance, returns its formatted string, e.g. "@SomeNode*"
 */
function serializeRef(ref: NodeRef): string {
  if (ref.ref === "Optional") {
    return serializeRef(ref.of) + "?";
  } else if (ref.ref === "List") {
    const base = serializeRef(ref.of);
    if (ref.min > 0) {
      return base + "+";
    } else {
      return base + "*";
    }
  } else if (ref.ref === "NodeUnion") {
    return "@" + ref.name;
  } else {
    return ref.name;
  }
}

function getBareRef(ref: NodeRef): string {
  return ref.ref === "Optional"
    ? getBareRef(ref.of)
    : ref.ref === "List"
    ? getBareRef(ref.of)
    : ref.name;
}

function getBareRefTarget(ref: NodeRef): "Node" | "NodeUnion" {
  return ref.ref === "Optional" || ref.ref === "List"
    ? getBareRefTarget(ref.of)
    : ref.ref;
}

function getTypeScriptType(ref: NodeRef): string {
  return ref.ref === "Optional"
    ? getTypeScriptType(ref.of) + " | null"
    : ref.ref === "List"
    ? getTypeScriptType(ref.of) + "[]"
    : ref.name;
}

function validate(grammar: Grammar) {
  // Keep track of which node names are referenced/used
  const referenced: Set<string> = new Set();

  for (const nodeUnion of grammar.unions) {
    for (const ref of nodeUnion.members) {
      const memberName = getBareRef(ref);
      referenced.add(memberName);
      invariant(
        grammar.nodesByName[memberName] ||
          (nodeUnion.name !== memberName && !!grammar.unionsByName[memberName]),
        `Member "${memberName}" of union "${nodeUnion.name}" is not defined in the grammar`
      );
    }
  }

  for (const node of grammar.nodes) {
    for (const field of node.fields) {
      invariant(
        !field.name.startsWith("_"),
        `Illegal field name: "${node.name}.${field.name}" (fields starting with "_" are reserved)`
      );
      const bare = getBareRef(field.ref);
      referenced.add(bare);
      invariant(
        BUILTIN_TYPES.has(bare) ||
          !!grammar.unionsByName[bare] ||
          !!grammar.nodesByName[bare],
        `Unknown node kind "${bare}" (in "${node.name}.${field.name}")`
      );
    }
  }

  // Check that all defined nodes are referenced
  const defined = new Set(grammar.nodes.map((n) => n.name));
  for (const name of referenced) {
    defined.delete(name);
  }

  // "Document" is the top-level node kind, which by definition won't be referenced
  defined.delete("Document");
  invariant(
    defined.size === 0,
    `The following node kinds are never referenced: ${Array.from(defined).join(
      ", "
    )}`
  );
}

function generateAssertParam(
  fieldName: string, // actualKindValue
  fieldRef: NodeRef, // expectedNode
  currentContext: string
): string {
  return `assert(${generateTypeCheckCondition(
    fieldRef,
    fieldName
  )}, \`Invalid value for "${fieldName}" arg in ${JSON.stringify(
    currentContext
  )} call.\\nExpected: ${serializeRef(
    fieldRef
  )}\\nGot:      \${JSON.stringify(${fieldName})}\`)`;
}

function generateTypeCheckCondition(
  expected: NodeRef,
  actualValue: string
): string {
  const conditions = [];

  if (expected.ref === "Optional") {
    conditions.push(
      `${actualValue} === null || ${generateTypeCheckCondition(
        expected.of,
        actualValue
      )}`
    );
  } else if (expected.ref === "List") {
    conditions.push(`Array.isArray(${actualValue})`);
    if (expected.min > 0) {
      conditions.push(`${actualValue}.length > 0`);
    }
    conditions.push(
      `${actualValue}.every(item => ${generateTypeCheckCondition(
        expected.of,
        "item"
      )})`
    );
  } else if (expected.ref === "NodeUnion") {
    conditions.push(`is${expected.name}(${actualValue})`);
  } else if (TYPEOF_CHECKS.has(expected.name)) {
    conditions.push(
      `typeof ${actualValue} === ${JSON.stringify(expected.name)}`
    );
  } else {
    conditions.push(
      `${actualValue}._kind === ${JSON.stringify(expected.name)}`
    );
  }

  return conditions.map((c) => `(${c})`).join(" && ");
}

function parseGrammarFromPath(path: string): Grammar {
  const src = fs.readFileSync(path, "utf-8");
  return parseGrammarFromString(src);
}

export function parseGrammarFromString(src: string): Grammar {
  const lines = src
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const unionsByName: LUT<NodeUnion> = {};
  const nodesByName: LUT<Node> = {};

  let currUnion: NodeRef[] | void;
  let currNode: LUT<Field> | void;

  for (let line of lines) {
    if (line.endsWith(":")) {
      line = line.substring(0, line.length - 1).trim();

      // NodeUnion or Node?
      if (line.startsWith("@")) {
        currUnion = [];
        currNode = undefined;
        unionsByName[line.substring(1)] = {
          name: line.substring(1),
          members: currUnion,
        };
      } else {
        currNode = {};
        currUnion = undefined;
        nodesByName[line] = {
          name: line,
          fieldsByName: currNode,
          fields: [], // Will be populated in a later pass
        };
      }
      continue;
    }

    if (line.startsWith("|")) {
      const union = line.substring(1).trim();
      invariant(currUnion, "Expect a current union");
      currUnion.push(parseBaseNodeRef(union));
    } else {
      const [name, spec] = line.split(/\s+/);
      invariant(currNode, "Expect a current node");
      currNode[name] = { name, ref: parseSpec(spec) };
    }
  }

  // Populate all the fields, for easier looping later
  for (const node of Object.values(nodesByName)) {
    node.fields = Object.values(node.fieldsByName);
  }

  return {
    nodesByName,
    nodes: Object.keys(nodesByName)
      .sort()
      .map((name) => nodesByName[name]),

    unionsByName,
    unions: Object.keys(unionsByName)
      .sort()
      .map((name) => unionsByName[name]),
  };
}

function generateCode(grammar: Grammar): string {
  // Will throw in case of errors
  validate(grammar);

  const output = [
    "/**",
    " * This file is AUTOMATICALLY GENERATED.",
    " * DO NOT edit this file manually.",
    " *",
    " * Instead, update the `ast.grammar` file, and re-run `npm run build-ast`",
    " */",
    "",
    `
    const DEBUG = process.env.NODE_ENV !== 'production';

    function assert(condition: boolean, errmsg: string): asserts condition {
      if (condition) return;
      throw new Error(errmsg);
    }

    function assertRange(range: unknown, currentContext: string): asserts range is Range {
      assert(
        isRange(range),
        \`Invalid value for range in "\${JSON.stringify(currentContext)}".\\nExpected: Range\\nGot: \${JSON.stringify(range)}\`
      );
    }
    `,
  ];

  for (const union of grammar.unions) {
    const [subNodes, subUnions] = partition(
      union.members,
      (ref) => getBareRefTarget(ref) === "Node"
    );
    const conditions = subNodes
      .map((ref) => `node._kind === ${JSON.stringify(getBareRef(ref))}`)
      .concat(subUnions.map((ref) => `is${getBareRef(ref)}(node)`));
    output.push(`
          export function is${union.name}(node: Node): node is ${union.name} {
            return (
              ${conditions.join(" || ")}
            )
          }
        `);
  }

  for (const union of grammar.unions) {
    output.push(`
            export type ${union.name} =
                ${union.members
                  .map((member) => `${getBareRef(member)}`)
                  .join(" | ")};
            `);
  }

  output.push(`
        export type Range = [number, number]

        export type Node = ${grammar.nodes.map((node) => node.name).join(" | ")}

        export function isRange(thing: unknown): thing is Range {
            return (
                Array.isArray(thing)
                && thing.length === 2
                && typeof thing[0] === 'number'
                && typeof thing[1] === 'number'
            )
        }

        export function isNode(node: Node): node is Node {
            return (
                ${grammar.nodes
                  .map((node) => `node._kind === ${JSON.stringify(node.name)}`)
                  .join(" || ")}
            )
        }
    `);

  for (const node of grammar.nodes) {
    output.push(`
            export type ${node.name} = {
                _kind: ${JSON.stringify(node.name)}
                ${node.fields
                  .map(
                    (field) => `${field.name}: ${getTypeScriptType(field.ref)}`
                  )
                  .join("\n")}
                range: Range
            }
        `);
  }

  output.push("");
  for (const node of grammar.nodes) {
    const optionals = new Set(
      takeWhile(
        node.fields.slice().reverse(),
        (field) =>
          field.ref.ref === "Optional" ||
          (field.ref.ref === "List" && field.ref.min === 0)
      ).map((field) => field.name)
    );

    const runtimeTypeChecks = node.fields.map((field) =>
      generateAssertParam(field.name, field.ref, node.name)
    );
    runtimeTypeChecks.push(`assertRange(range, ${JSON.stringify(node.name)})`);

    output.push(`
      export function ${lowercaseFirst(node.name)}(${[
      ...node.fields.map((field) => {
        const key = field.name;
        const type = getTypeScriptType(field.ref);
        return optionals.has(field.name)
          ? `${key}: ${type} = ${field.ref.ref === "Optional" ? "null" : "[]"}`
          : `${key}: ${type}`;
      }),
      "range: Range = [0, 0]",
    ].join(", ")}): ${node.name} {
                ${
                  runtimeTypeChecks.length > 0
                    ? `DEBUG && (() => { ${runtimeTypeChecks.join("\n")} })()`
                    : ""
                }
                return {
                    _kind: ${JSON.stringify(node.name)},
                    ${[...node.fields.map((field) => field.name), "range"].join(
                      ", "
                    )}
                }
            }
            `);
  }

  // Generate a general purpose AST traversal/visit function
  output.push("interface Visitor<TContext> {");
  for (const node of grammar.nodes) {
    output.push(
      `  ${node.name}?(node: ${node.name}, context: TContext): void;`
    );
  }
  output.push("}");

  output.push(
    `
      export function visit<TNode extends Node>(node: TNode, visitor: Visitor<undefined>): TNode;
      export function visit<TNode extends Node, TContext>(node: TNode, visitor: Visitor<TContext>, context: TContext): TNode;
      export function visit<TNode extends Node, TContext>(node: TNode, visitor: Visitor<TContext | undefined>, context?: TContext): TNode {
        switch (node._kind) {
        `
  );

  for (const node of grammar.nodes) {
    const fields = node.fields.filter(
      (field) => !BUILTIN_TYPES.has(getBareRef(field.ref))
    );

    output.push(`case ${JSON.stringify(node.name)}:`);
    output.push(`  visitor.${node.name}?.(node, context);`);
    for (const field of fields) {
      switch (field.ref.ref) {
        case "Node":
        case "NodeUnion":
          output.push(`  visit(node.${field.name}, visitor, context);`);
          break;

        case "List":
          output.push(
            `  node.${field.name}.forEach(${field.name[0]} => visit(${field.name[0]}, visitor, context));`
          );
          break;

        case "Optional":
          output.push(
            `  // TODO: Implement visiting for _optional_ field node.${field.name}`
          );
          break;
      }
    }
    output.push("  break;");
    output.push("");
  }

  output.push(
    `
        }

        return node;
      }
      `
  );

  return output.join("\n");
}

function writeFile(contents: string, path: string) {
  const existing = fs.existsSync(path)
    ? fs.readFileSync(path, { encoding: "utf-8" })
    : null;
  if (contents !== existing) {
    fs.writeFileSync(path, contents, { encoding: "utf-8" });
    console.error(`Wrote ${path}`);
  } else {
    // Output file is still up to date, let's not write (since it may
    // trigger another watch proc)
  }
}

export async function generateAST(
  inpath: string,
  outpath: string
): Promise<void> {
  const grammar = parseGrammarFromPath(inpath);
  const uglyCode = generateCode(grammar);

  // Beautify it with prettier
  const config = await prettier.resolveConfig(outpath);
  if (config === null) {
    throw new Error(
      "Could not find or read .prettierrc config for this project"
    );
  }

  const code = prettier.format(uglyCode, { ...config, parser: "typescript" });
  writeFile(code, outpath);
}
