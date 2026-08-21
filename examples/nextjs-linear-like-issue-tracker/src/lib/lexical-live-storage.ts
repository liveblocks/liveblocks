/**
 * Converts between Markdown and the Liveblocks Storage tree used by
 * `@liveblocks/lexical` (LiveText-based collaborative Lexical documents).
 *
 * The storage tree mirrors a Lexical document:
 *
 *   { kind: "root", type: "root", version: 1, children: LiveList<...> }
 *     └ { kind: "element", type: "paragraph" | "heading" | ..., version: 1,
 *         children: LiveList<...>, props?: LiveMap }
 *         └ { kind: "text", type: "text", version: 1, content: LiveText }
 *         └ { kind: "linebreak", type: "linebreak", version: 1 }
 *     └ { kind: "decorator", type: "horizontalrule" | ..., version: 1, props? }
 *
 * Adjacent Lexical text nodes are coalesced into a single LiveText whose
 * segments carry readable attributes (e.g. `{ bold: true }`) instead of
 * Lexical's numeric format bitmask.
 */
import { createHeadlessEditor } from "@lexical/headless";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import type { Json, JsonObject } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject, LiveText } from "@liveblocks/client";
import type { LiveRootNode } from "@liveblocks/lexical";
import type {
  Klass,
  LexicalNode,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import { NODE_STATE_KEY, TEXT_TYPE_TO_FORMAT } from "lexical";

// Structural equivalents of @liveblocks/lexical's internal storage shapes
// (only `LiveRootNode` and `LiveLexicalSelection` are exported publicly).
type LiveTextShape = {
  kind: "text";
  type: string;
  version: number;
  content: LiveText;
  props?: LiveMap<string, Json>;
};
type LiveLineBreakShape = {
  kind: "linebreak";
  type: "linebreak";
  version: number;
};
type LiveElementShape = {
  kind: "element";
  type: string;
  version: number;
  children: LiveList<LiveChildNode>;
  props?: LiveMap<string, Json>;
};
type LiveDecoratorShape = {
  kind: "decorator";
  type: string;
  version: number;
  props?: LiveMap<string, Json>;
};
type LiveChildShape =
  | LiveTextShape
  | LiveElementShape
  | LiveLineBreakShape
  | LiveDecoratorShape;
export type LiveChildNode = LiveObject<LiveChildShape>;

type LexicalNodes = ReadonlyArray<Klass<LexicalNode>>;

/** Loosely-typed serialized Lexical node, as found in EditorState JSON. */
type SerializedNode = {
  type: string;
  [key: string]: unknown;
};

type LiveTextSegment = [string] | [string, JsonObject];

/** The JSON form of the storage tree, as returned by `getStorageDocument(roomId, "json")`. */
export type StorageJsonNode = {
  kind: "root" | "element" | "text" | "linebreak" | "decorator";
  type: string;
  version: number;
  children?: StorageJsonNode[];
  content?: LiveTextSegment[];
  props?: JsonObject;
};

/**
 * Fields of a serialized text node that are omitted from LiveText segment
 * attributes when they are at their Lexical defaults.
 */
const TEXT_ATTRIBUTE_DEFAULTS: Readonly<Record<string, Json>> = {
  type: "text",
  mode: "normal",
  detail: 0,
  style: "",
};

/** Element/decorator fields that never belong in storage `props`. */
const OMIT_FROM_PROPS = new Set([
  "type",
  "version",
  "children",
  "direction",
  "format",
  "indent",
  "textFormat",
  "textStyle",
]);

function isSerializedTextNode(node: SerializedNode): boolean {
  return typeof node.text === "string" && node.type !== "linebreak";
}

/** Reshape a serialized text node into a LiveText segment (readable marks, defaults omitted). */
function serializedTextNodeToSegment(node: SerializedNode): LiveTextSegment {
  const text = node.text as string;
  const attributes: JsonObject = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "text" || key === "version" || key === NODE_STATE_KEY) {
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }

    if (key === "format") {
      const format = typeof value === "number" ? value : 0;
      for (const [name, flag] of Object.entries(TEXT_TYPE_TO_FORMAT)) {
        if (format & flag) {
          attributes[name] = true;
        }
      }
      continue;
    }

    const defaultValue = TEXT_ATTRIBUTE_DEFAULTS[key];
    if (defaultValue !== undefined) {
      if (value !== defaultValue) {
        attributes[key] = value as Json;
      }
      continue;
    }

    attributes[key] = value as Json;
  }

  return Object.keys(attributes).length > 0 ? [text, attributes] : [text];
}

/** Extract storage `props` from a serialized element/decorator node. */
function serializedNodeToProps(node: SerializedNode): JsonObject | undefined {
  const props: JsonObject = {};

  for (const [key, value] of Object.entries(node)) {
    if (OMIT_FROM_PROPS.has(key) || key === "text" || value === undefined) {
      continue;
    }
    if (key === NODE_STATE_KEY) {
      if (value !== null && typeof value === "object") {
        Object.assign(props, value as JsonObject);
      }
      continue;
    }
    props[key] = value as Json;
  }

  return Object.keys(props).length > 0 ? props : undefined;
}

function propsToLiveMap(
  props: JsonObject | undefined
): { props: LiveMap<string, Json> } | Record<string, never> {
  if (props === undefined) {
    return {};
  }
  return {
    props: new LiveMap(
      Object.entries(props).filter(
        (entry): entry is [string, Json] => entry[1] !== undefined
      )
    ),
  };
}

/** Convert serialized Lexical children into Live nodes, coalescing adjacent text nodes. */
function serializedChildrenToLiveNodes(
  children: SerializedNode[]
): LiveChildNode[] {
  const out: LiveChildNode[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i];

    if (isSerializedTextNode(child)) {
      const segments: LiveTextSegment[] = [];
      while (i < children.length && isSerializedTextNode(children[i])) {
        const segment = serializedTextNodeToSegment(children[i]);
        if (segment[0].length > 0) {
          segments.push(segment);
        }
        i++;
      }
      out.push(
        new LiveObject<LiveTextShape>({
          kind: "text",
          type: "text",
          version: 1,
          content: new LiveText(segments),
        })
      );
      continue;
    }

    if (child.type === "linebreak") {
      out.push(
        new LiveObject<LiveLineBreakShape>({
          kind: "linebreak",
          type: "linebreak",
          version: 1,
        })
      );
      i++;
      continue;
    }

    if (Array.isArray(child.children)) {
      out.push(
        new LiveObject<LiveElementShape>({
          kind: "element",
          type: child.type,
          version: 1,
          children: new LiveList(
            serializedChildrenToLiveNodes(child.children as SerializedNode[])
          ),
          ...propsToLiveMap(serializedNodeToProps(child)),
        })
      );
      i++;
      continue;
    }

    out.push(
      new LiveObject<LiveDecoratorShape>({
        kind: "decorator",
        type: child.type,
        version: 1,
        ...propsToLiveMap(serializedNodeToProps(child)),
      })
    );
    i++;
  }

  return out;
}

function createEmptyLiveParagraph(): LiveChildNode {
  return new LiveObject<LiveElementShape>({
    kind: "element",
    type: "paragraph",
    version: 1,
    children: new LiveList<LiveChildNode>([
      new LiveObject<LiveTextShape>({
        kind: "text",
        type: "text",
        version: 1,
        content: new LiveText(),
      }),
    ]),
  });
}

/**
 * Convert a Markdown string into block-level Live nodes, ready to be inserted
 * into a document's `children` LiveList (e.g. inside `mutateStorage`).
 */
export function markdownToLiveNodes(
  markdown: string,
  nodes: LexicalNodes
): LiveChildNode[] {
  const editor = createHeadlessEditor({
    nodes: [...nodes],
    onError: (error) => {
      throw error;
    },
  });

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    { discrete: true }
  );

  const state = editor.getEditorState().toJSON();
  return serializedChildrenToLiveNodes(
    state.root.children as unknown as SerializedNode[]
  );
}

/**
 * Build a complete `document` root node from Markdown, for `initialStorage`
 * or server-side room creation. An empty/blank Markdown string produces a
 * document with a single empty paragraph.
 */
export function markdownToLiveDocument(
  markdown: string,
  nodes: LexicalNodes
): LiveRootNode {
  const children =
    markdown.trim().length > 0 ? markdownToLiveNodes(markdown, nodes) : [];

  if (children.length === 0) {
    children.push(createEmptyLiveParagraph());
  }

  // The structural Live tree matches @liveblocks/lexical's LiveRootNode shape.
  return new LiveObject({
    kind: "root",
    type: "root",
    version: 1,
    children: new LiveList(children),
  }) as LiveRootNode;
}

/** An empty document (single empty paragraph), e.g. for `initialStorage`. */
export function createEmptyLiveDocument(): LiveRootNode {
  return markdownToLiveDocument("", []);
}

function segmentToSerializedTextNode(
  text: string,
  attributes: JsonObject | undefined
): SerializedNode {
  const node: SerializedNode = {
    type: "text",
    version: 1,
    text,
    format: 0,
    mode: "normal",
    style: "",
    detail: 0,
  };

  let format = 0;
  if (attributes !== undefined) {
    for (const [key, value] of Object.entries(attributes)) {
      if (key in TEXT_TYPE_TO_FORMAT) {
        if (value) {
          format |= TEXT_TYPE_TO_FORMAT[key];
        }
        continue;
      }
      node[key] = value;
    }
  }
  node.format = format;

  return node;
}

function storageNodeToSerializedNodes(node: StorageJsonNode): SerializedNode[] {
  switch (node.kind) {
    case "text":
      return (node.content ?? [])
        .filter(([text]) => text.length > 0)
        .map(([text, attributes]) =>
          segmentToSerializedTextNode(text, attributes)
        );
    case "linebreak":
      return [{ type: "linebreak", version: 1 }];
    case "element":
      return [
        {
          type: node.type,
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          ...(node.props ?? {}),
          children: (node.children ?? []).flatMap(storageNodeToSerializedNodes),
        },
      ];
    case "decorator":
      return [{ type: node.type, version: 1, ...(node.props ?? {}) }];
    default:
      return [];
  }
}

/**
 * Convert the JSON form of a `document` storage tree (as returned by
 * `liveblocks.getStorageDocument(roomId, "json")`) into a Markdown string.
 */
export function storageDocumentToMarkdown(
  document: StorageJsonNode | undefined,
  nodes: LexicalNodes
): string {
  const children = (document?.children ?? []).flatMap(
    storageNodeToSerializedNodes
  );
  if (children.length === 0) {
    return "";
  }

  const state = {
    root: {
      type: "root",
      version: 1,
      direction: null,
      format: "",
      indent: 0,
      children: children as unknown as SerializedLexicalNode[],
    },
  };

  const editor = createHeadlessEditor({
    nodes: [...nodes],
    onError: (error) => {
      throw error;
    },
  });
  editor.setEditorState(
    // Cast: we build the serialized state loosely; Lexical validates it while parsing.
    editor.parseEditorState(state as unknown as SerializedEditorState)
  );

  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(TRANSFORMERS, undefined, true));
}
