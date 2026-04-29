import type { LiveText } from "@liveblocks/client";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";

import {
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  getLiveblocksNodeType,
  type LiveblocksTiptapNode,
} from "./schema";

export type LiveblocksTiptapPosition = {
  anchor: number;
  head: number;
};

export function selectionToLiveblocksPosition(
  selection: Selection
): LiveblocksTiptapPosition {
  return {
    anchor: selection.anchor,
    head: selection.head,
  };
}

export function clampLiveblocksPosition(
  position: LiveblocksTiptapPosition,
  max: number
): LiveblocksTiptapPosition {
  return {
    anchor: Math.max(0, Math.min(position.anchor, max)),
    head: Math.max(0, Math.min(position.head, max)),
  };
}

export type LiveblocksTextRange = {
  from: number;
  to: number;
  liveOffset: number;
  node: LiveblocksTiptapNode;
  nodeId: string;
  text: LiveText;
};

export type LiveblocksTreeIndex = {
  textRanges: LiveblocksTextRange[];
};

function childStart(parent: ProseMirrorNode, parentPos: number): number {
  return parent.type.name === "doc" ? parentPos : parentPos + 1;
}

function indexChildren(
  textRanges: LiveblocksTextRange[],
  pmParent: ProseMirrorNode,
  liveParent: LiveblocksTiptapNode,
  parentPos: number
): void {
  const liveContent = getLiveblocksNodeContent(liveParent);
  if (liveContent === undefined) {
    return;
  }

  let pmChildIndex = 0;
  let pmOffset = 0;
  const start = childStart(pmParent, parentPos);

  for (let liveIndex = 0; liveIndex < liveContent.length; liveIndex++) {
    const liveChild = liveContent.get(liveIndex);
    const pmChild = pmParent.maybeChild(pmChildIndex);
    if (liveChild === undefined || pmChild === null) {
      return;
    }

    if (getLiveblocksNodeType(liveChild) === "text") {
      const text = getLiveblocksNodeText(liveChild);
      if (text === undefined) {
        return;
      }

      let liveOffset = 0;
      let remaining = text.length;

      while (remaining > 0) {
        const textChild = pmParent.maybeChild(pmChildIndex);
        if (textChild === null || !textChild.isText) {
          return;
        }

        const length = Math.min(remaining, textChild.nodeSize);
        const from = start + pmOffset;

        textRanges.push({
          from,
          to: from + length,
          liveOffset,
          node: liveChild,
          nodeId: getLiveblocksNodeId(liveChild),
          text,
        });

        liveOffset += length;
        remaining -= length;
        pmOffset += textChild.nodeSize;
        pmChildIndex++;
      }
    } else {
      const from = start + pmOffset;
      indexChildren(textRanges, pmChild, liveChild, from);
      pmOffset += pmChild.nodeSize;
      pmChildIndex++;
    }
  }
}

export function buildLiveblocksTreeIndex(
  pmDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode
): LiveblocksTreeIndex {
  const textRanges: LiveblocksTextRange[] = [];
  indexChildren(textRanges, pmDoc, liveRoot, 0);
  return { textRanges };
}

export function findTextRangeAtPosition(
  index: LiveblocksTreeIndex,
  position: number
): LiveblocksTextRange | undefined {
  return index.textRanges.find(
    (range) => position >= range.from && position <= range.to
  );
}

export function findTextRangesInRange(
  index: LiveblocksTreeIndex,
  from: number,
  to: number
): LiveblocksTextRange[] {
  return index.textRanges.filter(
    (range) => Math.max(range.from, from) < Math.min(range.to, to)
  );
}

export function findTextRangeByLiveText(
  index: LiveblocksTreeIndex,
  text: LiveText
): LiveblocksTextRange | undefined {
  return index.textRanges.find((range) => range.text === text);
}
