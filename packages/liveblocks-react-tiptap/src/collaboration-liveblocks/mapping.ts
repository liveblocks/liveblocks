import type { LiveList, LiveText } from "@liveblocks/client";
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

export type LiveblocksNodeRange = {
  childIndex?: number;
  content?: LiveList<LiveblocksTiptapNode>;
  from: number;
  node: LiveblocksTiptapNode;
  nodeId: string;
  parent?: LiveblocksTiptapNode;
  pmNode: ProseMirrorNode;
  to: number;
};

export type LiveblocksListRange = {
  content: LiveList<LiveblocksTiptapNode>;
  from: number;
  node: LiveblocksTiptapNode;
  nodeId: string;
  pmNode: ProseMirrorNode;
  to: number;
};

export type LiveblocksTreeIndex = {
  listRanges: LiveblocksListRange[];
  nodeRanges: LiveblocksNodeRange[];
  textRanges: LiveblocksTextRange[];
};

function childStart(parent: ProseMirrorNode, parentPos: number): number {
  return parent.type.name === "doc" ? parentPos : parentPos + 1;
}

function indexChildren(
  nodeRanges: LiveblocksNodeRange[],
  listRanges: LiveblocksListRange[],
  textRanges: LiveblocksTextRange[],
  pmParent: ProseMirrorNode,
  liveParent: LiveblocksTiptapNode,
  parentPos: number
): void {
  const liveContent = getLiveblocksNodeContent(liveParent);
  if (liveContent === undefined) {
    return;
  }

  listRanges.push({
    content: liveContent,
    from: parentPos,
    node: liveParent,
    nodeId: getLiveblocksNodeId(liveParent),
    pmNode: pmParent,
    to: parentPos + pmParent.nodeSize,
  });

  let pmChildIndex = 0;
  let pmOffset = 0;
  const start = childStart(pmParent, parentPos);

  for (let liveIndex = 0; liveIndex < liveContent.length; liveIndex++) {
    const liveChild = liveContent.get(liveIndex);
    const pmChild = pmParent.maybeChild(pmChildIndex);
    if (liveChild === undefined || pmChild === null) {
      return;
    }

    const from = start + pmOffset;
    const to = from + pmChild.nodeSize;

    nodeRanges.push({
      childIndex: liveIndex,
      content: liveContent,
      from,
      node: liveChild,
      nodeId: getLiveblocksNodeId(liveChild),
      parent: liveParent,
      pmNode: pmChild,
      to,
    });

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
        const textFrom = start + pmOffset;

        textRanges.push({
          from: textFrom,
          to: textFrom + length,
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
      indexChildren(
        nodeRanges,
        listRanges,
        textRanges,
        pmChild,
        liveChild,
        from
      );
      pmOffset += pmChild.nodeSize;
      pmChildIndex++;
    }
  }
}

export function buildLiveblocksTreeIndex(
  pmDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode
): LiveblocksTreeIndex {
  const nodeRanges: LiveblocksNodeRange[] = [
    {
      from: 0,
      node: liveRoot,
      nodeId: getLiveblocksNodeId(liveRoot),
      pmNode: pmDoc,
      to: pmDoc.content.size,
    },
  ];
  const listRanges: LiveblocksListRange[] = [];
  const textRanges: LiveblocksTextRange[] = [];
  indexChildren(nodeRanges, listRanges, textRanges, pmDoc, liveRoot, 0);
  return { listRanges, nodeRanges, textRanges };
}

export function findTextRangeAtPosition(
  index: LiveblocksTreeIndex,
  position: number
): LiveblocksTextRange | undefined {
  return index.textRanges.find(
    (range) => position >= range.from && position <= range.to
  );
}

function findTextRangeAtPositionInChildren(
  pmParent: ProseMirrorNode,
  liveParent: LiveblocksTiptapNode,
  parentPos: number,
  position: number
): LiveblocksTextRange | undefined {
  const liveContent = getLiveblocksNodeContent(liveParent);
  if (liveContent === undefined) {
    return undefined;
  }

  let pmChildIndex = 0;
  let pmOffset = 0;
  const start = childStart(pmParent, parentPos);

  for (let liveIndex = 0; liveIndex < liveContent.length; liveIndex++) {
    const liveChild = liveContent.get(liveIndex);
    const pmChild = pmParent.maybeChild(pmChildIndex);
    if (liveChild === undefined || pmChild === null) {
      return undefined;
    }

    if (getLiveblocksNodeType(liveChild) === "text") {
      const text = getLiveblocksNodeText(liveChild);
      if (text === undefined) {
        return undefined;
      }

      let liveOffset = 0;
      let remaining = text.length;

      while (remaining > 0) {
        const textChild = pmParent.maybeChild(pmChildIndex);
        if (textChild === null || !textChild.isText) {
          return undefined;
        }

        const length = Math.min(remaining, textChild.nodeSize);
        const from = start + pmOffset;
        const to = from + length;

        if (position >= from && position <= to) {
          return {
            from,
            to,
            liveOffset,
            node: liveChild,
            nodeId: getLiveblocksNodeId(liveChild),
            text,
          };
        }

        liveOffset += length;
        remaining -= length;
        pmOffset += textChild.nodeSize;
        pmChildIndex++;
      }
    } else {
      const from = start + pmOffset;
      const to = from + pmChild.nodeSize;

      if (position >= from && position <= to) {
        return findTextRangeAtPositionInChildren(
          pmChild,
          liveChild,
          from,
          position
        );
      }

      pmOffset += pmChild.nodeSize;
      pmChildIndex++;
    }
  }

  return undefined;
}

export function findTextRangeAtPositionInDocument(
  pmDoc: ProseMirrorNode,
  liveRoot: LiveblocksTiptapNode,
  position: number
): LiveblocksTextRange | undefined {
  return findTextRangeAtPositionInChildren(pmDoc, liveRoot, 0, position);
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

export function findNodeRangeByLiveNode(
  index: LiveblocksTreeIndex,
  node: LiveblocksTiptapNode
): LiveblocksNodeRange | undefined {
  return index.nodeRanges.find((range) => range.node === node);
}

export function findListRangeByLiveList(
  index: LiveblocksTreeIndex,
  content: unknown
): LiveblocksListRange | undefined {
  return index.listRanges.find((range) => range.content === content);
}

export function getChildPosition(
  parent: ProseMirrorNode,
  parentPos: number,
  index: number
): number | undefined {
  if (index < 0 || index > parent.childCount) {
    return undefined;
  }

  let offset = 0;
  for (let childIndex = 0; childIndex < index; childIndex++) {
    const child = parent.maybeChild(childIndex);
    if (child === null) {
      return undefined;
    }

    offset += child.nodeSize;
  }

  return childStart(parent, parentPos) + offset;
}
