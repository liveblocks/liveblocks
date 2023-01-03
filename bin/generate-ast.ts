import chalk from "chalk";
import fs from "fs";
import invariant from "invariant";
import prettier, { Options as PrettierOptions } from "prettier";

const INPUT_FILE = "src/ast/ast.grammar";
const OUTPUT_FILE = "src/ast/index.ts";
const PRETTIER_OPTIONS: PrettierOptions = {
  parser: "typescript",
  semi: true,
  printWidth: 90,
  tabWidth: 2,
  singleQuote: false,
  trailingComma: "es5",
  useTabs: false,
  jsxSingleQuote: false,
  arrowParens: "always",
  bracketSpacing: true,
  bracketSameLine: false,
  proseWrap: "always",
};

const TYPEOF_CHECKS = new Set(["number", "string", "boolean"]);
const BUILTIN_TYPES = new Set(["number", "string", "boolean"]);

// e.g. "SomeNode" or "@SomeGroup"
type BaseNodeRef =
  | {
      ref: "Node";
      name: string;
    }
  | {
      ref: "NodeGroup";
      name: string;
    };

// e.g. "SomeNode+" or "@SomeGroup*"
type MultiNodeRef =
  | BaseNodeRef
  | {
      ref: "List";
      of: BaseNodeRef;
      min: 0 | 1;
    };

// e.g. "SomeNode?" or "@SomeGroup*?"
type NodeRef =
  | MultiNodeRef
  | {
      ref: "Optional";
      of: MultiNodeRef;
    };

// e.g. ['FloatLiteral', 'IntLiteral', '@StringExpr']
type NodeGroup = {
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

  nodeGroupsByName: LUT<NodeGroup>;
  nodeGroups: NodeGroup[]; // Sorted list of node groups
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

function parseBaseNodeRef(spec: string): BaseNodeRef {
  const match = spec.match(/^(@?[a-z]+)$/i);
  invariant(match, `Invalid reference: "${spec}"`);
  if (spec.startsWith("@")) {
    return {
      ref: "NodeGroup",
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
  } else if (ref.ref === "NodeGroup") {
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

function getBareRefTarget(ref: NodeRef): "Node" | "NodeGroup" {
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

  for (const nodeGroup of grammar.nodeGroups) {
    for (const ref of nodeGroup.members) {
      const memberName = getBareRef(ref);
      referenced.add(memberName);
      invariant(
        grammar.nodesByName[memberName] ||
          (nodeGroup.name !== memberName &&
            !!grammar.nodeGroupsByName[memberName]),
        `Member "${memberName}" of group "${nodeGroup.name}" is not defined in the grammar`
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
          !!grammar.nodeGroupsByName[bare] ||
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

function generateTypeCheckCondition(
  expected: NodeRef,
  actualValue: string
): string {
  let conditions = [];

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
  } else if (expected.ref === "NodeGroup") {
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

function parseGrammarDefinition(): Grammar {
  const src = fs.readFileSync(INPUT_FILE, "utf-8");
  const lines = src
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const nodeGroupsByName: LUT<NodeGroup> = {};
  const nodesByName: LUT<Node> = {};

  let currGroup: NodeRef[] | void;
  let currNode: LUT<Field> | void;

  for (let line of lines) {
    if (line.endsWith(":")) {
      line = line.substring(0, line.length - 1).trim();

      // NodeGroup or Node?
      if (line.startsWith("@")) {
        currGroup = [];
        currNode = undefined;
        nodeGroupsByName[line.substring(1)] = {
          name: line.substring(1),
          members: currGroup,
        };
      } else {
        currNode = {};
        currGroup = undefined;
        nodesByName[line] = {
          name: line,
          fieldsByName: currNode,
          fields: [], // Will be populated in a later pass
        };
      }
      continue;
    }

    if (line.startsWith("|")) {
      const group = line.substring(1).trim();
      invariant(currGroup, "Expect a curr node group");
      currGroup.push(parseBaseNodeRef(group));
    } else {
      const [name, spec] = line.split(/\s+/);
      invariant(currNode, "Expect a curr node");
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

    nodeGroupsByName,
    nodeGroups: Object.keys(nodeGroupsByName)
      .sort()
      .map((name) => nodeGroupsByName[name]),
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
    'import invariant from "invariant"',
    "",
  ];

  for (const nodeGroup of grammar.nodeGroups) {
    const [subNodes, subGroups] = partition(
      nodeGroup.members,
      (ref) => getBareRefTarget(ref) === "Node"
    );
    const conditions = subNodes
      .map((ref) => `node._kind === ${JSON.stringify(getBareRef(ref))}`)
      .concat(subGroups.map((ref) => `is${getBareRef(ref)}(node)`));
    output.push(`
          export function is${nodeGroup.name}(node: Node): node is ${
      nodeGroup.name
    } {
            return (
              ${conditions.join(" || ")}
            )
          }
        `);
  }

  for (const nodeGroup of grammar.nodeGroups) {
    output.push(`
            export type ${nodeGroup.name} =
                ${nodeGroup.members
                  .map((member) => `${getBareRef(member)}`)
                  .join(" | ")};
            `);
  }

  output.push(`
        export type Range = [number, number]

        export type Node = ${grammar.nodes.map((node) => node.name).join(" | ")}

        export function isRange(thing: Range): thing is Range {
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

    const argChecks = node.fields
      .map((field) => {
        return `invariant(${generateTypeCheckCondition(
          field.ref,
          field.name
        )}, \`Invalid value for "${field.name}" arg in "${
          node.name
        }" call.\\nExpected: ${serializeRef(
          field.ref
        )}\\nGot:      \${JSON.stringify(${field.name})}\`)\n`;
      })
      .filter(Boolean);
    argChecks.push(
      `invariant(
                isRange(range),
                \`Invalid value for range in "${node.name}".\\nExpected: Range\\nGot: \${JSON.stringify(range)}\`
             )`
    );

    output.push(
      `
            export function ${node.name}(${[
        ...node.fields.map((field) => {
          let key = field.name;
          const type = getTypeScriptType(field.ref);
          return optionals.has(field.name)
            ? `${key}: ${type} = ${
                field.ref.ref === "Optional" ? "null" : "[]"
              }`
            : `${key}: ${type}`;
        }),
        "range: Range = [0, 0]",
      ].join(", ")}): ${node.name} {
                ${argChecks.join("\n")}
                return {
                    _kind: ${JSON.stringify(node.name)},
                    ${[...node.fields.map((field) => field.name), "range"].join(
                      ", "
                    )}
                }
            }
            `
    );
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
        case "NodeGroup":
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

  return prettier.format(output.join("\n"), PRETTIER_OPTIONS);
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

function main() {
  const grammar = parseGrammarDefinition();
  const code = generateCode(grammar);
  writeFile(code, OUTPUT_FILE);
}

try {
  main();
} catch (e: unknown) {
  console.error(chalk.red(`Error: ${(e as Error).message}`));
  process.exit(2);
}
