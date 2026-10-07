import { LiveList, LiveMap, type Json } from "@liveblocks/node";
import {
  createLiveblocksProsemirrorNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksProsemirrorNodeToJsonNodes,
  type LiveblocksProsemirrorNode,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import { diffAsReplace } from "@/lib/documents";

/**
 * Applies the agent's new version of a document to the Storage tree the
 * Tiptap editor is bound to, as the smallest set of changes it can find
 * rather than a whole-document swap.
 *
 * `base` is the version the agent was shown when it started, so this is a
 * three-way merge: only what the agent changed relative to `base` is applied.
 * Blocks the agent left alone keep whatever people did to them meanwhile,
 * even if the agent's file still has the old text. Where the agent and a
 * person changed the same block, the agent's version wins for that block,
 * except within a text run where non-overlapping edits are both kept.
 *
 * Without a `base` this degrades to a two-way diff against the live tree.
 * At every level old and new children are lined up with a longest common
 * subsequence, so unchanged blocks are left alone; a changed text run
 * becomes one `LiveText.replace`. Only when a node changes shape is it
 * swapped for a fresh one.
 */
export function patchDocument(
  root: LiveblocksProsemirrorNode,
  base: ProseMirrorJsonNode | undefined,
  next: ProseMirrorJsonNode
) {
  if (!patchNode(root, base, next)) {
    // The root is always a `doc`, so this only happens if the tree is
    // corrupt; rebuild its children in place rather than fail
    const content = getLiveblocksNodeContent(root);
    if (content) {
      content.clear();
      for (const child of next.content ?? []) {
        content.push(createLiveblocksProsemirrorNode(child));
      }
    }
  }
}

/**
 * Updates `node` to match `next`. Returns false if that isn't possible
 * without replacing the node, in which case nothing was changed.
 */
function patchNode(
  node: LiveblocksProsemirrorNode,
  base: ProseMirrorJsonNode | undefined,
  next: ProseMirrorJsonNode
): boolean {
  if (node.get("type") !== next.type) {
    return false;
  }
  if (base?.type !== next.type) {
    base = undefined;
  }

  if (next.type === "text") {
    return patchText(node, base, next);
  }

  const content = getLiveblocksNodeContent(node);
  const nextContent = next.content ?? [];
  if (!content) {
    return nextContent.length === 0;
  }

  if (canonical(nodeAttrs(node)) !== canonical(next.attrs)) {
    if (next.attrs === undefined) {
      node.delete("attrs");
    } else {
      node.set(
        "attrs",
        new LiveMap(
          Object.entries(next.attrs).filter(
            (entry): entry is [string, Json] => entry[1] !== undefined
          )
        )
      );
    }
  }

  if (base) {
    mergeChildren(content, base.content ?? [], nextContent);
  } else {
    patchChildren(content, nextContent);
  }
  return true;
}

function patchText(
  node: LiveblocksProsemirrorNode,
  base: ProseMirrorJsonNode | undefined,
  next: ProseMirrorJsonNode
): boolean {
  const text = getLiveblocksNodeText(node);
  const [current, ...rest] = liveblocksProsemirrorNodeToJsonNodes(node);
  // A text node whose LiveText carries several differently-marked segments
  // shows up as several JSON nodes; the editor never creates one of those,
  // but replace it rather than guess which segment to edit
  if (!text || !current || rest.length > 0) {
    return false;
  }
  if (canonical(current.marks) !== canonical(next.marks)) {
    return false;
  }

  const live = current.text ?? "";
  const op = textOperation(live, base?.text, next.text ?? "");
  if (op) {
    // Same marks as the rest of the run, read straight from Storage
    const [, attributes] = text.toJSON()[0] ?? [];
    text.replace(op.index, op.length, op.text, attributes);
  }
  return true;
}

/**
 * The replacement to apply to `live` so it includes the agent's change from
 * `base` to `next`. If someone edited a different part of the same run in
 * the meantime, their edit is kept and the agent's is shifted around it.
 */
function textOperation(live: string, base: string | undefined, next: string) {
  if (base === undefined || base === live) {
    return diffAsReplace(live, next);
  }
  const agent = diffAsReplace(base, next);
  if (!agent) {
    return null;
  }
  const human = diffAsReplace(base, live);
  if (!human) {
    return agent;
  }
  const agentEnd = agent.index + agent.length;
  const humanEnd = human.index + human.length;
  if (agentEnd <= human.index) {
    // Agent edited before the person's change; indices are unaffected
    return agent;
  }
  if (agent.index >= humanEnd) {
    // Agent edited after it; shift by how much the person's change resized
    return {
      ...agent,
      index: agent.index + (human.text.length - human.length),
    };
  }
  // Overlapping edits: the agent's version of the run wins
  return diffAsReplace(live, next);
}

/**
 * Two-way: lines up the live children with the wanted ones and patches,
 * inserts, or removes to make them match.
 */
function patchChildren(
  list: LiveList<LiveblocksProsemirrorNode>,
  next: ProseMirrorJsonNode[]
) {
  const currentKeys = [...list].map(liveNodeKey);
  const nextKeys = next.map((node) => canonical(node));

  let position = 0;
  for (const run of alignSequences(currentKeys, nextKeys)) {
    if (run.type === "equal") {
      position += run.length;
      continue;
    }

    const paired = Math.min(run.oldLength, run.newLength);
    for (let i = 0; i < paired; i++) {
      const node = list.get(position);
      const wanted = next[run.newStart + i];
      if (!node || !patchNode(node, undefined, wanted)) {
        list.set(position, createLiveblocksProsemirrorNode(wanted));
      }
      position++;
    }
    for (let i = paired; i < run.oldLength; i++) {
      list.delete(position);
    }
    for (let i = paired; i < run.newLength; i++) {
      list.insert(
        createLiveblocksProsemirrorNode(next[run.newStart + i]),
        position
      );
      position++;
    }
  }
}

/**
 * Three-way: works out what the agent changed between `base` and `next`, and
 * applies just that to the live children, which people may have edited since
 * `base`.
 */
function mergeChildren(
  list: LiveList<LiveblocksProsemirrorNode>,
  base: ProseMirrorJsonNode[],
  next: ProseMirrorJsonNode[]
) {
  const liveNodes = [...list];
  const liveIds = liveNodes.map(getLiveblocksNodeId);
  const liveJson = liveNodes.map(liveNodeJson);
  const baseKeys = base.map((node) => canonical(node));

  // Which live child each base block became. Blocks people edited no longer
  // compare equal, so within a changed span each is matched to the live
  // block it most resembles.
  const baseToLiveId = new Array<string | undefined>(base.length);
  for (const run of alignSequences(baseKeys, liveNodes.map(liveNodeKey))) {
    if (run.type === "equal") {
      for (let i = 0; i < run.length; i++) {
        baseToLiveId[run.oldStart + i] = liveIds[run.newStart + i];
      }
      continue;
    }
    for (const [baseIndex, liveIndex] of pairSimilar(
      base,
      run.oldStart,
      run.oldLength,
      liveJson,
      run.newStart,
      run.newLength
    )) {
      baseToLiveId[baseIndex] = liveIds[liveIndex];
    }
  }

  const currentIndex = (id: string) => liveIds.indexOf(id);

  // Live child the last handled block corresponds to; the agent's
  // insertions go right after it
  let anchorId: string | undefined;
  const insertAfterAnchor = (wanted: ProseMirrorJsonNode) => {
    const node = createLiveblocksProsemirrorNode(wanted);
    const index = anchorId === undefined ? 0 : currentIndex(anchorId) + 1;
    list.insert(node, index);
    liveIds.splice(index, 0, getLiveblocksNodeId(node));
    anchorId = getLiveblocksNodeId(node);
  };

  for (const run of alignSequences(
    baseKeys,
    next.map((n) => canonical(n))
  )) {
    if (run.type === "equal") {
      // Untouched by the agent; whatever people did to these blocks stands
      for (let i = run.length - 1; i >= 0; i--) {
        const liveId = baseToLiveId[run.oldStart + i];
        if (liveId !== undefined) {
          anchorId = liveId;
          break;
        }
      }
      continue;
    }

    // Blocks the agent rewrote, matched to what it rewrote them from
    const rewrites = new Map(
      [
        ...pairSimilar(
          base,
          run.oldStart,
          run.oldLength,
          next,
          run.newStart,
          run.newLength
        ),
      ].map(([baseIndex, nextIndex]) => [nextIndex, baseIndex])
    );

    for (let i = 0; i < run.newLength; i++) {
      const nextIndex = run.newStart + i;
      const wanted = next[nextIndex];
      const baseIndex = rewrites.get(nextIndex);
      const liveId =
        baseIndex === undefined ? undefined : baseToLiveId[baseIndex];
      const node =
        liveId === undefined ? undefined : list.get(currentIndex(liveId));
      if (baseIndex === undefined || liveId === undefined || !node) {
        // New block, or a rewrite of one someone removed meanwhile
        insertAfterAnchor(wanted);
        continue;
      }
      if (patchNode(node, base[baseIndex], wanted)) {
        anchorId = liveId;
      } else {
        const replacement = createLiveblocksProsemirrorNode(wanted);
        const index = currentIndex(liveId);
        list.set(index, replacement);
        liveIds[index] = getLiveblocksNodeId(replacement);
        anchorId = liveIds[index];
      }
    }

    const rewritten = new Set(rewrites.values());
    for (let i = 0; i < run.oldLength; i++) {
      const baseIndex = run.oldStart + i;
      const liveId = baseToLiveId[baseIndex];
      if (rewritten.has(baseIndex) || liveId === undefined) {
        continue;
      }
      const index = currentIndex(liveId);
      const node = list.get(index);
      // The agent removed this block. Follow suit unless someone changed it
      // since; then their version is probably worth more than the deletion
      if (node && liveNodeKey(node) === baseKeys[baseIndex]) {
        list.delete(index);
        liveIds.splice(index, 1);
      }
    }
  }
}

/**
 * Matches blocks from one changed span to blocks of the same type in another
 * by how much text they share, greedily from the closest pair down. Yields
 * `[aIndex, bIndex]` pairs; blocks with nothing close enough stay unmatched.
 */
function* pairSimilar(
  a: (ProseMirrorJsonNode | undefined)[],
  aStart: number,
  aLength: number,
  b: (ProseMirrorJsonNode | undefined)[],
  bStart: number,
  bLength: number
): Generator<[number, number]> {
  const candidates: { aIndex: number; bIndex: number; score: number }[] = [];
  for (let i = 0; i < aLength; i++) {
    const left = a[aStart + i];
    for (let j = 0; j < bLength; j++) {
      const right = b[bStart + j];
      if (!left || !right || left.type !== right.type) {
        continue;
      }
      const score = similarity(plainText(left), plainText(right));
      if (score >= 0.5) {
        candidates.push({ aIndex: aStart + i, bIndex: bStart + j, score });
      }
    }
  }
  candidates.sort((x, y) => y.score - x.score);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  for (const { aIndex, bIndex } of candidates) {
    if (usedA.has(aIndex) || usedB.has(bIndex)) {
      continue;
    }
    usedA.add(aIndex);
    usedB.add(bIndex);
    yield [aIndex, bIndex];
  }
}

/** 1 for identical text, 0 for nothing in common at either end */
function similarity(a: string, b: string) {
  if (a === b) {
    return 1;
  }
  const total = a.length + b.length;
  if (total === 0) {
    return 1;
  }
  const op = diffAsReplace(a, b);
  return op ? 1 - (op.length + op.text.length) / total : 1;
}

function plainText(node: ProseMirrorJsonNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }
  return (node.content ?? []).map(plainText).join("\n");
}

/**
 * JSON form of a live node, or undefined if it has none that round-trips
 * (a text node with several differently-marked segments).
 */
function liveNodeJson(
  node: LiveblocksProsemirrorNode
): ProseMirrorJsonNode | undefined {
  const [json, ...rest] = liveblocksProsemirrorNodeToJsonNodes(node);
  return json && rest.length === 0 ? json : undefined;
}

/** Comparable form of a live node, or a unique key if it has no clean JSON form */
function liveNodeKey(node: LiveblocksProsemirrorNode): string {
  const json = liveNodeJson(node);
  return json ? canonical(json) : `\u0000${getLiveblocksNodeId(node)}`;
}

function nodeAttrs(node: LiveblocksProsemirrorNode) {
  const attrs = node.get("attrs");
  return attrs instanceof LiveMap ? Object.fromEntries(attrs) : undefined;
}

/** JSON with sorted keys, so equal nodes compare equal however they were built */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "object" && item !== null && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
        )
      : item
  );
}

type Run =
  | { type: "equal"; length: number; oldStart: number; newStart: number }
  | {
      type: "change";
      oldStart: number;
      oldLength: number;
      newStart: number;
      newLength: number;
    };

/**
 * Longest-common-subsequence alignment of two lists of keys, as runs of
 * equal items and of changed spans (with the old and new items each span
 * covers). Documents are small enough for the quadratic table.
 */
function alignSequences(before: string[], after: string[]): Run[] {
  const n = before.length;
  const m = after.length;
  // lcs[i][j] = LCS length of before[i..] and after[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        before[i] === after[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const runs: Run[] = [];
  let i = 0;
  let j = 0;
  let change: Extract<Run, { type: "change" }> | undefined;
  const flushChange = () => {
    if (change && (change.oldLength > 0 || change.newLength > 0)) {
      runs.push(change);
    }
    change = undefined;
  };
  const extendChange = (oldDelta: number, newDelta: number) => {
    change ??= {
      type: "change",
      oldStart: i,
      oldLength: 0,
      newStart: j,
      newLength: 0,
    };
    change.oldLength += oldDelta;
    change.newLength += newDelta;
    i += oldDelta;
    j += newDelta;
  };

  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      flushChange();
      const last = runs[runs.length - 1];
      if (last?.type === "equal") {
        last.length++;
      } else {
        runs.push({ type: "equal", length: 1, oldStart: i, newStart: j });
      }
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      extendChange(0, 1);
    } else {
      extendChange(1, 0);
    }
  }
  flushChange();
  return runs;
}
