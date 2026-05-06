import { type JsonObject, type LiveList, LiveText } from "@liveblocks/client";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

import {
  buildLiveblocksTreeIndex,
  findTextRangeAtPosition,
  findTextRangeAtPositionInDocument,
  type LiveblocksTreeIndex,
} from "./mapping";
import {
  createLiveblocksTiptapNode,
  getLiveblocksNodeContent,
  type LiveblocksTiptapNode,
  marksToAttributes,
  marksToAttributesPatch,
  type ProseMirrorJsonMark,
  type ProseMirrorJsonNode,
  updateLiveblocksNodeAttrs,
} from "./schema";

export type IncrementalOperation =
  | {
      type: "insert";
      text: string;
      index: number;
      attributes?: ReturnType<typeof marksToAttributes>;
      node: LiveblocksTiptapNode;
    }
  | {
      type: "delete";
      index: number;
      length: number;
      node: LiveblocksTiptapNode;
    }
  | {
      type: "format";
      index: number;
      length: number;
      attributes: ReturnType<typeof marksToAttributesPatch>;
      node: LiveblocksTiptapNode;
    }
  | {
      type: "insertNode";
      content: LiveList<LiveblocksTiptapNode>;
      index: number;
      node: LiveblocksTiptapNode;
    }
  | {
      type: "deleteNode";
      content: LiveList<LiveblocksTiptapNode>;
      index: number;
    }
  | {
      type: "setNode";
      content: LiveList<LiveblocksTiptapNode>;
      index: number;
      node: LiveblocksTiptapNode;
    }
  | {
      type: "updateAttrs";
      attrs: JsonObject | undefined;
      node: LiveblocksTiptapNode;
    };

export type ClassifiedTransaction =
  | {
      type: "incremental";
      operations: IncrementalOperation[];
    }
  | {
      type: "unsupported";
    };

type ReplaceStepJson = {
  stepType: "replace";
  from: number;
  to: number;
  slice?: {
    content?: unknown[];
  };
};

type MarkStepJson = {
  stepType: "addMark" | "removeMark";
  from: number;
  to: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMarks(value: unknown): ProseMirrorJsonMark[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const marks: ProseMirrorJsonMark[] = [];

  for (const mark of value) {
    if (!isObject(mark) || typeof mark.type !== "string") {
      return undefined;
    }

    marks.push({
      type: mark.type,
      ...(isJsonObject(mark.attrs) ? { attrs: mark.attrs } : {}),
    });
  }

  return marks.length > 0 ? marks : undefined;
}

function parseProseMirrorJsonNode(
  value: unknown
): ProseMirrorJsonNode | undefined {
  if (!isObject(value) || typeof value.type !== "string") {
    return undefined;
  }

  const node: ProseMirrorJsonNode = { type: value.type };

  if (isJsonObject(value.attrs)) {
    node.attrs = value.attrs;
  }

  if (typeof value.text === "string") {
    node.text = value.text;
  }

  const marks = parseMarks(value.marks);
  if (marks !== undefined) {
    node.marks = marks;
  }

  if (Array.isArray(value.content)) {
    const content: ProseMirrorJsonNode[] = [];
    for (const child of value.content) {
      const parsedChild = parseProseMirrorJsonNode(child);
      if (parsedChild === undefined) {
        return undefined;
      }

      content.push(parsedChild);
    }

    node.content = content;
  }

  return node;
}

function prosemirrorNodeToJson(
  node: ProseMirrorNode
): ProseMirrorJsonNode | undefined {
  return parseProseMirrorJsonNode(node.toJSON());
}

function getNodeAttrs(node: ProseMirrorNode): JsonObject | undefined {
  return prosemirrorNodeToJson(node)?.attrs;
}

function isReplaceStepJson(value: unknown): value is ReplaceStepJson {
  return (
    isObject(value) &&
    value.stepType === "replace" &&
    typeof value.from === "number" &&
    typeof value.to === "number"
  );
}

function isMarkStepJson(value: unknown): value is MarkStepJson {
  return (
    isObject(value) &&
    (value.stepType === "addMark" || value.stepType === "removeMark") &&
    typeof value.from === "number" &&
    typeof value.to === "number"
  );
}

function getTextContentFromSlice(
  slice: ReplaceStepJson["slice"]
): { text: string; marks?: ProseMirrorJsonMark[] } | undefined {
  const content = slice?.content;
  if (content === undefined || content.length === 0) {
    return { text: "" };
  }

  let text = "";
  let marks: ProseMirrorJsonMark[] | undefined;

  for (const node of content) {
    if (!isObject(node) || node.type !== "text") {
      return undefined;
    }

    const nodeText = node.text;
    if (typeof nodeText !== "string") {
      return undefined;
    }

    const nodeMarks = parseMarks(node.marks);
    if (text.length === 0) {
      marks = nodeMarks;
    } else if (
      JSON.stringify(marks ?? []) !== JSON.stringify(nodeMarks ?? [])
    ) {
      return undefined;
    }

    text += nodeText;
  }

  return { text, marks };
}

function classifyReplaceStep(
  step: ReplaceStepJson,
  oldDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode
): IncrementalOperation[] | undefined {
  const inserted = getTextContentFromSlice(step.slice);
  if (inserted === undefined) {
    return undefined;
  }

  const operations: IncrementalOperation[] = [];

  if (step.from !== step.to) {
    const fromRange = findTextRangeAtPositionInDocument(
      oldDoc,
      liveRoot,
      step.from
    );
    const toRange = findTextRangeAtPositionInDocument(
      oldDoc,
      liveRoot,
      step.to
    );

    if (
      fromRange === undefined ||
      toRange === undefined ||
      fromRange.nodeId !== toRange.nodeId
    ) {
      return undefined;
    }

    operations.push({
      type: "delete",
      node: fromRange.node,
      index: fromRange.liveOffset + step.from - fromRange.from,
      length: step.to - step.from,
    });
  }

  if (inserted.text.length > 0) {
    const range = findTextRangeAtPositionInDocument(
      oldDoc,
      liveRoot,
      step.from
    );
    if (range === undefined) {
      return undefined;
    }

    operations.push({
      type: "insert",
      node: range.node,
      index: range.liveOffset + step.from - range.from,
      text: inserted.text,
      attributes: marksToAttributes(inserted.marks),
    });
  }

  return operations.length > 0 ? operations : undefined;
}

function marksFromNode(
  node: ProseMirrorNode
): ProseMirrorJsonMark[] | undefined {
  const marks = node.marks.map((mark) => {
    const json: unknown = mark.toJSON();
    if (!isObject(json) || typeof json.type !== "string") {
      return undefined;
    }

    return {
      type: json.type,
      ...(isJsonObject(json.attrs) ? { attrs: json.attrs } : {}),
    };
  });

  const parsedMarks = marks.filter((mark) => mark !== undefined);
  return parsedMarks.length > 0 ? parsedMarks : undefined;
}

function classifyMarkStep(
  step: MarkStepJson,
  oldIndex: LiveblocksTreeIndex,
  newDoc: ProseMirrorNode
): IncrementalOperation[] | undefined {
  const operations: IncrementalOperation[] = [];

  newDoc.nodesBetween(step.from, step.to, (node, pos) => {
    if (!node.isText || node.nodeSize === 0) {
      return true;
    }

    const from = Math.max(step.from, pos);
    const to = Math.min(step.to, pos + node.nodeSize);
    const range = findTextRangeAtPosition(oldIndex, from);

    if (range === undefined || to <= from) {
      operations.length = 0;
      return false;
    }

    operations.push({
      type: "format",
      node: range.node,
      index: range.liveOffset + from - range.from,
      length: to - from,
      attributes: marksToAttributesPatch(marksFromNode(node)),
    });

    return true;
  });

  return operations.length > 0 ? operations : undefined;
}

function createNodeOperation(
  type: "insertNode" | "setNode",
  content: LiveList<LiveblocksTiptapNode>,
  index: number,
  node: ProseMirrorNode
): IncrementalOperation | undefined {
  const jsonNode = prosemirrorNodeToJson(node);
  if (jsonNode === undefined) {
    return undefined;
  }

  return {
    type,
    content,
    index,
    node: createLiveblocksTiptapNode(jsonNode),
  };
}

function classifyAttrsChange(
  oldNode: ProseMirrorNode,
  newNode: ProseMirrorNode,
  liveNode: LiveblocksTiptapNode
): IncrementalOperation[] | undefined {
  if (
    oldNode.isText ||
    oldNode.type !== newNode.type ||
    !oldNode.content.eq(newNode.content) ||
    oldNode.sameMarkup(newNode)
  ) {
    return undefined;
  }

  return [
    { type: "updateAttrs", node: liveNode, attrs: getNodeAttrs(newNode) },
  ];
}

function findCommonPrefix(
  oldParent: ProseMirrorNode,
  newParent: ProseMirrorNode
): number {
  const max = Math.min(oldParent.childCount, newParent.childCount);
  let prefix = 0;

  while (prefix < max && oldParent.child(prefix).eq(newParent.child(prefix))) {
    prefix++;
  }

  return prefix;
}

function findCommonSuffix(
  oldParent: ProseMirrorNode,
  newParent: ProseMirrorNode,
  prefix: number
): number {
  const max = Math.min(
    oldParent.childCount - prefix,
    newParent.childCount - prefix
  );
  let suffix = 0;

  while (
    suffix < max &&
    oldParent
      .child(oldParent.childCount - suffix - 1)
      .eq(newParent.child(newParent.childCount - suffix - 1))
  ) {
    suffix++;
  }

  return suffix;
}

function classifyChildrenChange(
  oldParent: ProseMirrorNode,
  newParent: ProseMirrorNode,
  liveParent: LiveblocksTiptapNode
): IncrementalOperation[] | undefined {
  const content = getLiveblocksNodeContent(liveParent);
  if (content === undefined) {
    return undefined;
  }

  if (oldParent.childCount === newParent.childCount) {
    const operations: IncrementalOperation[] = [];

    for (let index = 0; index < oldParent.childCount; index++) {
      const oldChild = oldParent.child(index);
      const newChild = newParent.child(index);
      if (oldChild.eq(newChild)) {
        continue;
      }

      const liveChild = content.get(index);
      if (liveChild === undefined) {
        return undefined;
      }

      const childOperations =
        classifyAttrsChange(oldChild, newChild, liveChild) ??
        classifyNodeChange(oldChild, newChild, liveChild);

      if (childOperations !== undefined) {
        operations.push(...childOperations);
        continue;
      }

      const operation = createNodeOperation(
        "setNode",
        content,
        index,
        newChild
      );
      if (operation === undefined) {
        return undefined;
      }

      operations.push(operation);
    }

    return operations.length > 0 ? operations : undefined;
  }

  const prefix = findCommonPrefix(oldParent, newParent);
  const suffix = findCommonSuffix(oldParent, newParent, prefix);

  if (
    oldParent.childCount + 1 === newParent.childCount &&
    prefix + suffix === oldParent.childCount
  ) {
    const operation = createNodeOperation(
      "insertNode",
      content,
      prefix,
      newParent.child(prefix)
    );
    return operation === undefined ? undefined : [operation];
  }

  if (
    oldParent.childCount + 1 === newParent.childCount &&
    prefix + suffix + 1 === oldParent.childCount
  ) {
    const setOperation = createNodeOperation(
      "setNode",
      content,
      prefix,
      newParent.child(prefix)
    );
    const insertOperation = createNodeOperation(
      "insertNode",
      content,
      prefix + 1,
      newParent.child(prefix + 1)
    );

    return setOperation === undefined || insertOperation === undefined
      ? undefined
      : [setOperation, insertOperation];
  }

  if (
    oldParent.childCount - 1 === newParent.childCount &&
    prefix + suffix === newParent.childCount
  ) {
    return [{ type: "deleteNode", content, index: prefix }];
  }

  if (
    oldParent.childCount - 1 === newParent.childCount &&
    prefix + suffix + 1 === newParent.childCount
  ) {
    const operation = createNodeOperation(
      "setNode",
      content,
      prefix,
      newParent.child(prefix)
    );

    return operation === undefined
      ? undefined
      : [operation, { type: "deleteNode", content, index: prefix + 1 }];
  }

  return undefined;
}

function classifyNodeChange(
  oldNode: ProseMirrorNode,
  newNode: ProseMirrorNode,
  liveNode: LiveblocksTiptapNode
): IncrementalOperation[] | undefined {
  const attrOperations = classifyAttrsChange(oldNode, newNode, liveNode) ?? [];
  const childOperations =
    oldNode.type === newNode.type
      ? classifyChildrenChange(oldNode, newNode, liveNode)
      : undefined;
  const operations = [...attrOperations, ...(childOperations ?? [])];

  return operations.length > 0 ? operations : undefined;
}

function classifyStructuralChange(
  oldDoc: ProseMirrorNode,
  newDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode
): IncrementalOperation[] | undefined {
  return classifyNodeChange(oldDoc, newDoc, liveRoot);
}

export function classifyTransaction(
  transactions: readonly Transaction[],
  oldDoc: ProseMirrorNode,
  newDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode
): ClassifiedTransaction {
  const changedTransactions = transactions.filter(
    (transaction) => transaction.docChanged
  );

  if (changedTransactions.length !== 1) {
    return { type: "unsupported" };
  }

  const [transaction] = changedTransactions;
  if (transaction === undefined || transaction.steps.length !== 1) {
    return { type: "unsupported" };
  }

  const [step] = transaction.steps;
  const stepJson: unknown = step?.toJSON();

  const operations = isReplaceStepJson(stepJson)
    ? classifyReplaceStep(stepJson, oldDoc, liveRoot)
    : isMarkStepJson(stepJson)
      ? classifyMarkStep(
          stepJson,
          buildLiveblocksTreeIndex(oldDoc, liveRoot),
          newDoc
        )
      : undefined;

  const structuralOperations =
    operations ?? classifyStructuralChange(oldDoc, newDoc, liveRoot);

  if (structuralOperations === undefined) {
    return { type: "unsupported" };
  }

  return { type: "incremental", operations: structuralOperations };
}

export function applyIncrementalOperations(
  operations: readonly IncrementalOperation[]
): void {
  for (const operation of operations) {
    if (operation.type === "insert") {
      const text = operation.node.get("text");
      if (!(text instanceof LiveText)) {
        continue;
      }

      text.insert(operation.index, operation.text, operation.attributes);
    } else if (operation.type === "delete") {
      const text = operation.node.get("text");
      if (!(text instanceof LiveText)) {
        continue;
      }

      text.delete(operation.index, operation.length);
    } else if (operation.type === "format") {
      const text = operation.node.get("text");
      if (!(text instanceof LiveText)) {
        continue;
      }

      text.format(operation.index, operation.length, operation.attributes);
    } else if (operation.type === "insertNode") {
      operation.content.insert(operation.node, operation.index);
    } else if (operation.type === "deleteNode") {
      operation.content.delete(operation.index);
    } else if (operation.type === "setNode") {
      operation.content.set(operation.index, operation.node);
    } else {
      updateLiveblocksNodeAttrs(operation.node, operation.attrs);
    }
  }
}
