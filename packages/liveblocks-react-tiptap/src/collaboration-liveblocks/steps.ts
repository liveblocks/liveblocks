import { type JsonObject,LiveText } from "@liveblocks/client";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

import {
  buildLiveblocksTreeIndex,
  findTextRangeAtPosition,
  type LiveblocksTreeIndex,
} from "./mapping";
import {
  type LiveblocksTiptapNode,
  marksToAttributes,
  marksToAttributesPatch,
  type ProseMirrorJsonMark,
} from "./schema";

export type IncrementalOperation =
  | {
      type: "insert";
      text: string;
      index: number;
      attributes?: JsonObject;
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
    } else if (JSON.stringify(marks ?? []) !== JSON.stringify(nodeMarks ?? [])) {
      return undefined;
    }

    text += nodeText;
  }

  return { text, marks };
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

function classifyReplaceStep(
  step: ReplaceStepJson,
  index: LiveblocksTreeIndex
): IncrementalOperation[] | undefined {
  const inserted = getTextContentFromSlice(step.slice);
  if (inserted === undefined) {
    return undefined;
  }

  const operations: IncrementalOperation[] = [];

  if (step.from !== step.to) {
    const fromRange = findTextRangeAtPosition(index, step.from);
    const toRange = findTextRangeAtPosition(index, step.to);

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
    const range = findTextRangeAtPosition(index, step.from);
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

function marksFromNode(node: ProseMirrorNode): ProseMirrorJsonMark[] | undefined {
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
      return;
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
  });

  return operations.length > 0 ? operations : undefined;
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
  const oldIndex = buildLiveblocksTreeIndex(oldDoc, liveRoot);

  const operations = isReplaceStepJson(stepJson)
    ? classifyReplaceStep(stepJson, oldIndex)
    : isMarkStepJson(stepJson)
      ? classifyMarkStep(stepJson, oldIndex, newDoc)
      : undefined;

  if (operations === undefined) {
    return { type: "unsupported" };
  }

  return { type: "incremental", operations };
}

export function applyIncrementalOperations(
  operations: readonly IncrementalOperation[]
): void {
  for (const operation of operations) {
    const text = operation.node.get("text");
    if (!(text instanceof LiveText)) {
      continue;
    }

    if (operation.type === "insert") {
      text.insert(operation.index, operation.text, operation.attributes);
    } else if (operation.type === "delete") {
      text.delete(operation.index, operation.length);
    } else {
      text.format(operation.index, operation.length, operation.attributes);
    }
  }
}
