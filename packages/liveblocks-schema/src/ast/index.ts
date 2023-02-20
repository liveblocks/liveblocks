/**
 * This file is AUTOMATICALLY GENERATED.
 * DO NOT edit this file manually.
 *
 * Instead, update the `ast.grammar` file, and re-run `npm run build-ast`
 */

const DEBUG = process.env.NODE_ENV !== "production";

function assert(condition: boolean, errmsg: string): asserts condition {
  if (condition) return;
  throw new Error(errmsg);
}

function assertRange(
  range: unknown,
  currentContext: string
): asserts range is Range {
  assert(
    isRange(range),
    `Invalid value for range in "${JSON.stringify(
      currentContext
    )}".\nExpected: Range\nGot: ${JSON.stringify(range)}`
  );
}

export function isBuiltInScalar(node: Node): node is BuiltInScalar {
  return (
    node._kind === "StringType" ||
    node._kind === "IntType" ||
    node._kind === "FloatType" ||
    node._kind === "BooleanType"
  );
}

export function isDefinition(node: Node): node is Definition {
  return node._kind === "ObjectTypeDefinition";
}

export function isTypeExpr(node: Node): node is TypeExpr {
  return (
    node._kind === "ObjectLiteralExpr" ||
    node._kind === "TypeRef" ||
    isBuiltInScalar(node)
  );
}

export type BuiltInScalar = StringType | IntType | FloatType | BooleanType;

export type Definition = ObjectTypeDefinition;

export type TypeExpr = BuiltInScalar | ObjectLiteralExpr | TypeRef;

export type Range = [number, number];

export type Node =
  | BooleanType
  | Document
  | FieldDef
  | FloatType
  | Identifier
  | IntType
  | ObjectLiteralExpr
  | ObjectTypeDefinition
  | StringType
  | TypeName
  | TypeRef;

export function isRange(thing: unknown): thing is Range {
  return (
    Array.isArray(thing) &&
    thing.length === 2 &&
    typeof thing[0] === "number" &&
    typeof thing[1] === "number"
  );
}

export function isNode(node: Node): node is Node {
  return (
    node._kind === "BooleanType" ||
    node._kind === "Document" ||
    node._kind === "FieldDef" ||
    node._kind === "FloatType" ||
    node._kind === "Identifier" ||
    node._kind === "IntType" ||
    node._kind === "ObjectLiteralExpr" ||
    node._kind === "ObjectTypeDefinition" ||
    node._kind === "StringType" ||
    node._kind === "TypeName" ||
    node._kind === "TypeRef"
  );
}

export type BooleanType = {
  _kind: "BooleanType";

  range: Range;
};

export type Document = {
  _kind: "Document";
  definitions: Definition[];
  range: Range;
};

export type FieldDef = {
  _kind: "FieldDef";
  name: Identifier;
  optional: boolean;
  type: TypeExpr;
  range: Range;
};

export type FloatType = {
  _kind: "FloatType";

  range: Range;
};

export type Identifier = {
  _kind: "Identifier";
  name: string;
  range: Range;
};

export type IntType = {
  _kind: "IntType";

  range: Range;
};

export type ObjectLiteralExpr = {
  _kind: "ObjectLiteralExpr";
  fields: FieldDef[];
  range: Range;
};

export type ObjectTypeDefinition = {
  _kind: "ObjectTypeDefinition";
  name: TypeName;
  fields: FieldDef[];
  isStatic: boolean;
  range: Range;
};

export type StringType = {
  _kind: "StringType";

  range: Range;
};

export type TypeName = {
  _kind: "TypeName";
  name: string;
  range: Range;
};

export type TypeRef = {
  _kind: "TypeRef";
  ref: TypeName;
  asLiveObject: boolean;
  range: Range;
};

export function booleanType(range: Range = [0, 0]): BooleanType {
  DEBUG &&
    (() => {
      assertRange(range, "BooleanType");
    })();
  return {
    _kind: "BooleanType",
    range,
  };
}

export function document(
  definitions: Definition[],
  range: Range = [0, 0]
): Document {
  DEBUG &&
    (() => {
      assert(
        Array.isArray(definitions) &&
          definitions.length > 0 &&
          definitions.every((item) => isDefinition(item)),
        `Invalid value for "definitions" arg in "Document" call.\nExpected: @Definition+\nGot:      ${JSON.stringify(
          definitions
        )}`
      );
      assertRange(range, "Document");
    })();
  return {
    _kind: "Document",
    definitions,
    range,
  };
}

export function fieldDef(
  name: Identifier,
  optional: boolean,
  type: TypeExpr,
  range: Range = [0, 0]
): FieldDef {
  DEBUG &&
    (() => {
      assert(
        name._kind === "Identifier",
        `Invalid value for "name" arg in "FieldDef" call.\nExpected: Identifier\nGot:      ${JSON.stringify(
          name
        )}`
      );
      assert(
        typeof optional === "boolean",
        `Invalid value for "optional" arg in "FieldDef" call.\nExpected: boolean\nGot:      ${JSON.stringify(
          optional
        )}`
      );
      assert(
        isTypeExpr(type),
        `Invalid value for "type" arg in "FieldDef" call.\nExpected: @TypeExpr\nGot:      ${JSON.stringify(
          type
        )}`
      );
      assertRange(range, "FieldDef");
    })();
  return {
    _kind: "FieldDef",
    name,
    optional,
    type,
    range,
  };
}

export function floatType(range: Range = [0, 0]): FloatType {
  DEBUG &&
    (() => {
      assertRange(range, "FloatType");
    })();
  return {
    _kind: "FloatType",
    range,
  };
}

export function identifier(name: string, range: Range = [0, 0]): Identifier {
  DEBUG &&
    (() => {
      assert(
        typeof name === "string",
        `Invalid value for "name" arg in "Identifier" call.\nExpected: string\nGot:      ${JSON.stringify(
          name
        )}`
      );
      assertRange(range, "Identifier");
    })();
  return {
    _kind: "Identifier",
    name,
    range,
  };
}

export function intType(range: Range = [0, 0]): IntType {
  DEBUG &&
    (() => {
      assertRange(range, "IntType");
    })();
  return {
    _kind: "IntType",
    range,
  };
}

export function objectLiteralExpr(
  fields: FieldDef[] = [],
  range: Range = [0, 0]
): ObjectLiteralExpr {
  DEBUG &&
    (() => {
      assert(
        Array.isArray(fields) &&
          fields.every((item) => item._kind === "FieldDef"),
        `Invalid value for "fields" arg in "ObjectLiteralExpr" call.\nExpected: FieldDef*\nGot:      ${JSON.stringify(
          fields
        )}`
      );
      assertRange(range, "ObjectLiteralExpr");
    })();
  return {
    _kind: "ObjectLiteralExpr",
    fields,
    range,
  };
}

export function objectTypeDefinition(
  name: TypeName,
  fields: FieldDef[],
  isStatic: boolean,
  range: Range = [0, 0]
): ObjectTypeDefinition {
  DEBUG &&
    (() => {
      assert(
        name._kind === "TypeName",
        `Invalid value for "name" arg in "ObjectTypeDefinition" call.\nExpected: TypeName\nGot:      ${JSON.stringify(
          name
        )}`
      );
      assert(
        Array.isArray(fields) &&
          fields.every((item) => item._kind === "FieldDef"),
        `Invalid value for "fields" arg in "ObjectTypeDefinition" call.\nExpected: FieldDef*\nGot:      ${JSON.stringify(
          fields
        )}`
      );
      assert(
        typeof isStatic === "boolean",
        `Invalid value for "isStatic" arg in "ObjectTypeDefinition" call.\nExpected: boolean\nGot:      ${JSON.stringify(
          isStatic
        )}`
      );
      assertRange(range, "ObjectTypeDefinition");
    })();
  return {
    _kind: "ObjectTypeDefinition",
    name,
    fields,
    isStatic,
    range,
  };
}

export function stringType(range: Range = [0, 0]): StringType {
  DEBUG &&
    (() => {
      assertRange(range, "StringType");
    })();
  return {
    _kind: "StringType",
    range,
  };
}

export function typeName(name: string, range: Range = [0, 0]): TypeName {
  DEBUG &&
    (() => {
      assert(
        typeof name === "string",
        `Invalid value for "name" arg in "TypeName" call.\nExpected: string\nGot:      ${JSON.stringify(
          name
        )}`
      );
      assertRange(range, "TypeName");
    })();
  return {
    _kind: "TypeName",
    name,
    range,
  };
}

export function typeRef(
  ref: TypeName,
  asLiveObject: boolean,
  range: Range = [0, 0]
): TypeRef {
  DEBUG &&
    (() => {
      assert(
        ref._kind === "TypeName",
        `Invalid value for "ref" arg in "TypeRef" call.\nExpected: TypeName\nGot:      ${JSON.stringify(
          ref
        )}`
      );
      assert(
        typeof asLiveObject === "boolean",
        `Invalid value for "asLiveObject" arg in "TypeRef" call.\nExpected: boolean\nGot:      ${JSON.stringify(
          asLiveObject
        )}`
      );
      assertRange(range, "TypeRef");
    })();
  return {
    _kind: "TypeRef",
    ref,
    asLiveObject,
    range,
  };
}

interface Visitor<TContext> {
  BooleanType?(node: BooleanType, context: TContext): void;
  Document?(node: Document, context: TContext): void;
  FieldDef?(node: FieldDef, context: TContext): void;
  FloatType?(node: FloatType, context: TContext): void;
  Identifier?(node: Identifier, context: TContext): void;
  IntType?(node: IntType, context: TContext): void;
  ObjectLiteralExpr?(node: ObjectLiteralExpr, context: TContext): void;
  ObjectTypeDefinition?(node: ObjectTypeDefinition, context: TContext): void;
  StringType?(node: StringType, context: TContext): void;
  TypeName?(node: TypeName, context: TContext): void;
  TypeRef?(node: TypeRef, context: TContext): void;
}

export function visit<TNode extends Node>(
  node: TNode,
  visitor: Visitor<undefined>
): TNode;
export function visit<TNode extends Node, TContext>(
  node: TNode,
  visitor: Visitor<TContext>,
  context: TContext
): TNode;
export function visit<TNode extends Node, TContext>(
  node: TNode,
  visitor: Visitor<TContext | undefined>,
  context?: TContext
): TNode {
  switch (node._kind) {
    case "BooleanType":
      visitor.BooleanType?.(node, context);
      break;

    case "Document":
      visitor.Document?.(node, context);
      node.definitions.forEach((d) => visit(d, visitor, context));
      break;

    case "FieldDef":
      visitor.FieldDef?.(node, context);
      visit(node.name, visitor, context);
      visit(node.type, visitor, context);
      break;

    case "FloatType":
      visitor.FloatType?.(node, context);
      break;

    case "Identifier":
      visitor.Identifier?.(node, context);
      break;

    case "IntType":
      visitor.IntType?.(node, context);
      break;

    case "ObjectLiteralExpr":
      visitor.ObjectLiteralExpr?.(node, context);
      node.fields.forEach((f) => visit(f, visitor, context));
      break;

    case "ObjectTypeDefinition":
      visitor.ObjectTypeDefinition?.(node, context);
      visit(node.name, visitor, context);
      node.fields.forEach((f) => visit(f, visitor, context));
      break;

    case "StringType":
      visitor.StringType?.(node, context);
      break;

    case "TypeName":
      visitor.TypeName?.(node, context);
      break;

    case "TypeRef":
      visitor.TypeRef?.(node, context);
      visit(node.ref, visitor, context);
      break;
  }

  return node;
}
