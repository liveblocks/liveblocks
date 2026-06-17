import {
  type LiveblocksProsemirrorNode,
  liveblocksProsemirrorNodeToJson,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";

export type {
  LiveblocksProsemirrorNode as LiveblocksTiptapNode,
  ProseMirrorJsonMark,
  ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
export {
  createLiveblocksProsemirrorNode as createLiveblocksTiptapNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksProsemirrorNodeToJsonNodes as liveblocksTiptapNodeToJsonNodes,
} from "@liveblocks/prosemirror";

export function createDefaultDocument(): ProseMirrorJsonNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function liveblocksTiptapNodeToJson(
  node: LiveblocksProsemirrorNode
): ProseMirrorJsonNode {
  return liveblocksProsemirrorNodeToJson(node, createDefaultDocument);
}
