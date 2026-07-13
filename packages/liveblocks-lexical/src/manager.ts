import {
  type Json,
  LiveList,
  LiveMap,
  LiveObject,
  LiveText,
  type StorageUpdate,
} from "@liveblocks/client";
import {
  type JsonObject,
  kInternal,
  kStorageUpdateSource,
  type PrivateLiveNodeApi,
  type TextAttributes,
} from "@liveblocks/core";
import {
  $createLineBreakNode,
  $getEditor,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  COLLABORATION_TAG,
  type DecoratorNode,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type LineBreakNode,
  NODE_STATE_KEY,
  type NodeKey,
  type Point,
  type RootNode,
  type SerializedElementNode,
  type SerializedTextNode,
  TEXT_TYPE_TO_FORMAT,
  type TextNode,
} from "lexical";

import type {
  LiveChildNode,
  LiveDecoratorNode,
  LiveDecoratorShape,
  LiveElementNode,
  LiveElementShape,
  LiveLexicalPoint,
  LiveLexicalSelection,
  LiveLineBreakNode,
  LiveLineBreakShape,
  LiveRootChildNode,
  LiveRootNode,
  LiveRootShape,
  LiveStorageNode,
  LiveTextNode,
  LiveTextShape,
} from "./types";

export type DecodedLexicalPoint = {
  key: NodeKey;
  offset: number;
  type: LiveLexicalPoint["type"];
};

export type DecodedLexicalSelection = {
  anchor: DecodedLexicalPoint;
  focus: DecodedLexicalPoint;
};

export class LiveblocksCollaborationManager {
  #binding: {
    /** Storage node → Lexical node (or coalesced TextNode[] for text children). */
    forward: WeakMap<
      LiveStorageNode,
      | RootNode
      | ElementNode
      | LineBreakNode
      | DecoratorNode<unknown>
      | readonly TextNode[]
    >;
    /** Lexical NodeKey → source storage node. */
    reverse: Map<NodeKey, LiveStorageNode>;
  };
  private root: LiveRootNode;
  constructor(root: LiveRootNode, editor: LexicalEditor) {
    this.root = root;
    this.#binding = {
      forward: new WeakMap(),
      reverse: new Map(),
    };

    editor.update(
      () => {
        const root_lexical = $getRoot();
        root_lexical.clear();
        const children: Array<ElementNode | DecoratorNode<unknown>> = [];
        for (const child of this.root.get("children")) {
          const kind = child.get("kind");
          if (kind === "decorator") {
            children.push(
              $convertLiveDecoratorNodeToLexicalNode(child as LiveDecoratorNode)
            );
          } else if (kind === "element") {
            children.push(
              $convertLiveElementNodeToLexicalNode(child as LiveElementNode)
            );
          } else {
            throw new Error(
              `Unsupported root child kind "${String(kind)}". Expected "element" or "decorator".`
            );
          }
        }
        root_lexical.append(...children);
        this.$updateBinding();
      },
      { tag: COLLABORATION_TAG, skipTransforms: true }
    );
  }

  get binding(): Readonly<{
    forward: Readonly<
      WeakMap<
        LiveStorageNode,
        | RootNode
        | ElementNode
        | LineBreakNode
        | DecoratorNode<unknown>
        | readonly TextNode[]
      >
    >;
    reverse: ReadonlyMap<NodeKey, LiveStorageNode>;
  }> {
    return this.#binding;
  }

  private $updateBinding(): void {
    const forward = new WeakMap<
      LiveStorageNode,
      | RootNode
      | ElementNode
      | LineBreakNode
      | DecoratorNode<unknown>
      | readonly TextNode[]
    >();
    const reverse = new Map<NodeKey, LiveStorageNode>();

    this.#binding = {
      forward,
      reverse,
    };

    const root = $getRoot();
    forward.set(this.root, root);
    reverse.set(root.getKey(), this.root);

    let index = 0;
    for (const child of this.root.get("children")) {
      const node_lexical = root.getChildren()[index];
      if (child.get("kind") === "decorator") {
        this.createBinding(
          child as LiveDecoratorNode,
          node_lexical as DecoratorNode<unknown>
        );
      } else {
        this.createBinding(
          child as LiveElementNode,
          node_lexical as ElementNode
        );
      }
      index++;
    }
  }

  /**
   * Encode a Lexical selection endpoint as a storage-relative presence point.
   *
   * Must be called inside `editor.read()` / `editor.update()` while bindings
   * are populated. Returns `null` when the point cannot be expressed in
   * storage coordinates (unbound node, missing node id, unsupported point
   * type, or a text point whose reverse binding is not a LiveText).
   */
  public $encodePoint(point: Point): LiveLexicalPoint | null {
    const node_liveblocks = this.#binding.reverse.get(point.key);
    if (node_liveblocks === undefined) {
      return null;
    }

    if (point.type === "text") {
      return this.$encodeTextPoint(point, node_liveblocks);
    }

    if (point.type === "element") {
      return this.$encodeElementPoint(point, node_liveblocks);
    }

    return null;
  }

  /**
   * Encode the current range selection for Liveblocks presence.
   *
   * Returns `null` when there is no range selection or either endpoint cannot
   * be encoded.
   */
  public $encodeSelection(): LiveLexicalSelection | null {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }

    const anchor = this.$encodePoint(selection.anchor);
    const focus = this.$encodePoint(selection.focus);
    if (anchor === null || focus === null) {
      return null;
    }

    return { anchor, focus };
  }

  /**
   * Encode a Lexical text point into a storage-relative presence point.
   *
   * Sibling TextNodes that share the same LiveText binding are flattened into
   * one LiveText character offset (matching how storage coalesces formatted
   * spans). Adjacent TextNodes bound to *different* LiveText children must not
   * contribute to each other's offset — that happens with concurrent remote
   * inserts of separate text children.
   */
  public $encodeTextPoint(
    point: Point,
    node_liveblocks: LiveStorageNode
  ): LiveLexicalPoint | null {
    const local = this.$encodeLocalTextPoint(point, node_liveblocks);
    if (local === null) {
      return null;
    }

    const liveText = (node_liveblocks as LiveTextNode).get("content");
    return {
      ...local,
      offset: liveText[kInternal].encodeIndex(local.offset),
      version: liveText.version,
    };
  }

  /**
   * Encode a Lexical point in local document coordinates (no `encodeIndex`).
   *
   * For text points the offset is the flat LiveText character index across
   * coalesced siblings. For element points this matches `$encodePoint`.
   * Used by history restore when Lexical keys were recreated and presence
   * `decodeIndex` would remap the left edge of a deleted range.
   */
  public $encodeLocalPoint(point: Point): LiveLexicalPoint | null {
    const node_liveblocks = this.#binding.reverse.get(point.key);
    if (node_liveblocks === undefined) {
      return null;
    }

    if (point.type === "text") {
      return this.$encodeLocalTextPoint(point, node_liveblocks);
    }

    if (point.type === "element") {
      return this.$encodeElementPoint(point, node_liveblocks);
    }

    return null;
  }

  /**
   * Decode a local-document point (flat LiveText offset / element child index)
   * into Lexical coordinates. Unlike `$decodePoint`, text offsets skip
   * `LiveText.decodeIndex` — they are already in local document space.
   */
  public $decodeLocalPoint(
    point: LiveLexicalPoint
  ): DecodedLexicalPoint | null {
    const node_liveblocks = find_liveblocksNode(
      this.root,
      (candidate) =>
        point.nodeId ===
        (candidate as unknown as { [kInternal]: PrivateLiveNodeApi })[
          kInternal
        ].getId()
    );
    if (node_liveblocks === null) {
      return null;
    }

    if (point.type === "text") {
      if (node_liveblocks.get("kind") !== "text") {
        return null;
      }
      return this.$decodeFlatTextOffset(
        point.offset,
        node_liveblocks as LiveTextNode
      );
    }

    if (point.type === "element") {
      const kind = node_liveblocks.get("kind");
      if (kind !== "element" && kind !== "root") {
        return null;
      }
      return this.$decodeElementPoint(point, node_liveblocks);
    }

    return null;
  }

  private $encodeLocalTextPoint(
    point: Point,
    node_liveblocks: LiveStorageNode
  ): LiveLexicalPoint | null {
    if (node_liveblocks.get("kind") !== "text") {
      return null;
    }

    const nodeId = (
      node_liveblocks as unknown as { [kInternal]: PrivateLiveNodeApi }
    )[kInternal].getId();
    if (nodeId === undefined) {
      return null;
    }

    const node_lexical = point.getNode();
    if (!$isTextNode(node_lexical)) {
      return null;
    }

    // Accumulate only previous text siblings that belong to THIS LiveText.
    let flatOffset = point.offset;
    let prevSibling = node_lexical.getPreviousSibling();
    while (
      $isTextNode(prevSibling) &&
      this.#binding.reverse.get(prevSibling.getKey()) === node_liveblocks
    ) {
      flatOffset += prevSibling.getTextContentSize();
      prevSibling = prevSibling.getPreviousSibling();
    }

    return {
      nodeId,
      type: "text",
      offset: flatOffset,
      version: 0,
    };
  }

  /**
   * Encode a Lexical element point into a storage-relative presence point.
   *
   * Lexical child indices count every TextNode; storage children coalesce
   * consecutive TextNodes that share one LiveText binding into a single slot.
   * Distinct adjacent LiveText bindings remain separate slots.
   */
  public $encodeElementPoint(
    point: Point,
    node_liveblocks: LiveStorageNode
  ): LiveLexicalPoint | null {
    const kind = node_liveblocks.get("kind");
    if (kind !== "element" && kind !== "root") {
      return null;
    }

    const nodeId = (
      node_liveblocks as unknown as { [kInternal]: PrivateLiveNodeApi }
    )[kInternal].getId();
    if (nodeId === undefined) {
      return null;
    }

    const node_lexical = point.getNode();
    if (!$isElementNode(node_lexical)) {
      return null;
    }

    const storageOffset = this.$convertLexicalChildIndexToStorage(
      node_lexical,
      point.offset
    );
    if (storageOffset === null) {
      return null;
    }

    return {
      nodeId,
      type: "element",
      offset: storageOffset,
      version: 0,
    };
  }

  /**
   * Decode a storage-relative presence point into Lexical coordinates.
   *
   * Must be called inside `editor.read()` / `editor.update()` while bindings
   * are populated. Returns `null` when the storage node is missing, unbound,
   * the point type does not match the node, or the point cannot be decoded yet
   * (e.g. peer ahead on LiveText version).
   */
  public $decodePoint(point: LiveLexicalPoint): DecodedLexicalPoint | null {
    const node_liveblocks = find_liveblocksNode(
      this.root,
      (candidate) =>
        point.nodeId ===
        (candidate as unknown as { [kInternal]: PrivateLiveNodeApi })[
          kInternal
        ].getId()
    );
    if (node_liveblocks === null) {
      return null;
    }

    if (point.type === "text") {
      if (node_liveblocks.get("kind") !== "text") {
        return null;
      }
      return this.$decodeTextPoint(point, node_liveblocks as LiveTextNode);
    }

    if (point.type === "element") {
      const kind = node_liveblocks.get("kind");
      if (kind !== "element" && kind !== "root") {
        return null;
      }
      return this.$decodeElementPoint(point, node_liveblocks);
    }

    return null;
  }

  /**
   * Decode a storage-relative presence selection into Lexical coordinates.
   *
   * Returns `null` when either endpoint cannot be decoded.
   */
  public $decodeSelection(
    selection: LiveLexicalSelection
  ): DecodedLexicalSelection | null {
    const anchor = this.$decodePoint(selection.anchor);
    const focus = this.$decodePoint(selection.focus);
    if (anchor === null || focus === null) {
      return null;
    }

    return { anchor, focus };
  }

  /**
   * True when a decoded Lexical snapshot point is still safe for `Point.set`:
   * bound, present in the active editor state, attached, and matching type.
   * `binding.reverse.has(key)` alone is not enough — reconcile can leave
   * reverse entries for detached TextNodes.
   */
  public $isUsableLexicalSnapshot(point: DecodedLexicalPoint): boolean {
    if (!this.#binding.reverse.has(point.key)) {
      return false;
    }
    const node = $getNodeByKey(point.key);
    if (node === null || !node.isAttached()) {
      return false;
    }
    return point.type === "text" ? $isTextNode(node) : $isElementNode(node);
  }

  /**
   * Decode a storage-relative text point into a Lexical text point.
   *
   * `LiveText.decodeIndex` maps the presence offset into local document
   * coordinates (accounting for accepted ops since `point.version` and any
   * local pending ops). The flat offset is then split across the coalesced
   * TextNode[] bound to this LiveText.
   *
   * Binding entries are re-resolved with `$getNodeByKey` — the forward map
   * may still hold TextNode refs from a prior editor state after structural
   * deletes (same invariant as `$reconcileTextNodeFromLexical`).
   */
  private $decodeTextPoint(
    point: LiveLexicalPoint,
    node_liveblocks: LiveTextNode
  ): DecodedLexicalPoint | null {
    const liveText = node_liveblocks.get("content");
    const flatOffset = liveText[kInternal].decodeIndex(
      point.offset,
      point.version
    );
    if (flatOffset === null) {
      return null;
    }

    return this.$decodeFlatTextOffset(flatOffset, node_liveblocks);
  }

  /**
   * Place a flat LiveText character offset onto the coalesced TextNode[]
   * bound to `node_liveblocks`. Does not call `decodeIndex`.
   */
  private $decodeFlatTextOffset(
    flatOffset: number,
    node_liveblocks: LiveTextNode
  ): DecodedLexicalPoint | null {
    const coalesced = this.#binding.forward.get(node_liveblocks);
    if (coalesced === undefined || !(coalesced instanceof Array)) {
      return null;
    }

    // Drop detached / missing keys before walking — calling methods on a
    // stale TextNode throws ("Lexical node does not exist in active editor
    // state") via getLatest().
    const textNodes = coalesced
      .map((node) => $getNodeByKey(node.getKey()))
      .filter(
        (node): node is TextNode =>
          node !== null && $isTextNode(node) && node.isAttached()
      );
    if (textNodes.length === 0) {
      return null;
    }

    // Walk coalesced TextNodes until the flat offset lands in one.
    // Use `>` (not `>=`) so an offset exactly at a node boundary stays at
    // the end of that node — matching encode's "sum previous siblings" rule
    // for a caret at the start of the next sibling.
    //
    // @example Coalesced ["Hello ", "world"], flatOffset = 6
    //   t0 "Hello " (size 6): 6 > 6? no → { key: t0, offset: 6 }
    // @example flatOffset = 7
    //   t0 size 6: 7 > 6 → remaining 1; t1 "world": 1 > 5? no → { key: t1, offset: 1 }
    let remaining = flatOffset;
    let index = 0;
    while (
      remaining > textNodes[index].getTextContentSize() &&
      index + 1 < textNodes.length
    ) {
      remaining -= textNodes[index].getTextContentSize();
      index += 1;
    }

    const textNode = textNodes[index];
    return {
      key: textNode.getKey(),
      offset: Math.min(remaining, textNode.getTextContentSize()),
      type: "text",
    };
  }

  /**
   * Decode a storage-relative element point into a Lexical element point.
   *
   * Storage child indices count coalesced LiveText slots; Lexical child
   * indices count every TextNode. Inverse of `$convertLexicalChildIndexToStorage`.
   *
   * Binding entries are re-resolved with `$getNodeByKey` — the forward map
   * may still hold an ElementNode ref from a prior editor state.
   */
  private $decodeElementPoint(
    point: LiveLexicalPoint,
    node_liveblocks: LiveStorageNode
  ): DecodedLexicalPoint | null {
    const mapped = this.#binding.forward.get(node_liveblocks);
    if (mapped === undefined || mapped instanceof Array) {
      return null;
    }

    const element = $getNodeByKey(mapped.getKey());
    if (element === null || !$isElementNode(element) || !element.isAttached()) {
      return null;
    }

    const lexicalOffset = this.$convertStorageOffsetToLexicalChildIndex(
      element,
      point.offset
    );
    if (lexicalOffset === null) {
      return null;
    }

    return {
      key: element.getKey(),
      offset: lexicalOffset,
      type: "element",
    };
  }

  /**
   * Map a Lexical element child index to the corresponding LiveList child index.
   *
   * Consecutive TextNodes coalesce into one storage slot only while they share
   * the same reverse binding. A binding change starts a new storage slot —
   * matching how concurrent inserts produce adjacent distinct LiveText children.
   *
   * Returns `null` when a text child before the target index is unbound: the
   * caret is not yet expressible in storage coordinates.
   *
   * @example Coalesced text + linebreak
   *
   * Lexical children:  [ t0 "Hi" bold, t1 "there", br ]
   *                      └──── same LiveText ────┘
   * Lexical indices:        0              1       2
   * Storage children:  [ text (LiveText), linebreak ]
   * Storage indices:          0                1
   *
   *   targetChildIndex = 0  →  0  (before first slot)
   *   targetChildIndex = 1  →  0  (still inside coalesced text; t1 skipped)
   *   targetChildIndex = 2  →  1  (after the LiveText slot)
   *   targetChildIndex = 3  →  2  (after linebreak)
   *
   * @example Adjacent distinct LiveText children
   *
   * Lexical children:  [ t0 "foo" bold, t1 "bar" ]
   *                      └ LiveText A ┘  └ LiveText B ┘
   * Lexical indices:        0                1
   * Storage children:  [ text A, text B ]
   * Storage indices:        0       1
   *
   *   targetChildIndex = 0  →  0
   *   targetChildIndex = 1  →  1  (binding changed; do NOT coalesce)
   *   targetChildIndex = 2  →  2
   */
  private $convertLexicalChildIndexToStorage(
    element: ElementNode,
    targetChildIndex: number
  ): number | null {
    const children = element.getChildren();
    let index_liveblocks = 0;
    let index_lexical = 0;

    while (index_lexical < targetChildIndex) {
      if (index_lexical >= children.length) {
        return index_liveblocks;
      }

      const child = children[index_lexical];
      index_lexical += 1;

      if ($isTextNode(child)) {
        const binding = this.#binding.reverse.get(child.getKey());
        if (binding === undefined) {
          return null;
        }
        while (index_lexical < children.length) {
          const next = children[index_lexical];
          if (!$isTextNode(next)) {
            break;
          }
          if (this.#binding.reverse.get(next.getKey()) !== binding) {
            break;
          }
          index_lexical += 1;
        }
      }

      index_liveblocks += 1;
    }

    return index_liveblocks;
  }

  /**
   * Map a LiveList child index to the corresponding Lexical element child index.
   *
   * Inverse of {@link $convertLexicalChildIndexToStorage}: for each storage
   * slot consumed, advance past one Lexical child — or past a whole run of
   * TextNodes that share the same LiveText binding.
   *
   * Returns `null` when a text child encountered while walking is unbound.
   *
   * @example Coalesced text + linebreak
   *
   * Lexical children:  [ t0 "Hi" bold, t1 "there", br ]
   *                      └──── same LiveText ────┘
   * Storage children:  [ text (LiveText), linebreak ]
   *
   *   storageOffset = 0  →  0  (before first slot)
   *   storageOffset = 1  →  2  (skip t0+t1; land before br)
   *   storageOffset = 2  →  3  (after br)
   *
   * @example Adjacent distinct LiveText children
   *
   * Lexical children:  [ t0 "foo" bold, t1 "bar" ]
   *                      └ LiveText A ┘  └ LiveText B ┘
   * Storage children:  [ text A, text B ]
   *
   *   storageOffset = 0  →  0
   *   storageOffset = 1  →  1  (only skip t0; t1 is a different binding)
   *   storageOffset = 2  →  2
   */
  private $convertStorageOffsetToLexicalChildIndex(
    element: ElementNode,
    storageOffset: number
  ): number | null {
    const children = element.getChildren();
    let remaining = storageOffset;
    let index_lexical = 0;

    while (remaining > 0 && index_lexical < children.length) {
      const child = children[index_lexical];
      index_lexical += 1;

      if ($isTextNode(child)) {
        const binding = this.#binding.reverse.get(child.getKey());
        if (binding === undefined) {
          return null;
        }
        while (index_lexical < children.length) {
          const next = children[index_lexical];
          if (!$isTextNode(next)) {
            break;
          }
          if (this.#binding.reverse.get(next.getKey()) !== binding) {
            break;
          }
          index_lexical += 1;
        }
      }

      remaining -= 1;
    }

    return index_lexical;
  }

  public $applyLocalUpdates(changeset: {
    dirtyElements: ReadonlySet<NodeKey>;
    dirtyLeaves: ReadonlySet<NodeKey>;
    normalizedNodes: ReadonlySet<NodeKey>;
  }) {
    const dirtyElements = changeset.dirtyElements;
    if (!dirtyElements.has("root")) return;

    if (this.#binding.reverse.size === 0) return;

    const dirtyNodes = new Set<NodeKey>([
      ...dirtyElements,
      ...changeset.dirtyLeaves,
    ]);

    this.$reconcileElementNodeFromLexical(
      $getRoot(),
      this.root as unknown as LiveElementNode,
      dirtyNodes
    );
  }

  public $reconcileElementNodeFromLexical(
    node_lexical: RootNode,
    node_liveblocks: LiveRootNode,
    dirtyNodes: ReadonlySet<NodeKey>
  ): void;
  public $reconcileElementNodeFromLexical(
    node_lexical: ElementNode,
    node_liveblocks: LiveElementNode,
    dirtyNodes: ReadonlySet<NodeKey>
  ): void;
  public $reconcileElementNodeFromLexical(
    node_lexical: RootNode | ElementNode,
    node_liveblocks: LiveRootNode | LiveElementNode,
    dirtyNodes: ReadonlySet<NodeKey>
  ): void {
    node_lexical = node_lexical.getLatest();
    this.#binding.forward.set(node_liveblocks, node_lexical);
    this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);

    if ($isElementNode(node_lexical)) {
      node_liveblocks = node_liveblocks as LiveElementNode;
      const type_lexical = node_lexical.getType();
      if (node_liveblocks.get("type") !== type_lexical) {
        node_liveblocks.set("type", type_lexical);
      }

      const props_lexical = $getLexicalNodeProps(node_lexical);
      const props_liveblocks = node_liveblocks.get("props");
      const props_liveblocks_json =
        props_liveblocks !== undefined ? props_liveblocks.toJSON() : undefined;
      if (
        !isEqual(props_lexical, props_liveblocks_json as JsonObject | undefined)
      ) {
        if (props_lexical === undefined) {
          node_liveblocks.delete("props");
        } else if (!(props_liveblocks instanceof LiveMap)) {
          node_liveblocks.set(
            "props",
            new LiveMap(
              Object.entries(props_lexical).filter(
                (entry): entry is [string, Json] => entry[1] !== undefined
              )
            )
          );
        } else {
          const keys = new Set(Object.keys(props_lexical));
          for (const key of props_liveblocks.keys()) {
            if (!keys.has(key)) {
              props_liveblocks.delete(key);
            }
          }
          for (const [key, value] of Object.entries(props_lexical)) {
            if (value === undefined) {
              continue;
            }
            if (props_liveblocks.get(key) !== value) {
              props_liveblocks.set(key, value);
            }
          }
        }
      }
    }

    const children_lexical = $normalizeLexicalChildren(node_lexical);
    const children_liveblocks: LiveList<LiveChildNode> = (
      node_liveblocks as LiveObject<LiveRootShape | LiveElementShape>
    ).get("children");

    const numOfItems_lexical = children_lexical.length;
    const numOfItems_liveblocks = children_liveblocks.length;
    const minCount = Math.min(numOfItems_lexical, numOfItems_liveblocks);

    let left = 0; // Stores the count of matching children from the start
    let right = 0; // Stores the count of matching children from the end

    /**
     * Scan from the left to find unchanged prefix ('left' pointer). Walks children from
     * index 0 forward and asks: “How many slots at the start are already in sync?”
     *
     * When the loop exits, 'left' =  length of the longest matching prefix where each pair is either:
     * - already mapped to the same Lexical object
     * - structurally equal (e.g. same node type, attributes, slots, and recursively its children)
     *
     * children (Lexical)     [  A  ,   B  ,   C  ,   D  ]
     * children (Storage)     [  A  ,   X  ,   C  ,   D  ]
     *                           ↑
     *                     left = 0   →  compare A vs A  →  continue
     *                     left = 1   →  compare B vs X  →  break
     */
    for (; left < minCount; left++) {
      const child_liveblocks = children_liveblocks.get(left);
      const child_lexical = children_lexical[left];

      if (child_liveblocks === undefined) break;

      const kind_liveblocks = child_liveblocks.get("kind");

      if (child_lexical instanceof Array) {
        if (kind_liveblocks !== "text") break;

        const text_liveblocks = child_liveblocks as LiveTextNode;
        // Get the Lexical node that is mapped to the current storage child.
        const text_lexical = this.#binding.forward.get(text_liveblocks);
        if (
          $isTextNodeList(text_lexical) &&
          areListsEqual(text_lexical, child_lexical)
        ) {
          continue;
        }

        // If the text nodes are structurally equal, we create a binding between the liveblocks and lexical nodes.
        if (areTextNodesStructurallyEqual(text_liveblocks, child_lexical)) {
          this.createBinding(text_liveblocks, child_lexical);
          continue;
        }
        break;
      } else {
        if (kind_liveblocks === "text") break;

        const element_liveblocks = child_liveblocks as LiveElementNode;
        // Get the Lexical node that is mapped to the current storage child.
        const element_lexical = this.#binding.forward.get(element_liveblocks);

        if ($isElementNode(child_lexical)) {
          if (kind_liveblocks !== "element") break;

          // If the mapped lexical node is an element node and is the same reference
          // as the current Lexical node, we recursively reconcile the node to synchronize
          // the children, properties, etc.
          if (
            $isLexicalNode(element_lexical) &&
            $isElementNode(element_lexical) &&
            element_lexical === child_lexical
          ) {
            if (dirtyNodes.has(child_lexical.getKey())) {
              this.$reconcileElementNodeFromLexical(
                element_lexical,
                element_liveblocks,
                dirtyNodes
              );
            }
            continue;
          }

          if (
            areElementNodesStructurallyEqual(element_liveblocks, child_lexical)
          ) {
            this.createBinding(element_liveblocks, child_lexical);
            continue;
          }

          break;
        } else if ($isLineBreakNode(child_lexical)) {
          if (kind_liveblocks !== "linebreak") break;

          const linebreak_liveblocks = child_liveblocks as LiveLineBreakNode;
          this.createBinding(linebreak_liveblocks, child_lexical);
          continue;
        } else if ($isDecoratorNode(child_lexical)) {
          if (kind_liveblocks !== "decorator") break;

          const decorator_liveblocks = child_liveblocks as LiveDecoratorNode;
          const decorator_lexical =
            this.#binding.forward.get(decorator_liveblocks);

          if (
            $isLexicalNode(decorator_lexical) &&
            $isDecoratorNode(decorator_lexical) &&
            decorator_lexical === child_lexical
          ) {
            if (dirtyNodes.has(child_lexical.getKey())) {
              this.$reconcileDecoratorNodeFromLexical(
                child_lexical,
                decorator_liveblocks
              );
            }
            continue;
          }

          if (
            areDecoratorNodesStructurallyEqual(
              decorator_liveblocks,
              child_lexical
            )
          ) {
            this.createBinding(decorator_liveblocks, child_lexical);
            continue;
          }

          break;
        } else {
          break;
        }
      }
    }

    /**
     * Scan from the right to find unchanged suffix ('right' pointer). Same rules as
     * the left scan, but pairs children from the end inward. Stops when left + right
     * would overlap (middle region is handled later).
     *
     * children (Lexical)     [  A  ,   B  ,   C  ,   D  ]
     * children (Storage)     [  A  ,   X  ,   C  ,   D  ]
     *                                              ↑
     *                     right = 0  →  compare D vs D  →  continue
     *                     right = 1  →  compare C vs C  →  continue
     *                     right = 2  →  would overlap with left → loop ends
     */
    for (; left + right < minCount; right++) {
      const child_liveblocks = children_liveblocks.get(
        numOfItems_liveblocks - right - 1
      );
      const child_lexical = children_lexical[numOfItems_lexical - right - 1];
      if (child_liveblocks === undefined) break;

      const kind_liveblocks = child_liveblocks.get("kind");

      if (child_lexical instanceof Array) {
        if (kind_liveblocks !== "text") break;
        const text_liveblocks = child_liveblocks as LiveTextNode;
        const text_lexical = this.#binding.forward.get(text_liveblocks);

        if (
          $isTextNodeList(text_lexical) &&
          areListsEqual(text_lexical, child_lexical)
        ) {
          continue;
        }

        if (areTextNodesStructurallyEqual(text_liveblocks, child_lexical)) {
          this.createBinding(text_liveblocks, child_lexical);
          continue;
        }
        break;
      } else {
        if (kind_liveblocks === "text") break;

        const element_liveblocks = child_liveblocks as LiveElementNode;
        const element_lexical = this.#binding.forward.get(element_liveblocks);

        if ($isElementNode(child_lexical)) {
          if (kind_liveblocks !== "element") break;
          if (
            $isLexicalNode(element_lexical) &&
            $isElementNode(element_lexical) &&
            element_lexical === child_lexical
          ) {
            if (dirtyNodes.has(child_lexical.getKey())) {
              this.$reconcileElementNodeFromLexical(
                element_lexical,
                element_liveblocks,
                dirtyNodes
              );
            }
            continue;
          }

          if (
            areElementNodesStructurallyEqual(element_liveblocks, child_lexical)
          ) {
            this.createBinding(element_liveblocks, child_lexical);
            continue;
          }

          break;
        } else if ($isLineBreakNode(child_lexical)) {
          if (kind_liveblocks !== "linebreak") break;
          const linebreak_liveblocks = child_liveblocks as LiveLineBreakNode;
          this.createBinding(linebreak_liveblocks, child_lexical);
          continue;
        } else if ($isDecoratorNode(child_lexical)) {
          if (kind_liveblocks !== "decorator") break;

          const decorator_liveblocks = child_liveblocks as LiveDecoratorNode;
          const decorator_lexical =
            this.#binding.forward.get(decorator_liveblocks);

          if (
            $isLexicalNode(decorator_lexical) &&
            $isDecoratorNode(decorator_lexical) &&
            decorator_lexical === child_lexical
          ) {
            if (dirtyNodes.has(child_lexical.getKey())) {
              this.$reconcileDecoratorNodeFromLexical(
                child_lexical,
                decorator_liveblocks
              );
            }
            continue;
          }

          if (
            areDecoratorNodesStructurallyEqual(
              decorator_liveblocks,
              child_lexical
            )
          ) {
            this.createBinding(decorator_liveblocks, child_lexical);
            continue;
          }

          break;
        } else {
          break;
        }
      }
    }

    while (
      numOfItems_lexical > left + right &&
      numOfItems_liveblocks > left + right
    ) {
      const child_liveblocks_left = children_liveblocks.get(left)!;
      const child_lexical_left = children_lexical[left];

      const kind_liveblocks = child_liveblocks_left.get("kind");

      if (kind_liveblocks === "text" && $isTextNodeList(child_lexical_left)) {
        this.$reconcileTextNodeFromLexical(
          child_lexical_left,
          child_liveblocks_left as LiveTextNode
        );
        left++;
        continue;
      }

      const isLeftElementSameType =
        kind_liveblocks === "element" &&
        $isLexicalNode(child_lexical_left) &&
        $isElementNode(child_lexical_left) &&
        (child_liveblocks_left as LiveElementNode).get("type") ===
          child_lexical_left.getType();

      const child_liveblocks_right = children_liveblocks.get(
        children_liveblocks.length - right - 1
      )!;
      const child_lexical_right =
        children_lexical[numOfItems_lexical - right - 1];
      const kind_liveblocks_right = child_liveblocks_right.get("kind");

      const isRightElementSameType =
        kind_liveblocks_right === "element" &&
        $isLexicalNode(child_lexical_right) &&
        $isElementNode(child_lexical_right) &&
        (child_liveblocks_right as LiveElementNode).get("type") ===
          child_lexical_right.getType();

      if (isLeftElementSameType && !isRightElementSameType) {
        this.$reconcileElementNodeFromLexical(
          child_lexical_left,
          child_liveblocks_left as LiveElementNode,
          dirtyNodes
        );
        left++;
        continue;
      } else if (!isLeftElementSameType && isRightElementSameType) {
        this.$reconcileElementNodeFromLexical(
          child_lexical_right,
          child_liveblocks_right as LiveElementNode,
          dirtyNodes
        );
        right++;
        continue;
      } else if (isLeftElementSameType && isRightElementSameType) {
        const counts_left = this.$getChildDiffOverlap(
          child_liveblocks_left as LiveElementNode,
          child_lexical_left
        );
        const counts_right = this.$getChildDiffOverlap(
          child_liveblocks_right as LiveElementNode,
          child_lexical_right
        );
        const overlap_left =
          counts_left.numOfMatchingPrefix + counts_left.numOfMatchingSuffix;
        const overlap_right =
          counts_right.numOfMatchingPrefix + counts_right.numOfMatchingSuffix;
        if (
          counts_left.numOfIdenticalChildren > 0 &&
          counts_right.numOfIdenticalChildren === 0
        ) {
          this.$reconcileElementNodeFromLexical(
            child_lexical_left,
            child_liveblocks_left as LiveElementNode,
            dirtyNodes
          );
          left++;
        } else if (
          counts_left.numOfIdenticalChildren === 0 &&
          counts_right.numOfIdenticalChildren > 0
        ) {
          this.$reconcileElementNodeFromLexical(
            child_lexical_right,
            child_liveblocks_right as LiveElementNode,
            dirtyNodes
          );
          right++;
        } else if (overlap_left < overlap_right) {
          this.$reconcileElementNodeFromLexical(
            child_lexical_right,
            child_liveblocks_right as LiveElementNode,
            dirtyNodes
          );
          right++;
        } else {
          this.$reconcileElementNodeFromLexical(
            child_lexical_left,
            child_liveblocks_left as LiveElementNode,
            dirtyNodes
          );
          left++;
        }
        continue;
      } else if (
        // Decorators are leaves — no child-overlap scoring. Same-type on the
        // left is enough; a right-only match reaches this branch on a later
        // iteration after the left slot is replaced.
        kind_liveblocks === "decorator" &&
        $isLexicalNode(child_lexical_left) &&
        $isDecoratorNode(child_lexical_left) &&
        (child_liveblocks_left as LiveDecoratorNode).get("type") ===
          child_lexical_left.getType()
      ) {
        this.$reconcileDecoratorNodeFromLexical(
          child_lexical_left,
          child_liveblocks_left as LiveDecoratorNode
        );
        left++;
        continue;
      } else {
        this.removeBindings(child_liveblocks_left);
        children_liveblocks.delete(left);

        const node_liveblocks =
          createStorageNodeFromLexicalNode(child_lexical_left);
        children_liveblocks.insert(node_liveblocks, left);
        this.createBinding(node_liveblocks, child_lexical_left);

        left++;
      }
    }

    const numOfChildrenToDelete = children_liveblocks.length - left - right;
    if (
      numOfItems_liveblocks === 1 &&
      numOfItems_lexical === 0 &&
      children_liveblocks.get(0)?.get("kind") === "text"
    ) {
      const text_liveblocks = children_liveblocks.get(0) as LiveTextNode;
      const content = text_liveblocks.get("content");
      if (content.length > 0) {
        content.delete(0, content.length);
      }
      this.createBinding(text_liveblocks, []);
    } else if (numOfChildrenToDelete > 0) {
      for (let i = 0; i < numOfChildrenToDelete; i++) {
        this.removeBindings(children_liveblocks.get(left)!);
        children_liveblocks.delete(left);
      }
    }

    // LiveList has no batch insert (Yjs: `insert(left, ins)`). Insert each
    // remaining child at its final index `i` so document order is preserved.
    if (left + right < numOfItems_lexical) {
      for (let i = left; i < numOfItems_lexical - right; i++) {
        const child_lexical = children_lexical[i];
        const node_liveblocks = createStorageNodeFromLexicalNode(child_lexical);
        children_liveblocks.insert(node_liveblocks, i);
        this.createBinding(node_liveblocks, child_lexical);
      }
    }
  }

  /**
   * Syncs a Lexical decorator onto its bound storage node (Lexical → Storage).
   * Decorators have no children channel — only `type` + optional `props`.
   */
  public $reconcileDecoratorNodeFromLexical(
    node_lexical: DecoratorNode<unknown>,
    node_liveblocks: LiveDecoratorNode
  ): void {
    node_lexical = node_lexical.getLatest();
    this.#binding.forward.set(node_liveblocks, node_lexical);
    this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);

    const type_lexical = node_lexical.getType();
    if (node_liveblocks.get("type") !== type_lexical) {
      node_liveblocks.set("type", type_lexical);
    }

    const props_lexical = $getLexicalNodeProps(node_lexical);
    const props_liveblocks = node_liveblocks.get("props");
    const props_liveblocks_json =
      props_liveblocks !== undefined ? props_liveblocks.toJSON() : undefined;
    if (
      !isEqual(props_lexical, props_liveblocks_json as JsonObject | undefined)
    ) {
      if (props_lexical === undefined) {
        node_liveblocks.delete("props");
      } else if (!(props_liveblocks instanceof LiveMap)) {
        node_liveblocks.set(
          "props",
          new LiveMap(
            Object.entries(props_lexical).filter(
              (entry): entry is [string, Json] => entry[1] !== undefined
            )
          )
        );
      } else {
        const keys = new Set(Object.keys(props_lexical));
        for (const key of props_liveblocks.keys()) {
          if (!keys.has(key)) {
            props_liveblocks.delete(key);
          }
        }
        for (const [key, value] of Object.entries(props_lexical)) {
          if (value === undefined) {
            continue;
          }
          if (props_liveblocks.get(key) !== value) {
            props_liveblocks.set(key, value);
          }
        }
      }
    }
  }

  public $reconcileTextNodeFromLexical(
    node_lexical: readonly TextNode[],
    node_liveblocks: LiveTextNode
  ): void {
    // Invariant: empty LiveText ↔ no attached TextNodes (`[]`). Detached keys
    // from a prior binding are not a live text slot — treat them as empty.
    const target = node_lexical
      .map((node) => $getNodeByKey(node.getKey()))
      .filter(
        (node): node is TextNode =>
          node !== null && $isTextNode(node) && node.isAttached()
      );

    if (target.length === 0) {
      const content = node_liveblocks.get("content");
      if (content.length > 0) {
        content.delete(0, content.length);
      }
      this.createBinding(node_liveblocks, []);
      return;
    }

    if (areTextNodesStructurallyEqual(node_liveblocks, target)) {
      this.createBinding(node_liveblocks, target);
      return;
    }

    const content = node_liveblocks.get("content");
    const segments_liveblocks = content.toJSON();
    const segments_target = createSegmentsFromTextNodes(target);

    const plain_liveblocks = segments_liveblocks
      .map((segment) => segment[0])
      .join("");
    const plain_target = target.map((node) => node.getTextContent()).join("");
    if (plain_liveblocks !== plain_target) {
      let prefix = 0;
      while (
        prefix < plain_liveblocks.length &&
        prefix < plain_target.length &&
        plain_liveblocks[prefix] === plain_target[prefix]
      ) {
        prefix++;
      }

      let suffix = 0;
      while (
        suffix < plain_liveblocks.length - prefix &&
        suffix < plain_target.length - prefix &&
        plain_liveblocks[plain_liveblocks.length - 1 - suffix] ===
          plain_target[plain_target.length - 1 - suffix]
      ) {
        suffix++;
      }

      const removeLength = plain_liveblocks.length - prefix - suffix;
      const insertText = plain_target.slice(
        prefix,
        plain_target.length - suffix
      );
      if (removeLength > 0 || insertText.length > 0) {
        content.replace(
          prefix,
          removeLength,
          insertText,
          insertText.length > 0
            ? getSegmentAttributesAtOffset(segments_target, prefix)
            : undefined
        );
      }
    }

    let offset = 0;
    for (const segment of segments_target) {
      const [text, attributes] = segment;
      const attributes_target: TextAttributes =
        attributes !== undefined ? { ...attributes } : {};

      const slice = getSegmentsInRange(content.toJSON(), {
        rangeStart: offset,
        rangeEnd: offset + text.length,
      });

      const patch = createLiveTextAttributesPatch(attributes_target, slice);
      const matches =
        slice.map((part) => part[0]).join("") === text &&
        slice.length === 1 &&
        Object.keys(patch).length === 0;

      if (!matches) {
        content.format(offset, text.length, patch);
      }

      offset += text.length;
    }

    this.createBinding(node_liveblocks, target);
  }

  /**
   * Scores how well a candidate element pair's children overlap from the start
   * and end.
   */
  private $getChildDiffOverlap(
    element_liveblocks: LiveElementNode,
    element_lexical: ElementNode
  ): {
    numOfMatchingPrefix: number;
    numOfMatchingSuffix: number;
    numOfIdenticalChildren: number;
  } {
    const children_liveblocks = element_liveblocks.get("children");
    const children_lexical = $normalizeLexicalChildren(element_lexical);

    const numOfChildren_liveblocks = children_liveblocks.length;
    const numOfChildren_lexical = children_lexical.length;

    const minCount = Math.min(numOfChildren_liveblocks, numOfChildren_lexical);

    let left = 0;
    let right = 0;
    let numOfIdenticalChildren = 0;

    for (; left < minCount; left++) {
      const child_liveblocks = children_liveblocks.get(left);
      const child_lexical = children_lexical[left];
      if (child_liveblocks === undefined) break;

      const kind_liveblocks = child_liveblocks.get("kind");

      if (child_lexical instanceof Array) {
        if (kind_liveblocks !== "text") break;

        const text_liveblocks = child_liveblocks as LiveTextNode;
        const text_lexical = this.#binding.forward.get(text_liveblocks);
        if (
          $isTextNodeList(text_lexical) &&
          areListsEqual(text_lexical, child_lexical)
        ) {
          numOfIdenticalChildren++;
        } else if (
          !areTextNodesStructurallyEqual(text_liveblocks, child_lexical)
        ) {
          break;
        }
      } else if ($isElementNode(child_lexical)) {
        if (kind_liveblocks !== "element") break;

        const element_lexical_mapped = this.#binding.forward.get(
          child_liveblocks as LiveElementNode
        );
        if (
          $isLexicalNode(element_lexical_mapped) &&
          $isElementNode(element_lexical_mapped) &&
          element_lexical_mapped === child_lexical
        ) {
          numOfIdenticalChildren++;
        } else if (
          !areElementNodesStructurallyEqual(
            child_liveblocks as LiveElementNode,
            child_lexical
          )
        ) {
          break;
        }
      } else {
        break;
      }
    }

    for (; left + right < minCount; right++) {
      const child_liveblocks = children_liveblocks.get(
        numOfChildren_liveblocks - right - 1
      );
      const child_lexical = children_lexical[numOfChildren_lexical - right - 1];
      if (child_liveblocks === undefined) break;

      const kind_liveblocks = child_liveblocks.get("kind");

      if (child_lexical instanceof Array) {
        if (kind_liveblocks !== "text") break;

        const text_liveblocks = child_liveblocks as LiveTextNode;
        const text_lexical = this.#binding.forward.get(text_liveblocks);
        if (
          $isTextNodeList(text_lexical) &&
          areListsEqual(text_lexical, child_lexical)
        ) {
          numOfIdenticalChildren++;
        } else if (
          !areTextNodesStructurallyEqual(text_liveblocks, child_lexical)
        ) {
          break;
        }
      } else if ($isElementNode(child_lexical)) {
        if (kind_liveblocks !== "element") break;

        const element_lexical_mapped = this.#binding.forward.get(
          child_liveblocks as LiveElementNode
        );
        if (
          $isLexicalNode(element_lexical_mapped) &&
          $isElementNode(element_lexical_mapped) &&
          element_lexical_mapped === child_lexical
        ) {
          numOfIdenticalChildren++;
        } else if (
          !areElementNodesStructurallyEqual(
            child_liveblocks as LiveElementNode,
            child_lexical
          )
        ) {
          break;
        }
      } else {
        break;
      }
    }

    return {
      numOfMatchingPrefix: left,
      numOfMatchingSuffix: right,
      numOfIdenticalChildren,
    };
  }

  public $applyRemoteUpdates(updates: readonly StorageUpdate[]) {
    // Apply peer edits and local undo/redo replays. Skip our own live
    // mutations — Lexical already reflects those. History updates use
    // `origin: "local", via: "history"` (see StorageUpdateSource).
    updates = updates.filter((update) => {
      const source = update[kStorageUpdateSource];
      return (
        source?.origin === "remote" ||
        (source?.origin === "local" && source.via === "history")
      );
    });
    if (updates.length === 0) {
      return;
    }

    // Snapshot Lexical nodes for deletes *before* dropping bindings. The
    // LiveList in the update is already post-delete, so sibling/segment index
    // math cannot recover the removed span — especially when a surviving
    // neighbor is a multi-segment LiveText (bold/plain splits). Binding is
    // the only reliable handle; clear it after we capture the nodes so a
    // later LiveText update in the same batch cannot mutate a detached slot.
    const deletedLexicalNodes = new Map<LiveStorageNode, LexicalNode[]>();
    for (const update of updates) {
      if (update.type !== "LiveList") {
        continue;
      }

      for (const change of update.updates) {
        if (
          change.type === "delete" &&
          change.deletedItem instanceof LiveObject
        ) {
          const child = change.deletedItem as LiveStorageNode;
          const nodes = this.$getBoundLexicalNodes(child);
          if (nodes.length > 0) {
            deletedLexicalNodes.set(child, nodes);
          }
          this.removeBindings(child);
        }
      }
    }

    for (const update of updates) {
      if (update.type === "LiveList") {
        const parent_liveblocks = this.findParentForLiveList(
          update.node as LiveList<LiveChildNode>
        );
        if (parent_liveblocks === null) {
          continue;
        }

        const parent_lexical = this.#binding.forward.get(parent_liveblocks);
        if (
          !$isLexicalNode(parent_lexical) ||
          !$isElementNode(parent_lexical)
        ) {
          continue;
        }

        for (const change of update.updates) {
          if (change.type === "insert") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }

            const child_liveblocks = change.item as LiveChildNode;
            if (
              this.#binding.forward.get(child_liveblocks as LiveStorageNode) !==
              undefined
            ) {
              continue;
            }

            const children_liveblocks = parent_liveblocks.get("children");
            let index_lexical = 0;
            for (let i = 0; i < change.index; i++) {
              const sibling = children_liveblocks.get(i);
              if (sibling === undefined) {
                break;
              }

              index_lexical +=
                sibling.get("kind") === "text"
                  ? (sibling as LiveTextNode).get("content").toJSON().length
                  : 1;
            }

            const parent = parent_lexical.getLatest();
            const kind = child_liveblocks.get("kind");

            if (kind === "text") {
              const nodes_lexical = $convertLiveTextNodeToLexicalNode(
                child_liveblocks as LiveTextNode
              );
              parent.splice(index_lexical, 0, nodes_lexical);
              this.createBinding(
                child_liveblocks as LiveTextNode,
                nodes_lexical
              );
            } else if (kind === "linebreak") {
              const node_lexical = $createLineBreakNode();
              parent.splice(index_lexical, 0, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveLineBreakNode,
                node_lexical
              );
            } else if (kind === "element") {
              const node_lexical = $convertLiveElementNodeToLexicalNode(
                child_liveblocks as LiveElementNode
              );
              parent.splice(index_lexical, 0, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveElementNode,
                node_lexical
              );
            } else if (kind === "decorator") {
              const node_lexical = $convertLiveDecoratorNodeToLexicalNode(
                child_liveblocks as LiveDecoratorNode
              );
              parent.splice(index_lexical, 0, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveDecoratorNode,
                node_lexical
              );
            } else {
              console.warn(
                `Unsupported remote insert of storage kind "${String(kind)}".`
              );
            }
          } else if (change.type === "delete") {
            if (!(change.deletedItem instanceof LiveObject)) {
              continue;
            }

            const child_liveblocks = change.deletedItem as LiveStorageNode;
            const nodes = (
              deletedLexicalNodes.get(child_liveblocks) ?? []
            ).filter((node) => node.isAttached());
            if (nodes.length === 0) {
              continue;
            }

            nodes.sort(
              (a, b) => a.getIndexWithinParent() - b.getIndexWithinParent()
            );
            const parent = nodes[0]!.getParent();
            if (parent === null || !$isElementNode(parent)) {
              continue;
            }

            parent
              .getLatest()
              .splice(nodes[0]!.getIndexWithinParent(), nodes.length, []);
          } else if (change.type === "move") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }

            if (change.previousIndex === change.index) {
              continue;
            }

            const child_liveblocks = change.item as LiveChildNode;
            const children_liveblocks = parent_liveblocks.get("children");

            // LiveList is already in the post-move order. Reconstruct the
            // Lexical splice index of the old position from previousIndex.
            let from_lexical = 0;
            if (change.previousIndex < change.index) {
              // Moved forward: items before previousIndex are unchanged.
              for (let i = 0; i < change.previousIndex; i++) {
                const sibling = children_liveblocks.get(i);
                if (sibling === undefined) {
                  break;
                }

                from_lexical +=
                  sibling.get("kind") === "text"
                    ? (sibling as LiveTextNode).get("content").toJSON().length
                    : 1;
              }
            } else {
              // Moved backward: old predecessors = [0, index) + [index+1, previousIndex].
              for (let i = 0; i <= change.previousIndex; i++) {
                if (i === change.index) {
                  continue;
                }

                const sibling = children_liveblocks.get(i);
                if (sibling === undefined) {
                  break;
                }

                from_lexical +=
                  sibling.get("kind") === "text"
                    ? (sibling as LiveTextNode).get("content").toJSON().length
                    : 1;
              }
            }

            const moveCount =
              child_liveblocks.get("kind") === "text"
                ? (child_liveblocks as LiveTextNode).get("content").toJSON()
                    .length
                : 1;

            const parent = parent_lexical.getLatest();
            const movedNodes = parent
              .getChildren()
              .slice(from_lexical, from_lexical + moveCount);
            parent.splice(from_lexical, moveCount, []);

            let index_lexical = 0;
            for (let i = 0; i < change.index; i++) {
              const sibling = children_liveblocks.get(i);
              if (sibling === undefined) {
                break;
              }

              index_lexical +=
                sibling.get("kind") === "text"
                  ? (sibling as LiveTextNode).get("content").toJSON().length
                  : 1;
            }

            parent.splice(index_lexical, 0, movedNodes);
          } else if (change.type === "set") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }

            const child_liveblocks = change.item as LiveChildNode;
            if (
              this.#binding.forward.get(child_liveblocks as LiveStorageNode) !==
              undefined
            ) {
              continue;
            }

            const children_liveblocks = parent_liveblocks.get("children");
            let index_lexical = 0;
            for (let i = 0; i < change.index; i++) {
              const sibling = children_liveblocks.get(i);
              if (sibling === undefined) {
                break;
              }

              index_lexical +=
                sibling.get("kind") === "text"
                  ? (sibling as LiveTextNode).get("content").toJSON().length
                  : 1;
            }

            // LiveList already holds the new item at change.index. Lexical still
            // has the old slot — read its span from normalized children, and drop
            // the old storage binding (set deltas do not include deletedItem).
            const parent = parent_lexical.getLatest();
            const children_lexical = $normalizeLexicalChildren(parent);
            const old_slot = children_lexical[change.index];
            let deleteCount = 0;
            if ($isTextNodeList(old_slot)) {
              const old_storage = this.#binding.reverse.get(
                old_slot[0].getKey()
              );
              if (old_storage !== undefined) {
                this.removeBindings(old_storage);
              }
              deleteCount = old_slot.length;
            } else if ($isLexicalNode(old_slot)) {
              const old_storage = this.#binding.reverse.get(old_slot.getKey());
              if (old_storage !== undefined) {
                this.removeBindings(old_storage);
              }
              deleteCount = 1;
            }

            const kind = child_liveblocks.get("kind");
            if (kind === "text") {
              const nodes_lexical = $convertLiveTextNodeToLexicalNode(
                child_liveblocks as LiveTextNode
              );
              parent.splice(index_lexical, deleteCount, nodes_lexical);
              this.createBinding(
                child_liveblocks as LiveTextNode,
                nodes_lexical
              );
            } else if (kind === "linebreak") {
              const node_lexical = $createLineBreakNode();
              parent.splice(index_lexical, deleteCount, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveLineBreakNode,
                node_lexical
              );
            } else if (kind === "element") {
              const node_lexical = $convertLiveElementNodeToLexicalNode(
                child_liveblocks as LiveElementNode
              );
              parent.splice(index_lexical, deleteCount, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveElementNode,
                node_lexical
              );
            } else if (kind === "decorator") {
              const node_lexical = $convertLiveDecoratorNodeToLexicalNode(
                child_liveblocks as LiveDecoratorNode
              );
              parent.splice(index_lexical, deleteCount, [node_lexical]);
              this.createBinding(
                child_liveblocks as LiveDecoratorNode,
                node_lexical
              );
            } else {
              console.warn(
                `Unsupported remote set of storage kind "${String(kind)}".`
              );
            }
          }
        }
        continue;
      }

      if (update.type === "LiveText") {
        // LiveTextUpdate.node is the inner LiveText; find its LiveTextNode wrapper.
        const text_liveblocks = find_liveblocksNode(this.root, (node) => {
          if (node.get("kind") !== "text") {
            return false;
          }
          return (node as LiveTextNode).get("content") === update.node;
        }) as LiveTextNode | null;
        if (text_liveblocks === null) {
          continue;
        }

        const text_lexical = this.#binding.forward.get(text_liveblocks);
        if ($isTextNodeList(text_lexical)) {
          this.$reconcileTextNodeFromLiveblocks(text_lexical, text_liveblocks);
          continue;
        }

        // Unmapped LiveText — insert (or bind empty) at the storage child's
        // Lexical span index under its parent.
        this.$insertLexicalTextFromStorage(text_liveblocks);
      }

      if (update.type === "LiveObject") {
        const node_liveblocks = update.node as LiveStorageNode;
        const kind = node_liveblocks.get("kind");
        if (kind !== "element" && kind !== "decorator") {
          continue;
        }

        const keysChanged = update.updates;
        if (!("type" in keysChanged) && !("props" in keysChanged)) {
          continue;
        }

        const node_lexical = this.#binding.forward.get(node_liveblocks);
        if (!$isLexicalNode(node_lexical)) {
          continue;
        }

        if (kind === "element" && $isElementNode(node_lexical)) {
          let element_lexical = node_lexical.getLatest();
          const type_liveblocks = (node_liveblocks as LiveElementNode).get(
            "type"
          );

          if (
            "type" in keysChanged &&
            element_lexical.getType() !== type_liveblocks
          ) {
            const info = $getEditor()._nodes.get(type_liveblocks);
            if (info === undefined) {
              console.warn(
                `Unsupported remote type change to "${type_liveblocks}".`
              );
              continue;
            }

            const next_lexical = new info.klass();
            if (!$isElementNode(next_lexical)) {
              console.warn(
                `Remote type "${type_liveblocks}" is not an ElementNode.`
              );
              continue;
            }

            next_lexical.append(...element_lexical.getChildren());
            element_lexical.replace(next_lexical);
            element_lexical = next_lexical.getLatest();
            this.createBinding(
              node_liveblocks as LiveElementNode,
              element_lexical
            );
          }

          if ("type" in keysChanged || "props" in keysChanged) {
            const props_liveblocks = (node_liveblocks as LiveElementNode).get(
              "props"
            );
            $setLexicalNodeProps(
              element_lexical,
              props_liveblocks !== undefined
                ? (props_liveblocks.toJSON() as JsonObject)
                : undefined
            );
          }
        } else if (kind === "decorator" && $isDecoratorNode(node_lexical)) {
          let decorator_lexical = node_lexical.getLatest();
          const type_liveblocks = (node_liveblocks as LiveDecoratorNode).get(
            "type"
          );

          if (
            "type" in keysChanged &&
            decorator_lexical.getType() !== type_liveblocks
          ) {
            const info = $getEditor()._nodes.get(type_liveblocks);
            if (info === undefined) {
              console.warn(
                `Unsupported remote type change to "${type_liveblocks}".`
              );
              continue;
            }

            const next_lexical = new info.klass();
            if (!$isDecoratorNode(next_lexical)) {
              console.warn(
                `Remote type "${type_liveblocks}" is not a DecoratorNode.`
              );
              continue;
            }

            decorator_lexical.replace(next_lexical);
            decorator_lexical = next_lexical.getLatest();
            this.createBinding(
              node_liveblocks as LiveDecoratorNode,
              decorator_lexical
            );
          }

          if ("type" in keysChanged || "props" in keysChanged) {
            const props_liveblocks = (node_liveblocks as LiveDecoratorNode).get(
              "props"
            );
            $setLexicalNodeProps(
              decorator_lexical,
              props_liveblocks !== undefined
                ? (props_liveblocks.toJSON() as JsonObject)
                : undefined
            );
          }
        }
        continue;
      }

      if (update.type === "LiveMap") {
        // Granular props edits land on the element's/decorator's props LiveMap,
        // not the LiveObject itself (after the map has been attached).
        const host_liveblocks = find_liveblocksNode(this.root, (node) => {
          if (
            node.get("kind") !== "element" &&
            node.get("kind") !== "decorator"
          ) {
            return false;
          }
          return (node as LiveRootChildNode).get("props") === update.node;
        }) as LiveRootChildNode | null;
        if (host_liveblocks === null) {
          continue;
        }

        const node_lexical = this.#binding.forward.get(host_liveblocks);
        if (
          !$isLexicalNode(node_lexical) ||
          (!$isElementNode(node_lexical) && !$isDecoratorNode(node_lexical))
        ) {
          continue;
        }

        const props_liveblocks = host_liveblocks.get("props");
        $setLexicalNodeProps(
          node_lexical.getLatest(),
          props_liveblocks !== undefined
            ? (props_liveblocks.toJSON() as JsonObject)
            : undefined
        );
      }
    }
  }

  /**
   * Reconciles a coalesced storage text child into Lexical (Storage → Lexical).
   * Inverse of `$reconcileTextNodeFromLexical`.
   *
   * Empty invariant (same as Lexical → Storage / Yjs XmlText):
   *   LiveText []  ↔  no attached TextNodes (`[]`)
   * Non-empty LiveText materializes 1..N TextNodes; empty never invents a
   * placeholder `TextNode ""`.
   *
   * When structure already matches, only the binding is refreshed. Otherwise:
   *   1. Empty storage → remove any leftover TextNodes, bind `[]`
   *   2. Empty Lexical slot + storage content → insert converted TextNodes
   *   3. Plain-text diff via prefix/suffix + `spliceText` (single TextNode)
   *   4. Per-segment format sync when segment count matches TextNode count
   *   5. Replace the Lexical text span when coalescing diverges
   */
  public $reconcileTextNodeFromLiveblocks(
    node_lexical: readonly TextNode[],
    node_liveblocks: LiveTextNode
  ): void {
    const target = node_lexical
      .map((node) => $getNodeByKey(node.getKey()))
      .filter(
        (node): node is TextNode =>
          node !== null && $isTextNode(node) && node.isAttached()
      );

    const segments_liveblocks = node_liveblocks.get("content").toJSON();

    if (segments_liveblocks.length === 0) {
      if (target.length > 0) {
        const parent = target[0].getParent();
        if (parent !== null && $isElementNode(parent)) {
          parent
            .getLatest()
            .splice(target[0].getIndexWithinParent(), target.length, []);
        }
      }
      this.createBinding(node_liveblocks, []);
      return;
    }

    if (target.length === 0) {
      this.$insertLexicalTextFromStorage(node_liveblocks);
      return;
    }

    if (areTextNodesStructurallyEqual(node_liveblocks, target)) {
      this.createBinding(node_liveblocks, target);
      return;
    }

    const plain_liveblocks = segments_liveblocks
      .map((segment) => segment[0])
      .join("");
    const plain_target = target.map((node) => node.getTextContent()).join("");

    if (plain_liveblocks !== plain_target) {
      if (target.length === 1) {
        const node = target[0].getWritable();
        const current = node.getTextContent();

        let prefix = 0;
        while (
          prefix < current.length &&
          prefix < plain_liveblocks.length &&
          current[prefix] === plain_liveblocks[prefix]
        ) {
          prefix++;
        }

        let suffix = 0;
        while (
          suffix < current.length - prefix &&
          suffix < plain_liveblocks.length - prefix &&
          current[current.length - 1 - suffix] ===
            plain_liveblocks[plain_liveblocks.length - 1 - suffix]
        ) {
          suffix++;
        }

        const removeLength = current.length - prefix - suffix;
        const insertText = plain_liveblocks.slice(
          prefix,
          plain_liveblocks.length - suffix
        );

        if (removeLength > 0 || insertText.length > 0) {
          node.spliceText(prefix, removeLength, insertText);
        }
      } else {
        this.$replaceLexicalTextSlot(target, node_liveblocks);
        return;
      }
    }

    const refreshed = target
      .map((node) => $getNodeByKey(node.getKey()))
      .filter(
        (node): node is TextNode =>
          node !== null && $isTextNode(node) && node.isAttached()
      );

    if (segments_liveblocks.length !== refreshed.length) {
      this.$replaceLexicalTextSlot(refreshed, node_liveblocks);
      return;
    }

    for (let i = 0; i < refreshed.length; i++) {
      const segment = segments_liveblocks[i];
      const attributes =
        segment.length > 1 ? (segment[1] as TextAttributes) : {};
      const segmentType =
        typeof attributes.type === "string"
          ? attributes.type
          : (TEXT_ATTRIBUTE_DEFAULTS.type as string);
      if (refreshed[i].getType() !== segmentType) {
        this.$replaceLexicalTextSlot(refreshed, node_liveblocks);
        return;
      }
    }

    for (let i = 0; i < refreshed.length; i++) {
      const segment = segments_liveblocks[i];
      const attributes =
        segment.length > 1 ? (segment[1] as TextAttributes) : undefined;
      refreshed[i]
        .getWritable()
        .updateFromJSON(
          createSerializedTextNodeFromLiveTextSegment(segment[0], attributes)
        );
    }

    const rebound = refreshed
      .map((node) => $getNodeByKey(node.getKey()))
      .filter(
        (node): node is TextNode =>
          node !== null && $isTextNode(node) && node.isAttached()
      );
    this.createBinding(node_liveblocks, rebound);
  }

  /**
   * Replaces an existing Lexical text span with TextNodes converted from
   * storage. `node_lexical` must be non-empty attached nodes with a parent.
   */
  private $replaceLexicalTextSlot(
    node_lexical: readonly TextNode[],
    node_liveblocks: LiveTextNode
  ): void {
    const parent = node_lexical[0].getParent();
    if (parent === null || !$isElementNode(parent)) {
      return;
    }

    const insertIndex = node_lexical[0].getIndexWithinParent();
    const nodes_lexical = $convertLiveTextNodeToLexicalNode(node_liveblocks);
    parent.getLatest().splice(insertIndex, node_lexical.length, nodes_lexical);
    this.createBinding(node_liveblocks, nodes_lexical);
  }

  /**
   * Empty → content transition: insert TextNodes for a storage text child that
   * currently has no attached Lexical text nodes (`[]` binding).
   */
  private $insertLexicalTextFromStorage(node_liveblocks: LiveTextNode): void {
    const parent_liveblocks = this.findParent_liveblocks(node_liveblocks);
    if (parent_liveblocks === null) {
      return;
    }

    const parent_lexical = this.#binding.forward.get(parent_liveblocks);
    if (!$isLexicalNode(parent_lexical) || !$isElementNode(parent_lexical)) {
      return;
    }

    const children_liveblocks = parent_liveblocks.get("children");
    const index_liveblocks = children_liveblocks.indexOf(
      node_liveblocks as never
    );
    if (index_liveblocks === -1) {
      return;
    }

    let index_lexical = 0;
    for (let i = 0; i < index_liveblocks; i++) {
      const sibling = children_liveblocks.get(i);
      if (sibling === undefined) {
        break;
      }
      index_lexical +=
        sibling.get("kind") === "text"
          ? (sibling as LiveTextNode).get("content").toJSON().length
          : 1;
    }

    const nodes_lexical = $convertLiveTextNodeToLexicalNode(node_liveblocks);
    if (nodes_lexical.length === 0) {
      this.createBinding(node_liveblocks, []);
      return;
    }

    parent_lexical.getLatest().splice(index_lexical, 0, nodes_lexical);
    this.createBinding(node_liveblocks, nodes_lexical);
  }

  /**
   * Lexical nodes currently bound to a storage child. Text children return the
   * coalesced TextNode[] span; elements/decorators/linebreaks return one node.
   */
  private $getBoundLexicalNodes(node: LiveStorageNode): LexicalNode[] {
    const bound = this.#binding.forward.get(node);
    if (bound === undefined) {
      return [];
    }

    if (bound instanceof Array) {
      return bound.filter(
        (child) => $getNodeByKey(child.getKey()) !== null && child.isAttached()
      );
    }

    const latest = $getNodeByKey(bound.getKey());
    if (latest === null || !latest.isAttached()) {
      return [];
    }
    return [latest];
  }

  /**
   * @internal
   * Recursively build binding between a storage element and its matching Lexical node.
   */
  public createBinding(
    node_liveblocks: LiveTextNode,
    node_lexical: readonly TextNode[]
  ): void;
  public createBinding(
    node_liveblocks: LiveObject<
      LiveElementShape | LiveLineBreakShape | LiveDecoratorShape
    >,
    node_lexical: ElementNode | LineBreakNode | DecoratorNode<unknown>
  ): void;
  public createBinding(
    node_liveblocks: LiveChildNode,
    node_lexical:
      | readonly TextNode[]
      | ElementNode
      | LineBreakNode
      | DecoratorNode<unknown>
  ): void;
  public createBinding(
    node_liveblocks:
      | LiveTextNode
      | LiveObject<LiveElementShape | LiveLineBreakShape | LiveDecoratorShape>,
    node_lexical:
      | readonly TextNode[]
      | ElementNode
      | LineBreakNode
      | DecoratorNode<unknown>
  ) {
    if (node_lexical instanceof Array) {
      // Drop reverse entries from a previous TextNode[] binding so empty `[]`
      // and rebinds do not leave stale keys pointing at this LiveText.
      const previous = this.#binding.forward.get(node_liveblocks);
      if (previous instanceof Array) {
        for (const child of previous) {
          if (this.#binding.reverse.get(child.getKey()) === node_liveblocks) {
            this.#binding.reverse.delete(child.getKey());
          }
        }
      }

      this.#binding.forward.set(node_liveblocks, node_lexical);
      for (const node of node_lexical) {
        this.#binding.reverse.set(node.getKey(), node_liveblocks);
      }
    } else {
      if ($isElementNode(node_lexical)) {
        this.#binding.forward.set(node_liveblocks, node_lexical);
        this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);

        const children_lexical = node_lexical.getChildren();
        let index = 0;
        for (const child of (node_liveblocks as LiveElementNode).get(
          "children"
        )) {
          const kind = child.get("kind");

          switch (kind) {
            case "text": {
              // Empty LiveText ↔ []; non-empty ↔ one TextNode per segment.
              const node = child as LiveTextNode;
              const count = node.get("content").toJSON().length;
              const nodes = children_lexical.slice(
                index,
                index + count
              ) as TextNode[];
              this.createBinding(node, nodes);
              index += count;
              break;
            }
            case "linebreak": {
              const liveLineBreak = child as LiveLineBreakNode;
              const lineBreakNode = children_lexical[index] as LineBreakNode;
              this.#binding.forward.set(liveLineBreak, lineBreakNode);
              this.#binding.reverse.set(lineBreakNode.getKey(), liveLineBreak);
              index++;
              break;
            }
            case "element": {
              this.createBinding(
                child as LiveElementNode,
                children_lexical[index] as ElementNode
              );
              index++;
              break;
            }
            case "decorator": {
              this.createBinding(
                child as LiveDecoratorNode,
                children_lexical[index] as DecoratorNode<unknown>
              );
              index++;
              break;
            }
            default:
              throw new Error(`Unsupported node of kind "${String(kind)}"`);
          }
        }
      } else if ($isLineBreakNode(node_lexical)) {
        this.#binding.forward.set(node_liveblocks, node_lexical);
        this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);
      } else if ($isDecoratorNode(node_lexical)) {
        this.#binding.forward.set(node_liveblocks, node_lexical);
        this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);
      }
    }
  }

  private removeBindings(node: LiveStorageNode): void {
    const node_lexical = this.#binding.forward.get(node);
    if (node_lexical !== undefined) {
      // Only delete reverse entries this storage node still owns — a Lexical
      // node may have been rebound to a fresh storage child already (e.g.
      // after a reparent), and that new binding must survive.
      if (node_lexical instanceof Array) {
        for (const child of node_lexical) {
          if (this.#binding.reverse.get(child.getKey()) === node) {
            this.#binding.reverse.delete(child.getKey());
          }
        }
      } else {
        if (this.#binding.reverse.get(node_lexical.getKey()) === node) {
          this.#binding.reverse.delete(node_lexical.getKey());
        }
      }
      this.#binding.forward.delete(node);
    }

    const kind = node.get("kind");
    if (kind === "element") {
      for (const child of (node as LiveElementNode).get("children")) {
        this.removeBindings(child);
      }
    } else if (kind === "root") {
      for (const child of (node as LiveRootNode).get("children")) {
        this.removeBindings(child);
      }
    }
  }

  /**
   * Finds the storage host whose 'children' list property is the given 'LiveList'.
   * Performs a depth-first search, starting from the root, only descending into
   * element nodes' children, and returns the first matching parent whose children
   * reference equals the given list. If none is found, it returns null.
   *
   * @example
   *
   * Storage:
   *   root.children (LiveList)  ← update.node
   *     ├── paragraph P0
   *     └── paragraph P1  (newly inserted)
   *
   * findParentForLiveList(root.children) → root
   *
   * @example
   *
   * Storage:
   *   root
   *     └── paragraph P1
   *           children (LiveList)  ← update.node
   *             ├── text
   *             └── linebreak
   *
   * findParentForLiveList(P1.children) → paragraph P1
   */
  private findParentForLiveList(
    children: LiveList<LiveChildNode>
  ): LiveObject<LiveRootShape | LiveElementShape> | null {
    const parentsToSearch: LiveObject<LiveRootShape | LiveElementShape>[] = [
      this.root,
    ];

    while (parentsToSearch.length > 0) {
      const candidate = parentsToSearch.pop()!;
      if (candidate.get("children") === children) {
        return candidate;
      }

      for (const child of candidate.get("children")) {
        if ((child as LiveChildNode).get("kind") === "element") {
          parentsToSearch.push(child as LiveElementNode);
        }
      }
    }

    return null;
  }

  private findParent_liveblocks(
    node: LiveChildNode
  ): LiveObject<LiveRootShape | LiveElementShape> | null;
  private findParent_liveblocks(
    node: LexicalNode
  ): LiveObject<LiveRootShape | LiveElementShape> | null;
  private findParent_liveblocks(
    node: LiveChildNode | LexicalNode
  ): LiveObject<LiveRootShape | LiveElementShape> | null {
    if (node instanceof LiveObject) {
      return this.findStorageParent(this.root, node);
    } else {
      const parent_lexical = node.getParent();
      if (parent_lexical === null) {
        return null;
      }
      if ($isRootNode(parent_lexical)) {
        return this.root;
      }
      if ($isElementNode(parent_lexical)) {
        const parent_liveblocks = this.#binding.reverse.get(
          parent_lexical.getKey()
        );
        if (parent_liveblocks !== undefined) {
          return parent_liveblocks as LiveObject<
            LiveRootShape | LiveElementShape
          >;
        }
      }
      return this.findParent_liveblocks(parent_lexical);
    }
  }

  private findStorageParent(
    parent: LiveObject<LiveRootShape | LiveElementShape>,
    target: LiveChildNode
  ): LiveObject<LiveRootShape | LiveElementShape> | null {
    const children = parent.get("children") as LiveList<LiveChildNode>;
    if (children.indexOf(target as never) !== -1) {
      return parent;
    }

    for (const sibling of children) {
      if (sibling.get("kind") !== "element") continue;

      const element = sibling as LiveObject<LiveElementShape>;
      const nested = this.findStorageParent(element, target);
      if (nested !== null) {
        return nested;
      }
    }
    return null;
  }
}

/**
 * Normalized Lexical child slots for binding-aware index matching.
 *
 * LiveList indices count storage children; Lexical may have more raw children
 * because one storage text child spans multiple TextNodes. Consecutive TextNodes
 * coalesce into one slot only when `reverse` maps them to the same storage node.
 *
 * @example One storage text child, two TextNodes → one slot
 *
 * Storage paragraph P1                 Lexical paragraph p1
 *  └── [0] text (LiveText)              ├── [t1 "Hello " bold, t2 "!"]  ← slot 0
 *       [["Hello ",{bold}],["!"]]       └── (raw index 0–1 → normalized 0)
 *
 * @example Element children → one slot each
 *
 * Lexical (normalized):  [ [t1,t2], LineBreak, t3 ]
 * LiveList indices:           0         1       2
 */
function $normalizeLexicalChildren(
  node: ElementNode
): Array<
  readonly TextNode[] | ElementNode | LineBreakNode | DecoratorNode<unknown>
> {
  const children = node.getChildren();
  const slots: Array<
    TextNode[] | ElementNode | LineBreakNode | DecoratorNode<unknown>
  > = [];

  for (let i = 0; i < children.length; ) {
    const child = children[i];
    if ($isTextNode(child)) {
      const nodes: TextNode[] = [child];
      i++;
      while (i < children.length) {
        const node = children[i];
        if (!$isTextNode(node)) break;

        nodes.push(node);
        i++;
      }
      slots.push(nodes);
    } else if ($isElementNode(child)) {
      slots.push(child.getLatest());
      i++;
    } else if ($isLineBreakNode(child)) {
      slots.push(child.getLatest());
      i++;
    } else if ($isDecoratorNode(child)) {
      slots.push(child.getLatest());
      i++;
    } else {
      console.warn(
        `Unsupported lexical node type "${child.getType()}" for storage materialization.`
      );
      i++;
    }
  }

  return slots;
}

function $isLexicalNode(
  node: LexicalNode | readonly TextNode[] | undefined
): node is LexicalNode {
  if (node === undefined) return false;
  if (node instanceof Array) return false;
  return true;
}

function $isTextNodeList(
  node: LexicalNode | readonly TextNode[] | undefined
): node is readonly TextNode[] {
  if (node === undefined) return false;
  if (!(node instanceof Array)) return false;
  return true;
}

function areListsEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isEqual(
  a: JsonObject | undefined,
  b: JsonObject | undefined
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  const leftKeys = Object.keys(a);
  const rightKeys = Object.keys(b);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Materializes a Liveblocks storage child from Lexical content (Lexical → Live).
 *
 * Dispatches by input shape:
 *   - `TextNode[]`  → one `LiveTextNode` (coalesced segments)
 *   - linebreak     → `LiveLineBreakNode`
 *   - decorator     → `LiveDecoratorNode` (`type` + optional `props`)
 *   - element       → recurse into raw Lexical children (consecutive TextNodes coalesce)
 *
 * @example Coalesced text — two Lexical spans, one LiveText child
 *
 * Lexical (normalized slot):              Storage (return value):
 *   [TextNode "Hello " (bold),              text
 *    TextNode "world"]                       └── LiveText segments:
 *                                              ["Hello ", {bold}]
 *                                              ["world"]
 *
 * @example New paragraph insert at root
 *
 * Lexical:                                 Storage:
 *   Paragraph p2 (unbound)                  element (paragraph)
 *    └── TextNode "Hi"                       └── text → [["Hi"]]
 *
 * @example Paragraph with line break
 *
 * Lexical:                                 Storage:
 *   Paragraph                                element (paragraph)
 *    ├── TextNode "Hi"                         ├── text → [["Hi"]]
 *    └── LineBreak                             └── linebreak
 *
 * @example Nested element
 *
 * Lexical:                                 Storage:
 *   Quote                                    element (quote)
 *    └── Paragraph                             └── element (paragraph)
 *         └── TextNode "Hi"                         └── text → [["Hi"]]
 *
 * @param node - A normalized text slot (`TextNode[]`) or a single Lexical node.
 * @returns A new storage child ready to insert into a parent `children` LiveList.
 * @throws {Error} When the Lexical node type is not supported for materialization.
 */

export function createStorageNodeFromLexicalNode(
  node: readonly TextNode[]
): LiveTextNode;
export function createStorageNodeFromLexicalNode(
  node: ElementNode
): LiveElementNode;
export function createStorageNodeFromLexicalNode(
  node: LineBreakNode
): LiveLineBreakNode;
export function createStorageNodeFromLexicalNode(
  node: DecoratorNode<unknown>
): LiveDecoratorNode;
export function createStorageNodeFromLexicalNode(
  node:
    | readonly TextNode[]
    | ElementNode
    | LineBreakNode
    | DecoratorNode<unknown>
): LiveChildNode;
export function createStorageNodeFromLexicalNode(
  node: LexicalNode | readonly TextNode[]
): LiveElementNode | LiveTextNode | LiveLineBreakNode | LiveDecoratorNode {
  if (node instanceof Array) {
    const node_liveblocks = new LiveObject<LiveTextShape>({
      kind: "text",
      type: "text",
      version: 1,
      content: new LiveText(),
    });

    const text = node_liveblocks.get("content");
    const segments = createSegmentsFromTextNodes(
      node.map((n) => n.getLatest())
    );
    let offset = 0;
    for (const segment of segments) {
      const [str, attributes] = segment;
      if (str.length === 0) continue;
      text.insert(
        offset,
        str,
        attributes !== undefined ? attributes : undefined
      );
      offset += str.length;
    }

    return node_liveblocks;
  }

  if ($isElementNode(node)) {
    const children_liveblocks: LiveChildNode[] = [];
    const children_lexical = node.getChildren();

    for (let i = 0; i < children_lexical.length; i++) {
      const child = children_lexical[i];
      if ($isTextNode(child)) {
        const textNodes: TextNode[] = [];
        for (
          let textNode = child;
          i < children_lexical.length && $isTextNode(textNode);
          textNode = children_lexical[++i] as TextNode
        ) {
          textNodes.push(textNode.getLatest());
        }
        i--;
        children_liveblocks.push(createStorageNodeFromLexicalNode(textNodes));
      } else if ($isElementNode(child)) {
        children_liveblocks.push(
          createStorageNodeFromLexicalNode(child.getLatest())
        );
      } else if ($isLineBreakNode(child)) {
        children_liveblocks.push(createStorageNodeFromLexicalNode(child));
      } else if ($isDecoratorNode(child)) {
        children_liveblocks.push(
          createStorageNodeFromLexicalNode(child.getLatest())
        );
      } else {
        throw new Error(
          `Unsupported lexical node type "${child.getType()}" for storage materialization.`
        );
      }
    }

    const props_lexical = $getLexicalNodeProps(node);

    return new LiveObject<LiveElementShape>({
      kind: "element",
      type: node.getType(),
      version: 1,
      children: new LiveList(children_liveblocks),
      ...(props_lexical !== undefined
        ? {
            props: new LiveMap(
              Object.entries(props_lexical).filter(
                (entry): entry is [string, Json] => entry[1] !== undefined
              )
            ),
          }
        : {}),
    });
  }

  if ($isLineBreakNode(node)) {
    return new LiveObject<LiveLineBreakShape>({
      kind: "linebreak",
      type: "linebreak",
      version: 1,
    });
  }

  if ($isDecoratorNode(node)) {
    const props_lexical = $getLexicalNodeProps(node);

    return new LiveObject<LiveDecoratorShape>({
      kind: "decorator",
      type: node.getType(),
      version: 1,
      ...(props_lexical !== undefined
        ? {
            props: new LiveMap(
              Object.entries(props_lexical).filter(
                (entry): entry is [string, Json] => entry[1] !== undefined
              )
            ),
          }
        : {}),
    });
  }

  throw new Error(
    `Unsupported lexical node type "${node.getType()}" for storage materialization.`
  );
}

/**
 * Builds a Lexical element from a storage element node, recursing into its LiveList children
 * (bootstrap: Live → Lexical). Used when loading the document on first connect.
 *
 * Dispatches each child by `kind`:
 *   - `text`     → spread `$convertLiveTextNodeToLexicalNode` (1 storage child → N TextNodes)
 *   - `linebreak`→ `$createLineBreakNode()`
 *   - `element`  → recurse
 *   - `decorator`→ `$convertLiveDecoratorNodeToLexicalNode`
 *
 * The Lexical class is resolved from `node.get("type")` (e.g. `"paragraph"`, `"heading"`).
 *
 * @example Paragraph with coalesced text
 *
 * Storage:                                Lexical (return value):
 *   element (paragraph)                     Paragraph
 *    └── text → [["Hello ", {bold}],            ├── TextNode "Hello " (bold)
 *                ["world"]]                     └── TextNode "world"
 *
 * @example Nested quote → paragraph
 *
 * Storage:                                Lexical:
 *   element (quote)                         Quote
 *    └── element (paragraph)                 └── Paragraph
 *         └── text → [["Hi"]]                      └── TextNode "Hi"
 *
 * @example Paragraph with line break
 *
 * Storage:                                Lexical:
 *   element (paragraph)                     Paragraph
 *    ├── text → [["Hi"]]                      ├── TextNode "Hi"
 *    └── linebreak                             └── LineBreak
 *
 * @example Paragraph with decorator
 *
 * Storage:                                Lexical:
 *   element (paragraph)                     Paragraph
 *    ├── text → [["Hi"]]                      ├── TextNode "Hi"
 *    └── decorator (image, props)              └── ImageNode
 */
function $convertLiveElementNodeToLexicalNode(
  node: LiveElementNode
): ElementNode {
  const editor = $getEditor();
  const type = node.get("type");
  const info = editor._nodes.get(type);
  if (info === undefined) {
    throw new Error(
      `Node of type "${type}" is not registered. Please ensure that the node has been registered with the editor.`
    );
  }
  const node_lexical = new info.klass();
  if (!$isElementNode(node_lexical)) {
    throw new Error(`Node of type "${type}" is not an ElementNode.`);
  }

  const children: LexicalNode[] = [];
  const children_liveblocks = node.get("children");
  if (children_liveblocks === undefined) {
    return node_lexical.getLatest();
  }
  for (const child of children_liveblocks) {
    const kind = child.get("kind");
    switch (kind) {
      case "text":
        children.push(
          ...$convertLiveTextNodeToLexicalNode(child as LiveTextNode)
        );
        break;
      case "linebreak":
        children.push($createLineBreakNode());
        break;
      case "element":
        children.push(
          $convertLiveElementNodeToLexicalNode(child as LiveElementNode)
        );
        break;
      case "decorator":
        children.push(
          $convertLiveDecoratorNodeToLexicalNode(child as LiveDecoratorNode)
        );
        break;
      default:
        throw new Error(`Unsupported live node kind "${String(kind)}"`);
    }
  }

  node_lexical.append(...children);

  const props_liveblocks = node.get("props");
  if (props_liveblocks !== undefined) {
    $setLexicalNodeProps(node_lexical, props_liveblocks.toJSON() as JsonObject);
  }

  return node_lexical.getLatest();
}

/**
 * Builds a Lexical decorator from a storage decorator node (bootstrap: Live → Lexical).
 *
 * Decorators have no children channel — only `type` + optional `props`.
 */
function $convertLiveDecoratorNodeToLexicalNode(
  node: LiveDecoratorNode
): DecoratorNode<unknown> {
  const editor = $getEditor();
  const type = node.get("type");
  const info = editor._nodes.get(type);
  if (info === undefined) {
    throw new Error(
      `Node of type "${type}" is not registered. Please ensure that the node has been registered with the editor.`
    );
  }
  const node_lexical = new info.klass();
  if (!$isDecoratorNode(node_lexical)) {
    throw new Error(`Node of type "${type}" is not a DecoratorNode.`);
  }

  const props_liveblocks = node.get("props");
  if (props_liveblocks !== undefined) {
    $setLexicalNodeProps(node_lexical, props_liveblocks.toJSON() as JsonObject);
  }

  return node_lexical.getLatest();
}

/**
 * Builds one or more Lexical TextNodes from a single storage text child (bootstrap: Live → Lexical).
 *
 * Storage coalesces sibling spans into one LiveText; this function splits segments back into
 * separate TextNodes, applying inline format flags from each segment's attributes.
 *
 * @example Multiple segments → multiple TextNodes
 *
 * Storage (one text child):              Lexical (return value):
 *   text → LiveText segments:              [
 *     ["Hello ", {bold: true}]                 TextNode "Hello " (bold),
 *     ["world"]                                TextNode "world"
 *                                           ]
 *
 * @example Empty LiveText → no Lexical TextNodes
 *
 * Storage:                                Lexical:
 *   text → LiveText: []                     []
 *
 * @example Single unformatted segment
 *
 * Storage:                                Lexical:
 *   text → LiveText: [["hello"]]            [TextNode "hello"]
 */
function $convertLiveTextNodeToLexicalNode(node: LiveTextNode): TextNode[] {
  const segments = node.get("content").toJSON();
  if (segments.length === 0) {
    return [];
  }

  const nodes: TextNode[] = [];
  for (const segment of segments) {
    const attributes = segment.length > 1 ? segment[1] : undefined;
    const type =
      attributes !== undefined && typeof attributes.type === "string"
        ? attributes.type
        : (TEXT_ATTRIBUTE_DEFAULTS.type as string);
    const info = $getEditor()._nodes.get(type);
    if (info === undefined) {
      throw new Error(
        `Node of type "${type}" is not registered. Please ensure that the node has been registered with the editor.`
      );
    }

    const node = new info.klass();
    if (!$isTextNode(node)) {
      throw new Error(`Node of type "${type}" is not a TextNode.`);
    }

    nodes.push(
      node
        .updateFromJSON(
          createSerializedTextNodeFromLiveTextSegment(segment[0], attributes)
        )
        .getLatest()
    );
  }
  return nodes;
}

export function find_liveblocksNode(
  node: LiveStorageNode,
  predicate: (node: LiveStorageNode) => boolean
): LiveStorageNode | null {
  if (predicate(node)) {
    return node;
  }

  const kind = node.get("kind");
  if (kind === "root" || kind === "element") {
    for (const child of (
      node as LiveObject<{
        kind: "root" | "element";
        children: LiveList<LiveChildNode>;
      }>
    ).get("children")) {
      const found = find_liveblocksNode(child, predicate);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Compares a coalesced LiveText node against one or more sibling Lexical TextNodes.
 *
 * Lexical stores each formatted span as its own TextNode; storage holds sibling spans
 * as segments inside a single LiveText. This function checks that segment strings and
 * attributes (readable marks, mode/detail/style, subclass `type`, and other
 * public exportJSON fields) match — not Lexical object identity.
 *
 * @example Returns `true` — two Lexical spans, one LiveText child
 *
 * Lexical (siblings under Paragraph):     Storage (one text child):
 *   TextNode "Hello " (bold)               text → LiveText segments:
 *   TextNode "world"                         ["Hello ", {bold}]
 *                                            ["world"]
 *
 * @example Returns `true` — empty text slot
 *
 * Lexical:                                 Storage:
 *   (no TextNodes)                          text → LiveText: []
 *
 * Both represent an empty text run.
 *
 * @example Returns `false` — same spans, different string
 *
 * Lexical:                                 Storage:
 *   TextNode "Hello " (bold)               text → [["Hello ", {bold}], ["world"]]
 *   TextNode "world!"                                              ↑ stale
 *
 * @example Returns `false` — same string, different format
 *
 * Lexical:                                 Storage:
 *   TextNode "Hello" (bold)                text → [["Hello"]]  (no attributes)
 *   TextNode "world"
 *
 * @example Returns `false` — segment count mismatch
 *
 * Lexical:                                 Storage:
 *   TextNode "Hello world"                 text → [["Hello ", {bold}], ["world"]]
 *   (single unformatted span)
 */
export function areTextNodesStructurallyEqual(
  text_liveblocks: LiveTextNode,
  text_lexical: readonly TextNode[]
): boolean {
  const nodes_lexical = text_lexical.map((node) => node.getLatest());
  const segments_liveblocks = text_liveblocks.get("content").toJSON();

  // Empty LiveText ↔ no TextNodes. A lone empty TextNode "" is not the empty
  // slot (createSegmentsFromTextNodes collapses it to []), so check this first.
  if (segments_liveblocks.length === 0) {
    return nodes_lexical.length === 0;
  }
  if (nodes_lexical.length === 0) {
    return false;
  }

  const segments_lexical = createSegmentsFromTextNodes(nodes_lexical);

  if (segments_liveblocks.length !== segments_lexical.length) {
    return false;
  }

  for (let i = 0; i < segments_lexical.length; i++) {
    if (segments_liveblocks[i][0] !== segments_lexical[i][0]) {
      return false;
    }

    const attrs_liveblocks =
      segments_liveblocks[i].length > 1
        ? (segments_liveblocks[i][1] as TextAttributes)
        : undefined;
    const attrs_lexical =
      segments_lexical[i].length > 1
        ? (segments_lexical[i][1] as TextAttributes)
        : undefined;

    if (attrs_liveblocks === attrs_lexical) {
      continue;
    }
    if (!isEqual(attrs_liveblocks, attrs_lexical)) {
      return false;
    }
  }

  return true;
}

function areElementNodesStructurallyEqual(
  element_liveblocks: LiveElementNode,
  element_lexical: ElementNode
): boolean {
  element_lexical = element_lexical.getLatest();
  if (element_liveblocks.get("type") !== element_lexical.getType()) {
    return false;
  }

  const props_lexical = $getLexicalNodeProps(element_lexical);
  const props_liveblocks = element_liveblocks.get("props");
  const props_liveblocks_json =
    props_liveblocks !== undefined ? props_liveblocks.toJSON() : undefined;
  if (
    !isEqual(props_lexical, props_liveblocks_json as JsonObject | undefined)
  ) {
    return false;
  }

  const children_lexical = $normalizeLexicalChildren(element_lexical);
  const children_liveblocks = element_liveblocks.get("children");

  // Empty LiveText occupies no Lexical slot, so walk storage and only advance
  // the Lexical cursor for children that have a Lexical span.
  let lexicalIndex = 0;
  for (let i = 0; i < children_liveblocks.length; i++) {
    const child_liveblocks = children_liveblocks.get(i);
    if (child_liveblocks === undefined) return false;

    const kind_liveblocks = child_liveblocks.get("kind");
    if (kind_liveblocks === "text") {
      const span = (child_liveblocks as LiveTextNode)
        .get("content")
        .toJSON().length;
      if (span === 0) {
        continue;
      }
      const child_lexical = children_lexical[lexicalIndex];
      if (!$isTextNodeList(child_lexical)) return false;
      if (
        !areTextNodesStructurallyEqual(
          child_liveblocks as LiveTextNode,
          child_lexical
        )
      ) {
        return false;
      }
      lexicalIndex++;
      continue;
    }

    const child_lexical = children_lexical[lexicalIndex];
    if (child_lexical === undefined || child_lexical instanceof Array) {
      return false;
    }

    if ($isElementNode(child_lexical)) {
      if (kind_liveblocks !== "element") return false;
      if (
        !areElementNodesStructurallyEqual(
          child_liveblocks as LiveElementNode,
          child_lexical
        )
      ) {
        return false;
      }
      lexicalIndex++;
      continue;
    }

    if ($isLineBreakNode(child_lexical)) {
      if (kind_liveblocks !== "linebreak") return false;
      lexicalIndex++;
      continue;
    }

    if ($isDecoratorNode(child_lexical)) {
      if (kind_liveblocks !== "decorator") return false;
      if (
        !areDecoratorNodesStructurallyEqual(
          child_liveblocks as LiveDecoratorNode,
          child_lexical
        )
      ) {
        return false;
      }
      lexicalIndex++;
      continue;
    }

    return false;
  }

  return lexicalIndex === children_lexical.length;
}

function areDecoratorNodesStructurallyEqual(
  decorator_liveblocks: LiveDecoratorNode,
  decorator_lexical: DecoratorNode<unknown>
): boolean {
  decorator_lexical = decorator_lexical.getLatest();
  if (decorator_liveblocks.get("type") !== decorator_lexical.getType()) {
    return false;
  }

  const props_lexical = $getLexicalNodeProps(decorator_lexical);
  const props_liveblocks = decorator_liveblocks.get("props");
  const props_liveblocks_json =
    props_liveblocks !== undefined ? props_liveblocks.toJSON() : undefined;
  return isEqual(
    props_lexical,
    props_liveblocks_json as JsonObject | undefined
  );
}

function getSegmentsInRange(
  segments: Array<[text: string] | [text: string, attributes: TextAttributes]>,
  options: { rangeStart: number; rangeEnd: number }
): Array<[text: string] | [text: string, attributes: TextAttributes]> {
  const { rangeStart, rangeEnd } = options;
  if (rangeEnd <= rangeStart) {
    return [];
  }

  const slice: Array<
    [text: string] | [text: string, attributes: TextAttributes]
  > = [];
  let offset = 0;

  for (const segment of segments) {
    const text = segment[0];
    const segmentStart = offset;
    const segmentEnd = offset + text.length;

    if (segmentEnd > rangeStart && segmentStart < rangeEnd) {
      const sliceStart = Math.max(rangeStart, segmentStart) - segmentStart;
      const sliceEnd = Math.min(rangeEnd, segmentEnd) - segmentStart;
      const sliceText = text.slice(sliceStart, sliceEnd);

      if (sliceText.length > 0) {
        if (segment.length > 1) {
          slice.push([sliceText, segment[1]!]);
        } else {
          slice.push([sliceText]);
        }
      }
    }

    offset = segmentEnd;
  }

  return slice;
}

function getSegmentAttributesAtOffset(
  segments: Array<[string] | [string, TextAttributes]>,
  offset: number
): TextAttributes | undefined {
  let position = 0;
  for (const segment of segments) {
    const length = segment[0].length;
    if (offset >= position && offset <= position + length) {
      if (segment.length > 1) {
        return segment[1] as TextAttributes;
      }
      return undefined;
    }
    position += length;
  }
  return undefined;
}

/**
 * Defaults for TextNode exportJSON fields that we omit from LiveText when at
 * their Lexical defaults (same shaping as `createSegmentsFromTextNodes`).
 * Mark flags (`bold`, …) are absent-when-false, not listed here.
 */
const TEXT_ATTRIBUTE_DEFAULTS: Readonly<Record<string, Json>> = {
  type: "text",
  mode: "normal",
  detail: 0,
  style: "",
};

/**
 * Build a `updateFromJSON` payload for one LiveText segment.
 */
function createSerializedTextNodeFromLiveTextSegment(
  text: string,
  attributes: TextAttributes | undefined
): LexicalUpdateJSON<SerializedTextNode> {
  const payload: Record<string, unknown> = {
    type: TEXT_ATTRIBUTE_DEFAULTS.type,
    mode: TEXT_ATTRIBUTE_DEFAULTS.mode,
    detail: TEXT_ATTRIBUTE_DEFAULTS.detail,
    style: TEXT_ATTRIBUTE_DEFAULTS.style,
    text,
    format: 0,
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
      payload[key] = value;
    }
  }
  payload.format = format;

  return payload as LexicalUpdateJSON<SerializedTextNode>;
}

/**
 * Build a LiveText `format()` patch that turns `current` segment attrs into
 * `target` (from `createSegmentsFromTextNodes` / exportJSON shaping).
 */
function createLiveTextAttributesPatch(
  target: TextAttributes,
  slice: ReadonlyArray<[string] | [string, TextAttributes]>
): JsonObject {
  const patch: JsonObject = {};

  for (const key of Object.keys(TEXT_TYPE_TO_FORMAT)) {
    const wanted = target[key] === true;
    const uniform =
      slice.length > 0 &&
      slice.every((part) => {
        const attrs = part.length > 1 ? part[1]! : {};
        return attrs[key] === true;
      });
    const present = slice.some((part) => {
      const attrs = part.length > 1 ? part[1]! : {};
      return attrs[key] === true;
    });

    if (wanted ? !uniform : present) {
      patch[key] = wanted ? true : null;
    }
  }

  const keys = new Set<string>(Object.keys(target));
  for (const part of slice) {
    if (part.length > 1) {
      for (const key of Object.keys(part[1]!)) {
        keys.add(key);
      }
    }
  }

  for (const key of keys) {
    if (key in TEXT_TYPE_TO_FORMAT) {
      continue;
    }

    const defaultValue = TEXT_ATTRIBUTE_DEFAULTS[key];
    const wantedRaw = target[key];

    if (defaultValue !== undefined) {
      const wanted = wantedRaw ?? defaultValue;
      const values = slice.map((part) => {
        const attrs = part.length > 1 ? part[1]! : {};
        return (attrs[key] ?? defaultValue) as Json;
      });
      const uniform =
        slice.length > 0 && values.every((value) => value === values[0]);

      if (wanted === defaultValue) {
        if (values.some((value) => value !== defaultValue)) {
          patch[key] = null;
        }
      } else if (!uniform || values[0] !== wanted) {
        patch[key] = wantedRaw as Json;
      }
      continue;
    }

    const values = slice.map((part) => {
      const attrs = part.length > 1 ? part[1]! : {};
      return attrs[key];
    });
    const present = values.some((value) => value !== undefined);
    const uniform =
      slice.length > 0 && values.every((value) => value === values[0]);

    if (wantedRaw === undefined) {
      if (present) {
        patch[key] = null;
      }
    } else if (!uniform || values[0] !== wantedRaw) {
      patch[key] = wantedRaw;
    }
  }

  return patch;
}

function createSegmentsFromTextNodes(
  nodes: readonly TextNode[]
): Array<[string] | [string, TextAttributes]> {
  let segments: Array<[string] | [string, TextAttributes]> = nodes.map(
    (node) => {
      // Single source of truth: each TextNode's public JSON contract. We only
      // reshape for LiveText (readable marks, omit defaults) — no parallel
      // reads from getFormat() / getMode() / etc.
      const json = node.exportJSON() as Record<string, unknown>;
      const text =
        typeof json.text === "string" ? json.text : node.getTextContent();
      const attributes: TextAttributes = {};

      for (const [key, value] of Object.entries(json)) {
        if (key === "text" || key === "version" || key === NODE_STATE_KEY) {
          continue;
        }
        if (value === undefined || value === null) {
          continue;
        }

        if (key === "format") {
          const format = typeof value === "number" ? value : 0;
          if (format === 0) {
            continue;
          }
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

      if (Object.keys(attributes).length === 0) {
        return [text] as const;
      }
      return [text, attributes] as const;
    }
  );

  if (
    segments.length === 1 &&
    segments[0][0] === "" &&
    segments[0].length === 1
  ) {
    segments = [];
  }

  return segments;
}

const OMIT_FROM_LEXICAL_NODE_PROPS = new Set([
  "type",
  "version",
  "children",
  "direction",
  "format",
  "indent",
  "textFormat",
  "textStyle",
]);

/**
 * Read Lexical element/decorator state that maps to storage `props`, using each
 * node's `exportJSON()` contract rather than enumerating internal instance fields.
 */
export function $getLexicalNodeProps(
  node: LexicalNode
): JsonObject | undefined {
  const latest = node.getLatest();
  if (!$isElementNode(latest) && !$isDecoratorNode(latest)) {
    return undefined;
  }

  const json = latest.exportJSON() as Record<string, unknown>;
  const props: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(json)) {
    if (OMIT_FROM_LEXICAL_NODE_PROPS.has(key)) {
      continue;
    }
    if (key === NODE_STATE_KEY) {
      if (value !== undefined && value !== null && typeof value === "object") {
        for (const [stateKey, stateValue] of Object.entries(
          value as Record<string, unknown>
        )) {
          props[stateKey] = stateValue;
        }
      }
      continue;
    }
    props[key] = value;
  }

  return Object.keys(props).length > 0 ? (props as JsonObject) : undefined;
}

/**
 * Apply storage `props` onto a Lexical element or decorator — inverse of
 * `$getLexicalNodeProps`.
 *
 * Uses each node's `updateFromJSON()` so custom node fields are applied the
 * same way Lexical does for copy/paste and persistence. When `props` is
 * `undefined`, synced fields are reset from a fresh instance of the node type.
 *
 * Layout fields (`direction`, `format`, `indent`, …) are preserved from the
 * current node; they are omitted from storage props by `$getLexicalNodeProps`.
 */
export function $setLexicalNodeProps(
  node: LexicalNode,
  props: JsonObject | undefined
): void {
  const latest = node.getLatest();
  if (!$isElementNode(latest) && !$isDecoratorNode(latest)) {
    return;
  }

  const exported = latest.exportJSON() as Record<string, unknown>;
  let effectiveProps = props;

  const nodeFieldKeys = new Set<string>();
  const typeInfo = $getEditor()._nodes.get(latest.getType());
  if (typeInfo !== undefined) {
    const freshInstance = new typeInfo.klass();
    if ($isElementNode(freshInstance) || $isDecoratorNode(freshInstance)) {
      const freshExported = freshInstance.exportJSON() as Record<
        string,
        unknown
      >;
      for (const key of Object.keys(freshExported)) {
        if (!OMIT_FROM_LEXICAL_NODE_PROPS.has(key) && key !== NODE_STATE_KEY) {
          nodeFieldKeys.add(key);
        }
      }
    }
  }

  if (effectiveProps === undefined) {
    if (typeInfo !== undefined) {
      const instance = new typeInfo.klass();
      if ($isElementNode(instance) || $isDecoratorNode(instance)) {
        effectiveProps = $getLexicalNodeProps(instance);
      }
    }
  }

  const payload: Record<string, unknown> = {};

  // Keep element layout fields out of storage props from being reset by a partial update.
  for (const key of OMIT_FROM_LEXICAL_NODE_PROPS) {
    if (key in exported) {
      payload[key] = exported[key];
    }
  }

  if (effectiveProps === undefined) {
    if (Object.keys(payload).length > 0) {
      latest
        .getWritable()
        .updateFromJSON(payload as LexicalUpdateJSON<SerializedElementNode>);
    }
    return;
  }

  // Preserve declared node fields from the current node so a partial props update
  // (including `{}`) does not reset unspecified fields — HeadingNode.updateFromJSON
  // calls setTag(serializedNode.tag) and would clear the tag when it is omitted.
  for (const key of nodeFieldKeys) {
    if (key in exported) {
      payload[key] = exported[key];
    }
  }

  const statePayload: Record<string, unknown> = {};
  const exportedState = exported[NODE_STATE_KEY];
  if (exportedState !== undefined && typeof exportedState === "object") {
    Object.assign(statePayload, exportedState as Record<string, unknown>);
  }

  for (const [key, value] of Object.entries(effectiveProps)) {
    if (nodeFieldKeys.has(key)) {
      payload[key] = value;
    } else {
      statePayload[key] = value;
    }
  }

  if (Object.keys(statePayload).length > 0) {
    payload[NODE_STATE_KEY] = statePayload;
  }

  latest
    .getWritable()
    .updateFromJSON(payload as LexicalUpdateJSON<SerializedElementNode>);
}
