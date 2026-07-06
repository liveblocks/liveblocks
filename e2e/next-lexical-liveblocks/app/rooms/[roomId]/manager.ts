"use client";

import {
  LiveList,
  LiveObject,
  LiveText,
  StorageUpdate,
} from "@liveblocks/client";
import {
  ElementNode,
  LexicalNode,
  NodeKey,
  Point,
  TextNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $getNodeByKey,
  $isRootNode,
  $getRoot,
  TEXT_TYPE_TO_FORMAT,
  $getEditor,
  $createLineBreakNode,
  $isLineBreakNode,
  NODE_STATE_KEY,
  type LexicalUpdateJSON,
  type SerializedElementNode,
} from "lexical";
import type {
  LiveLexicalPoint,
  LiveLexicalSelection,
  LiveRootNode,
  LiveElementNode,
  LiveTextNode,
  LiveChildNode,
  LiveStorageNode,
  LiveRootShape,
  LiveElementShape,
  LiveLineBreakNode,
} from "../../../liveblocks.config";
import {
  JsonObject,
  kInternal,
  kStorageUpdateSource,
  TextAttributes,
  type PrivateLiveNodeApi,
} from "@liveblocks/core";

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
    forward: WeakMap<LiveStorageNode, LexicalNode | readonly TextNode[]>;
    /** Lexical NodeKey → source storage node. */
    reverse: Map<NodeKey, LiveStorageNode>;
  };
  private root: LiveRootNode;
  constructor(root: LiveRootNode) {
    this.root = root;
    this.#binding = {
      forward: new WeakMap(),
      reverse: new Map(),
    };
  }

  get binding(): Readonly<{
    forward: Readonly<
      WeakMap<LiveStorageNode, LexicalNode | readonly TextNode[]>
    >;
    reverse: ReadonlyMap<NodeKey, LiveStorageNode>;
  }> {
    return this.#binding;
  }

  public $updateBinding(): void {
    const forward = new WeakMap<
      LiveStorageNode,
      LexicalNode | readonly TextNode[]
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
      this.createBinding(
        child as LiveElementNode,
        root.getChildren()[index] as ElementNode
      );
      index++;
    }
  }

  /**
   * Encode a Lexical selection endpoint as a storage-relative presence point.
   */
  public $encodePoint(point: Point): LiveLexicalPoint | null {
    const node_liveblocks = this.#binding.reverse.get(point.key);
    if (node_liveblocks === undefined) {
      return null;
    }

    if (point.type === "text") {
      return $encodeTextPoint(point, node_liveblocks);
    }

    if (point.type === "element") {
      return $encodeElementPoint(point, node_liveblocks);
    }

    return null;
  }

  /**
   * Encode the current range selection for Liveblocks presence.
   * Returns `null` when there is no range selection or either endpoint cannot be encoded.
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
   * Decode a storage-relative presence point into Lexical coordinates.
   * Must be called inside `editor.read()` or `editor.update()` while binding is populated.
   *
   * Returns `null` when the storage node is missing, unbound, or the point cannot
   * be decoded yet (e.g. peer ahead on LiveText version).
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

  public $decodeTextPoint(
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

    const coalesced = this.#binding.forward.get(node_liveblocks);
    if (coalesced === undefined || !(coalesced instanceof Array)) {
      return null;
    }
    if (coalesced.length === 0) {
      return null;
    }

    let remaining = flatOffset;
    for (const textNode of coalesced) {
      const size = textNode.getTextContentSize();
      if (remaining <= size) {
        return {
          key: textNode.getKey(),
          offset: remaining,
          type: "text",
        };
      }
      remaining -= size;
    }

    const last = coalesced[coalesced.length - 1]!;
    return {
      key: last.getKey(),
      offset: last.getTextContentSize(),
      type: "text",
    };
  }

  public $decodeElementPoint(
    point: LiveLexicalPoint,
    node_liveblocks: LiveStorageNode
  ): DecodedLexicalPoint | null {
    const mapped = this.#binding.forward.get(node_liveblocks);
    if (mapped === undefined || mapped instanceof Array) {
      return null;
    }
    if (!$isElementNode(mapped)) {
      return null;
    }

    return {
      key: mapped.getKey(),
      offset: convertStorageOffsetToLexicalChildIndex(
        mapped.getLatest(),
        point.offset
      ),
      type: "element",
    };
  }

  /**
   * Decode a storage-relative presence selection into Lexical coordinates.
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

  public $applyLocalUpdates(changeset: {
    dirtyElements: ReadonlySet<NodeKey>;
    dirtyLeaves: ReadonlySet<NodeKey>;
    normalizedNodes: ReadonlySet<NodeKey>;
  }) {
    const { dirtyElements, dirtyLeaves, normalizedNodes } = changeset;
    const dirtyNodes = new Set([...dirtyElements, ...dirtyLeaves]);

    // Collect all host (root or eleemnt node) whose children LiveList is the sync target. These are LiveList containers that might have changed children or text.
    const hosts = new Set<LiveObject<LiveRootShape | LiveElementShape>>();
    for (const key of new Set([...dirtyNodes, ...normalizedNodes])) {
      const node_liveblocks = this.#binding.reverse.get(key);

      // Branch A: If the key is not bound to any storage node (i.e. new lexical node), we walk up the Lexical tree until we hit the root node or a bound parent element/root.
      if (node_liveblocks === undefined) {
        const node_lexical = $getNodeByKey(key);
        if (node_lexical === null) continue;

        const parent_liveblocks = this.findParent_liveblocks(node_lexical);
        if (parent_liveblocks === null) continue;

        hosts.add(parent_liveblocks);
      }
      // Branch B: If the node associated with the key is normalized (it was removed/merged), the node still has a binding (it existed before normalization), but it is going away.
      // We add its storage parent so deletions/replacements can be applied to it.
      else if (normalizedNodes.has(key)) {
        let host: LiveObject<LiveRootShape | LiveElementShape> | null =
          this.findParent_liveblocks(node_liveblocks as LiveChildNode);
        if (host === null) continue;

        while (host.get("kind") !== "root") {
          const node_lexical = this.#binding.forward.get(host);
          if (
            node_lexical !== undefined &&
            !this.isOrphan(node_lexical, normalizedNodes)
          ) {
            break;
          }
          const parent: LiveObject<LiveRootShape | LiveElementShape> | null =
            this.findParent_liveblocks(host as LiveChildNode);
          if (parent === null) break;
          host = parent;
        }
        hosts.add(host);
      }
      // Branch C: If the node is a bound element, we add it if it is attached, otherwise we add its parent.
      else if (node_liveblocks.get("kind") === "element") {
        const node_lexical = this.#binding.forward.get(node_liveblocks);

        if (
          node_lexical !== undefined &&
          !this.isOrphan(node_lexical, normalizedNodes)
        ) {
          hosts.add(
            node_liveblocks as LiveObject<LiveRootShape | LiveElementShape>
          );
        } else {
          const parent = this.findParent_liveblocks(
            node_liveblocks as LiveChildNode
          );
          if (parent !== null) {
            hosts.add(parent);
          }
        }
      }
      // Branch D: Skip root node since Lexical marks root dirty on every edit (ancestor bubbling). Syncing the root on every keystroke is wasteful.
      else if (node_liveblocks.get("kind") === "root") {
        continue;
      }
      // Branch E: If the node is a bound leaf node (text/linebreak), we add its storage parent so deletions/replacements can be applied to it.
      else {
        let host: LiveObject<LiveRootShape | LiveElementShape> | null =
          this.findParent_liveblocks(node_liveblocks as LiveChildNode);
        if (host === null) continue;

        while (host.get("kind") !== "root") {
          const node_lexical = this.#binding.forward.get(host);
          if (
            node_lexical !== undefined &&
            !(node_lexical instanceof Array) &&
            !this.isOrphan(node_lexical, normalizedNodes)
          ) {
            break;
          }
          const parent: LiveObject<LiveRootShape | LiveElementShape> | null =
            this.findParent_liveblocks(host as LiveChildNode);
          if (parent === null) break;
          host = parent;
        }
        hosts.add(host);
      }
    }

    // Branch D skips the document root, but we need to catch multi-block root-level structure when ≥ 2 bound, direct root children are dirty/normalized.
    if (!hosts.has(this.root)) {
      const numOfDirectDirtyChildren = [
        ...dirtyElements,
        ...dirtyLeaves,
        ...normalizedNodes,
      ].reduce((count, key) => {
        const node_lexical = $getNodeByKey(key);
        if (
          node_lexical !== null &&
          node_lexical.getParent()?.getType() === "root"
        ) {
          const node_liveblocks = this.#binding.reverse.get(key);
          if (
            node_liveblocks !== undefined &&
            this.root
              .get("children")
              .indexOf(node_liveblocks as LiveElementNode) !== -1
          ) {
            return count + 1;
          }
        }
        return count;
      }, 0);
      if (numOfDirectDirtyChildren >= 2) {
        hosts.add(this.root);
      }
    }

    for (const key of dirtyElements) {
      const node_liveblocks = this.#binding.reverse.get(key) as
        | LiveObject<LiveElementShape>
        | undefined;
      if (node_liveblocks === undefined) {
        continue;
      }

      const node_lexical = $getNodeByKey(key);
      if (node_lexical === null || !$isElementNode(node_lexical)) {
        continue;
      }

      const props_lexical = $getLexicalNodeProps(node_lexical);
      const props_liveblocks = node_liveblocks.get("props");

      if (isEqual(props_lexical, props_liveblocks)) {
        continue;
      }

      if (props_lexical === undefined) {
        node_liveblocks.delete("props");
      } else {
        node_liveblocks.set("props", props_lexical);
      }
    }

    for (const host_liveblocks of hosts) {
      this.$reconcileLiveObject(host_liveblocks, {
        dirtyNodes,
        normalizedNodes,
      });
    }

    // Unbind Lexical nodes that have been normalized (deleted or replaced by Lexical).
    // This removes their mapping from both #binding.reverse (Lexical key → Liveblocks node)
    // and #binding.forward (Liveblocks node → Lexical node.
    for (const key of normalizedNodes) {
      const node_liveblocks = this.#binding.reverse.get(key);
      if (node_liveblocks === undefined) {
        continue;
      }

      this.#binding.reverse.delete(key);
      const node_lexical = this.#binding.forward.get(node_liveblocks);

      if (node_lexical instanceof Array) {
        this.#binding.forward.delete(node_liveblocks);
        continue;
      }

      if (node_lexical?.getKey() === key) {
        this.#binding.forward.delete(node_liveblocks);
      }
    }
  }

  private $reconcileLiveObject(
    node: LiveObject<LiveElementShape | LiveRootShape>,
    props: {
      dirtyNodes: ReadonlySet<NodeKey>;
      normalizedNodes: ReadonlySet<NodeKey>;
    }
  ): void {
    const { dirtyNodes, normalizedNodes } = props;

    const host_liveblocks = node;
    const host_lexical = this.$getLexicalElementForStorageHost(host_liveblocks);
    const children_lexical = this.$normalizeLexicalChildren(host_lexical);

    if (host_liveblocks !== this.root) {
      const props_lexical = $getLexicalNodeProps(host_lexical);
      const props_liveblocks = (
        host_liveblocks as LiveObject<LiveElementShape>
      ).get("props");
      if (!isEqual(props_lexical, props_liveblocks)) {
        if (props_lexical === undefined) {
          (host_liveblocks as LiveObject<LiveElementShape>).delete("props");
        } else {
          (host_liveblocks as LiveObject<LiveElementShape>).set(
            "props",
            props_lexical
          );
        }
      }
    }

    const children_liveblocks = host_liveblocks.get(
      "children"
    ) as LiveList<LiveChildNode>;

    // 1. Deletions and element/linebreak replacement + text node rebind
    for (let i = children_liveblocks.length - 1; i >= 0; i--) {
      const child_liveblocks = children_liveblocks.get(i);
      if (child_liveblocks === undefined) continue;

      const child_lexical = this.#binding.forward.get(
        child_liveblocks as LiveStorageNode
      );
      if (child_lexical === undefined) continue;

      // 1. If the child is not orphaned, we do not want to delete it from the storage host.
      if (!this.isOrphan(child_lexical, normalizedNodes)) {
        continue;
      }

      const kind = child_liveblocks.get("kind");

      const occupant = children_lexical[i];

      // If the child is orphaned but a new occupant exists in the same slot and is the same type as the
      // child and is not bound (meaning a new node was created and is not yet wired to any storage node),
      // we do not want to delete the current child from the storage host. Instead, we want to rebind the
      // child to the new occupant, but keep the same storage objects in the list.
      if (occupant !== undefined) {
        let isSameType: boolean = false;
        if (!(occupant instanceof Array)) {
          if (kind === "element" && $isElementNode(occupant)) {
            isSameType = true;
          } else if (kind === "linebreak" && $isLineBreakNode(occupant)) {
            isSameType = true;
          } else if (kind === "text" && occupant instanceof Array) {
            isSameType = true;
          } else {
            isSameType = false;
          }
        } else {
          if (kind === "text" && occupant instanceof Array) {
            isSameType = true;
          } else {
            isSameType = false;
          }
        }

        if (isSameType && !this.hasBinding(children_lexical[i])) {
          if (child_lexical instanceof Array) {
            for (const node of child_lexical) {
              if (
                this.#binding.reverse.get(node.getKey()) === child_liveblocks
              ) {
                this.#binding.reverse.delete(node.getKey());
              }
            }
          } else {
            if (
              this.#binding.reverse.get(child_lexical.getKey()) ===
              child_liveblocks
            ) {
              this.#binding.reverse.delete(child_lexical.getKey());
            }
          }

          this.#binding.forward.set(child_liveblocks, occupant);
          if (occupant instanceof Array) {
            for (const node of occupant) {
              this.#binding.reverse.set(node.getKey(), child_liveblocks);
            }
          } else {
            this.#binding.reverse.set(occupant.getKey(), child_liveblocks);
          }
          continue;
        }
      }

      // Skip deletion of a text node if it is the only child in the list and is empty.
      if (
        child_lexical instanceof Array &&
        child_lexical.length === 0 &&
        children_liveblocks.length === 1
      ) {
        continue;
      }

      this.removeBindings(child_liveblocks);
      children_liveblocks.delete(i);
    }

    // 2. Updates (bound nodes only)
    for (const child_lexical of children_lexical) {
      if (!this.hasBinding(child_lexical)) continue;

      // Get the bound storage node for the Lexical nodes.
      let child_liveblocks: LiveChildNode | undefined;
      if (child_lexical instanceof Array) {
        child_liveblocks = this.#binding.reverse.get(
          child_lexical[0].getKey()
        ) as LiveTextNode | undefined;
      } else {
        child_liveblocks = this.#binding.reverse.get(child_lexical.getKey()) as
          | LiveChildNode
          | undefined;
      }

      if (child_liveblocks === undefined) continue;

      if (child_lexical instanceof Array) {
        const nodes = child_lexical.filter(
          (node) => !normalizedNodes.has(node.getKey())
        );
        if (nodes.length === 0) continue;

        // If none of the relevant Lexical text nodes are dirty and if the corresponding
        // LiveText node is already in sync with them, we just bind (wire) them together
        // without making any incremental updates. This avoids unnecessary re-sync when
        // nothing has changed.
        if (
          !nodes.some((node) => dirtyNodes.has(node.getKey())) &&
          areTextNodesEqual(child_liveblocks as LiveTextNode, nodes)
        ) {
          this.createBinding(child_liveblocks as LiveTextNode, nodes);
        } else {
          this.updateLiveTextFromLexicalNodes(
            child_liveblocks as LiveTextNode,
            nodes
          );
        }
        continue;
      } else {
        if ($isLineBreakNode(child_lexical)) {
          this.#binding.forward.set(child_liveblocks, child_lexical);
          this.#binding.reverse.set(child_lexical.getKey(), child_liveblocks);
        } else if ($isElementNode(child_lexical)) {
          if (dirtyNodes.has(child_lexical.getKey())) {
            this.$reconcileLiveObject(child_liveblocks as LiveElementNode, {
              dirtyNodes,
              normalizedNodes,
            });
          }
          this.#binding.forward.set(child_liveblocks, child_lexical);
          this.#binding.reverse.set(child_lexical.getKey(), child_liveblocks);
          continue;
        }
      }
    }

    // 3. Insertions (unbound normalized Lexical nodes)
    for (let i = 0; i < children_lexical.length; i++) {
      const child_lexical = children_lexical[i];
      if (this.hasBinding(child_lexical)) continue;

      const child_liveblocks = createStorageNodeFromLexicalNode(child_lexical);
      children_liveblocks.insert(child_liveblocks, i);

      if (child_lexical instanceof Array) {
        this.createBinding(child_liveblocks as LiveTextNode, child_lexical);
      } else if ($isElementNode(child_lexical)) {
        this.createBinding(child_liveblocks as LiveElementNode, child_lexical);
      } else {
        this.#binding.forward.set(child_liveblocks, child_lexical);
        this.#binding.reverse.set(child_lexical.getKey(), child_liveblocks);
      }
    }

    // 4. Moves (reorder bound storage children to match Lexical order)
    for (let i = 0; i < children_lexical.length; i++) {
      const child_lexical = children_lexical[i];

      // Get the bound storage node for the Lexical nodes.
      let child_liveblocks: LiveChildNode | undefined;
      if (child_lexical instanceof Array) {
        child_liveblocks = this.#binding.reverse.get(
          child_lexical[0].getKey()
        ) as LiveTextNode | undefined;
      } else {
        child_liveblocks = this.#binding.reverse.get(child_lexical.getKey()) as
          | LiveChildNode
          | undefined;
      }
      if (child_liveblocks === undefined) continue;
      const currentIndex = children_liveblocks.indexOf(
        child_liveblocks as LiveChildNode
      );
      if (currentIndex === -1 || currentIndex === i) continue;
      children_liveblocks.move(currentIndex, i);
    }

    // 5. Prune trailing storage children Lexical no longer has slots for
    while (children_liveblocks.length > children_lexical.length) {
      let removed = false;

      for (
        let i = children_liveblocks.length - 1;
        i >= children_lexical.length;
        i--
      ) {
        const child_liveblocks = children_liveblocks.get(i);
        if (child_liveblocks === undefined) continue;

        const child_lexical = this.#binding.forward.get(
          child_liveblocks as LiveStorageNode
        );
        if (
          child_lexical !== undefined &&
          !this.isOrphan(child_lexical, normalizedNodes)
        ) {
          continue;
        }

        this.removeBindings(child_liveblocks);
        children_liveblocks.delete(i);
        removed = true;
      }

      if (!removed) break;
    }

    this.$synchronizeChildrenProps(host_lexical);
  }

  public $applyRemoteUpdates(updates: readonly StorageUpdate[]) {
    updates = updates.filter(
      (update) => update[kStorageUpdateSource]?.origin === "remote"
    );

    // List insert/set materializes the full `item` subtree from storage (see
    // $convertLiveElementNodeToLexicalNode + createBinding). Skip descendant
    // LiveText/LiveList/LiveObject updates in the same batch — not for move.
    const visitedNodes = new Set<unknown>();

    function visitNode(node: LiveStorageNode): void {
      visitedNodes.add(node);

      const kind = node.get("kind");
      if (kind === "text") {
        visitedNodes.add((node as LiveTextNode).get("content"));
        return;
      }

      if (kind === "linebreak") {
        return;
      }

      const children = (
        node as LiveObject<{
          kind: "root" | "element";
          children: LiveList<LiveChildNode>;
        }>
      ).get("children");
      visitedNodes.add(children);
      for (const child of children) {
        visitNode(child);
      }
    }

    for (const update of updates) {
      if (update.type !== "LiveList") {
        continue;
      }

      for (const change of update.updates) {
        if (change.type !== "insert" && change.type !== "set") {
          continue;
        }
        if (!(change.item instanceof LiveObject)) {
          continue;
        }

        visitNode(change.item as LiveStorageNode);
      }
    }

    for (const update of updates) {
      if (visitedNodes.has(update.node)) {
        continue;
      }

      if (update.type === "LiveText") {
        if (update.updates.length === 0) continue;

        const node_liveblocks = find_liveblocksNode(
          this.root,
          (node) =>
            node.get("kind") === "text" &&
            (node as LiveTextNode).get("content") === update.node
        ) as LiveTextNode | null;
        if (node_liveblocks === null) continue;

        const bound = this.#binding.forward.get(node_liveblocks);
        if (bound === undefined || !(bound instanceof Array)) {
          continue;
        }

        let nodes_lexical = bound.map((node) => node.getLatest());
        if (
          nodes_lexical.length === 0 ||
          nodes_lexical.some((node) => !node.isAttached())
        ) {
          continue;
        }

        if (areTextNodesEqual(node_liveblocks, nodes_lexical)) {
          continue;
        }

        for (const change of update.updates) {
          if (change.type === "insert") {
            const location = getTextNodeAndOffsetAtCharacterIndex(
              nodes_lexical,
              change.index
            );
            if (location === null) {
              continue;
            }

            const node = location.node;
            const content = node.getTextContent();
            node.setTextContent(
              content.slice(0, location.offset) +
                change.text +
                content.slice(location.offset)
            );

            if (
              change.attributes !== undefined &&
              Object.keys(change.attributes).length > 0
            ) {
              let format = 0;
              for (const [key, value] of Object.entries(change.attributes)) {
                if (value && key in TEXT_TYPE_TO_FORMAT) {
                  format |=
                    TEXT_TYPE_TO_FORMAT[
                      key as keyof typeof TEXT_TYPE_TO_FORMAT
                    ];
                }
              }
              if (node.getFormat() !== format) {
                node.setFormat(format);
              }
            }
          } else if (change.type === "delete") {
            const start = getTextNodeAndOffsetAtCharacterIndex(
              nodes_lexical,
              change.index
            );
            const end = getTextNodeAndOffsetAtCharacterIndex(
              nodes_lexical,
              change.index + change.length
            );
            if (start === null || end === null) {
              continue;
            }

            if (start.node === end.node) {
              const content = start.node.getTextContent();
              start.node.setTextContent(
                content.slice(0, start.offset) + content.slice(end.offset)
              );
            } else {
              const startContent = start.node.getTextContent();
              start.node.setTextContent(startContent.slice(0, start.offset));

              for (let i = start.index + 1; i < end.index; i++) {
                nodes_lexical[i].setTextContent("");
              }

              const endContent = end.node.getTextContent();
              end.node.setTextContent(endContent.slice(end.offset));
            }
          } else if (change.type === "format") {
            // Segment reconcile reads full storage state below.
          }

          nodes_lexical = (
            this.#binding.forward.get(node_liveblocks) as readonly TextNode[]
          ).map((node) => node.getLatest());

          if (areTextNodesEqual(node_liveblocks, nodes_lexical)) {
            continue;
          }

          const segments = node_liveblocks.get("content").toJSON();
          const numOfSegments_target =
            segments.length === 0 ? 1 : segments.length;

          if (nodes_lexical.length !== numOfSegments_target) {
            // Segment count changed — rebuild all spans from storage.
            const parent = nodes_lexical[0]?.getParent();
            if (parent === null || !$isElementNode(parent)) {
              continue;
            }

            let insertAt = parent.getChildrenSize();
            for (let i = parent.getChildrenSize() - 1; i >= 0; i--) {
              const child = parent.getChildAtIndex(i);
              if (!$isTextNode(child)) {
                continue;
              }
              if (
                this.#binding.reverse.get(child.getKey()) === node_liveblocks
              ) {
                insertAt = i;
                child.remove();
              }
            }

            const nextNodes =
              $convertLiveTextNodeToLexicalNode(node_liveblocks);
            parent.splice(insertAt, 0, nextNodes);
            this.createBinding(node_liveblocks, nextNodes);
            nodes_lexical = nextNodes.map((node) => node.getLatest());
            continue;
          }
          // Same span count — patch each nodes_lexical[i] from segments[i].
          else if (segments.length === 0) {
            if (nodes_lexical[0].getTextContent() !== "") {
              nodes_lexical[0].setTextContent("");
            }
            if (nodes_lexical[0].getFormat() !== 0) {
              nodes_lexical[0].setFormat(0);
            }
          } else {
            for (let i = 0; i < segments.length; i++) {
              const segment = segments[i];
              const node = nodes_lexical[i];
              if (node.getTextContent() !== segment[0]) {
                node.setTextContent(segment[0]);
              }

              let format = 0;
              if (segment.length > 1) {
                for (const [key, value] of Object.entries(segment[1]!)) {
                  if (value && key in TEXT_TYPE_TO_FORMAT) {
                    format |=
                      TEXT_TYPE_TO_FORMAT[
                        key as keyof typeof TEXT_TYPE_TO_FORMAT
                      ];
                  }
                }
              }
              if (node.getFormat() !== format) {
                node.setFormat(format);
              }
            }
          }

          this.createBinding(
            node_liveblocks,
            nodes_lexical.map((node) => node.getLatest())
          );
        }
      } else if (update.type === "LiveList") {
        if (update.updates.length === 0) {
          continue;
        }

        const host_liveblocks = find_liveblocksNode(this.root, (node) => {
          if (node.get("kind") !== "root" && node.get("kind") !== "element") {
            return false;
          }
          return (
            (node as LiveObject<LiveRootShape | LiveElementShape>).get(
              "children"
            ) === update.node
          );
        }) as LiveObject<LiveRootShape | LiveElementShape> | null;

        if (host_liveblocks === null) {
          continue;
        }

        let _host_lexical = this.#binding.forward.get(
          host_liveblocks.get("kind") === "root" ? this.root : host_liveblocks
        );
        if (
          _host_lexical === undefined ||
          _host_lexical instanceof Array ||
          !$isElementNode(_host_lexical)
        ) {
          continue;
        }
        const host_lexical: ElementNode = _host_lexical.getLatest();

        for (const change of update.updates) {
          if (change.type === "insert") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }
            const child = change.item as LiveChildNode;
            if (this.#binding.forward.get(child) !== undefined) {
              continue;
            }

            if (
              update.node.get(change.index) === child &&
              change.index >=
                this.$normalizeLexicalChildren(host_lexical).length
            ) {
              const slots = this.$normalizeLexicalChildren(host_lexical);
              const slot = slots[change.index];
              if (slot !== undefined) {
                if (slot instanceof Array) {
                  for (const node of slot) {
                    const storage = this.#binding.reverse.get(node.getKey());
                    if (storage !== undefined) {
                      this.removeBindings(storage);
                    }
                  }
                } else {
                  const storage = this.#binding.reverse.get(slot.getKey());
                  if (storage !== undefined) {
                    this.removeBindings(storage);
                  }
                }
              }
              let deleteAt = 0;
              for (let i = 0; i < change.index && i < slots.length; i++) {
                const slotAtI = slots[i];
                deleteAt += slotAtI instanceof Array ? slotAtI.length : 1;
              }
              const deleteSize =
                slot === undefined
                  ? 0
                  : slot instanceof Array
                    ? slot.length
                    : 1;
              host_lexical.splice(deleteAt, deleteSize, []);
            }

            const existing = this.#binding.forward.get(child);
            if (existing !== undefined) {
              this.removeBindings(child);
            }

            const kind = child.get("kind");
            let nodes_lexical: LexicalNode[];
            if (kind === "text") {
              nodes_lexical = $convertLiveTextNodeToLexicalNode(
                child as LiveTextNode
              );
            } else if (kind === "linebreak") {
              nodes_lexical = [$createLineBreakNode()];
            } else if (kind === "element") {
              nodes_lexical = [
                $convertLiveElementNodeToLexicalNode(child as LiveElementNode),
              ];
            } else {
              continue;
            }

            const insertSlots = this.$normalizeLexicalChildren(host_lexical);
            let insertAt = 0;
            for (let i = 0; i < change.index && i < insertSlots.length; i++) {
              const slotAtI = insertSlots[i];
              insertAt += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            host_lexical.splice(insertAt, 0, nodes_lexical);

            if (kind === "text") {
              this.createBinding(
                child as LiveTextNode,
                nodes_lexical as TextNode[]
              );
            } else if (kind === "element") {
              this.createBinding(
                child as LiveElementNode,
                nodes_lexical[0] as ElementNode
              );
            } else {
              this.#binding.forward.set(child, nodes_lexical[0]);
              this.#binding.reverse.set(nodes_lexical[0].getKey(), child);
            }
          } else if (change.type === "set") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }
            const child = change.item as LiveChildNode;
            if (this.#binding.forward.get(child) !== undefined) {
              continue;
            }

            const slots = this.$normalizeLexicalChildren(host_lexical);
            const slot = slots[change.index];
            if (slot !== undefined) {
              if (slot instanceof Array) {
                for (const node of slot) {
                  const storage = this.#binding.reverse.get(node.getKey());
                  if (storage !== undefined) {
                    this.removeBindings(storage);
                  }
                }
              } else {
                const storage = this.#binding.reverse.get(slot.getKey());
                if (storage !== undefined) {
                  this.removeBindings(storage);
                }
              }
            }
            let deleteAt = 0;
            for (let i = 0; i < change.index && i < slots.length; i++) {
              const slotAtI = slots[i];
              deleteAt += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            const deleteSize =
              slot === undefined ? 0 : slot instanceof Array ? slot.length : 1;
            host_lexical.splice(deleteAt, deleteSize, []);

            const existing = this.#binding.forward.get(child);
            if (existing !== undefined) {
              this.removeBindings(child);
            }

            const kind = child.get("kind");
            let nodes_lexical: LexicalNode[];
            if (kind === "text") {
              nodes_lexical = $convertLiveTextNodeToLexicalNode(
                child as LiveTextNode
              );
            } else if (kind === "linebreak") {
              nodes_lexical = [$createLineBreakNode()];
            } else if (kind === "element") {
              nodes_lexical = [
                $convertLiveElementNodeToLexicalNode(child as LiveElementNode),
              ];
            } else {
              continue;
            }

            const insertSlots = this.$normalizeLexicalChildren(host_lexical);
            let insertAt = 0;
            for (let i = 0; i < change.index && i < insertSlots.length; i++) {
              const slotAtI = insertSlots[i];
              insertAt += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            host_lexical.splice(insertAt, 0, nodes_lexical);

            if (kind === "text") {
              this.createBinding(
                child as LiveTextNode,
                nodes_lexical as TextNode[]
              );
            } else if (kind === "element") {
              this.createBinding(
                child as LiveElementNode,
                nodes_lexical[0] as ElementNode
              );
            } else {
              this.#binding.forward.set(child, nodes_lexical[0]);
              this.#binding.reverse.set(nodes_lexical[0].getKey(), child);
            }
          } else if (change.type === "delete") {
            if (!(change.deletedItem instanceof LiveObject)) {
              continue;
            }

            const child = change.deletedItem as LiveChildNode;
            const mapped = this.#binding.forward.get(child);
            if (mapped !== undefined && !(mapped instanceof Array)) {
              this.removeBindings(child);
              mapped.remove();
              continue;
            }

            if (mapped !== undefined) {
              this.removeBindings(child);
            }

            const slots = this.$normalizeLexicalChildren(host_lexical);
            let deleteAt = 0;
            for (let i = 0; i < change.index && i < slots.length; i++) {
              const slotAtI = slots[i];
              deleteAt += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            const slot = slots[change.index];
            const deleteSize =
              slot === undefined ? 0 : slot instanceof Array ? slot.length : 1;
            host_lexical.splice(deleteAt, deleteSize, []);
          } else if (change.type === "move") {
            if (!(change.item instanceof LiveObject)) {
              continue;
            }
            const child = change.item as LiveChildNode;
            const mapped = this.#binding.forward.get(child);
            if (mapped === undefined) {
              continue;
            }

            const slots = this.$normalizeLexicalChildren(host_lexical);
            let prevStart = 0;
            for (let i = 0; i < change.previousIndex && i < slots.length; i++) {
              const slotAtI = slots[i];
              prevStart += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            const prevSlot = slots[change.previousIndex];
            const prevSize =
              prevSlot === undefined
                ? 0
                : prevSlot instanceof Array
                  ? prevSlot.length
                  : 1;
            host_lexical.splice(prevStart, prevSize, []);

            const nodes = mapped instanceof Array ? [...mapped] : [mapped];
            const slotsAfter = this.$normalizeLexicalChildren(host_lexical);
            let insertAt = 0;
            for (let i = 0; i < change.index && i < slotsAfter.length; i++) {
              const slotAtI = slotsAfter[i];
              insertAt += slotAtI instanceof Array ? slotAtI.length : 1;
            }
            host_lexical.splice(insertAt, 0, nodes);
          }
        }
      } else if (update.type === "LiveObject") {
        const storageNode = update.node;
        const kind = storageNode.get("kind");
        if (
          kind !== "root" &&
          kind !== "element" &&
          kind !== "text" &&
          kind !== "linebreak" &&
          kind !== "decorator"
        ) {
          continue;
        }

        const node_lexical = this.#binding.forward.get(
          storageNode as LiveStorageNode
        );
        if (node_lexical === undefined || node_lexical instanceof Array) {
          continue;
        }

        const props_liveblocks = (
          storageNode as LiveObject<LiveElementShape>
        ).get("props");
        if (isEqual($getLexicalNodeProps(node_lexical), props_liveblocks)) {
          continue;
        }

        for (const [key, delta] of Object.entries(update.updates)) {
          if (delta === undefined || key !== "props") {
            continue;
          }

          if (delta.type === "delete") {
            $setLexicalNodeProps(node_lexical, undefined);
          } else {
            $setLexicalNodeProps(
              node_lexical,
              (storageNode as LiveObject<{ props?: JsonObject }>).get("props")
            );
          }
        }
      }
    }
  }

  private $synchronizeChildrenProps(node: ElementNode): void {
    for (const child_lexical of this.$normalizeLexicalChildren(node)) {
      if (child_lexical instanceof Array) {
        continue;
      }
      if (!$isElementNode(child_lexical)) {
        continue;
      }

      const child_liveblocks = this.#binding.reverse.get(
        child_lexical.getKey()
      ) as LiveObject<LiveElementShape> | undefined;
      if (child_liveblocks === undefined) {
        continue;
      }

      const props_lexical = $getLexicalNodeProps(child_lexical);
      const props_liveblocks = (
        child_liveblocks as LiveObject<LiveElementShape>
      ).get("props");
      if (!isEqual(props_lexical, props_liveblocks)) {
        if (props_lexical === undefined) {
          (child_liveblocks as LiveObject<LiveElementShape>).delete("props");
        } else {
          (child_liveblocks as LiveObject<LiveElementShape>).set(
            "props",
            props_lexical
          );
        }
      }

      this.$synchronizeChildrenProps(child_lexical);
    }
  }

  /**
   * @internal
   */
  public updateLiveTextFromLexicalNodes(
    node: LiveTextNode,
    target: readonly TextNode[]
  ) {
    target = target.map((node) => node.getLatest());

    const segments_node = node.get("content").toJSON();
    const segments_target = createSegmentsFromTextNodes(target);
    if (areSegmentsEqual(segments_node, segments_target)) {
      this.createBinding(node, target);
      return;
    }
    const text = node.get("content");

    const plain_node = segments_node.map((segment) => segment[0]).join("");
    const plain_target = target.map((node) => node.getTextContent()).join("");
    if (plain_node !== plain_target) {
      let prefix = 0;
      while (
        prefix < plain_node.length &&
        prefix < plain_target.length &&
        plain_node[prefix] === plain_target[prefix]
      ) {
        prefix++;
      }

      let suffix = 0;
      while (
        suffix < plain_node.length - prefix &&
        suffix < plain_target.length - prefix &&
        plain_node[plain_node.length - 1 - suffix] ===
          plain_target[plain_target.length - 1 - suffix]
      ) {
        suffix++;
      }

      const numOfCharactersToDelete = plain_node.length - prefix - suffix;
      if (numOfCharactersToDelete > 0) {
        text.delete(prefix, numOfCharactersToDelete);
      }

      const textToInsert = plain_target.slice(
        prefix,
        plain_target.length - suffix
      );
      if (textToInsert.length > 0) {
        text.insert(
          prefix,
          textToInsert,
          getSegmentAttributesAtOffset(segments_target, prefix)
        );
      }
    }

    if (segments_target.length === 0) {
      if (text.length > 0) {
        text.delete(0, text.length);
      }
    } else {
      let offset = 0;

      // Iterate over each text segment and for calculate what format attributes
      // need to change (e.g. bold, italic) by comparing the current and target
      // segment attributes over the corresponding text range. If there's a
      // difference, we apply the necessary format updates to that range in
      // the LiveText node.
      for (const segment of segments_target) {
        const [text, attributes] = segment;

        const attributes_target = Object.fromEntries(
          Object.entries(attributes ?? {}).filter(
            ([_, value]) => value === true
          )
        );

        const slice = getSegmentsInRange(node.get("content").toJSON(), {
          rangeStart: offset,
          rangeEnd: offset + text.length,
        });

        const patch: Record<string, boolean | null> = {};
        for (const key of Object.keys(TEXT_TYPE_TO_FORMAT) as Array<
          keyof typeof TEXT_TYPE_TO_FORMAT
        >) {
          const wanted = attributes_target[key] === true;
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

        const matches =
          slice.map((part) => part[0]).join("") === text &&
          slice.length === 1 &&
          (
            Object.keys(TEXT_TYPE_TO_FORMAT) as Array<
              keyof typeof TEXT_TYPE_TO_FORMAT
            >
          ).every((key) => {
            const attrs = slice[0]!.length > 1 ? slice[0]![1]! : {};
            return (attrs[key] === true) === (attributes_target[key] === true);
          });

        if (!matches) {
          node.get("content").format(offset, text.length, patch);
        }

        offset += text.length;
      }
    }

    this.createBinding(node, target);
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
    node_liveblocks: LiveElementNode,
    node_lexical: ElementNode
  ): void;
  public createBinding(
    node_liveblocks: LiveTextNode | LiveElementNode,
    node_lexical: readonly TextNode[] | ElementNode
  ) {
    if (node_lexical instanceof Array) {
      this.#binding.forward.set(node_liveblocks, node_lexical);
      for (const node of node_lexical) {
        this.#binding.reverse.set(node.getKey(), node_liveblocks);
      }
    } else {
      this.#binding.forward.set(node_liveblocks, node_lexical);
      this.#binding.reverse.set(node_lexical.getKey(), node_liveblocks);

      const children = node_lexical.getChildren();
      let index = 0;
      for (const child of (node_liveblocks as LiveElementNode).get(
        "children"
      )) {
        const kind = child.get("kind");

        switch (kind) {
          case "text": {
            // Coalesced text: LiveTextNode ↔ Array<TextNode>
            const node = child as LiveTextNode;
            const segments = node.get("content").toJSON();
            const count = segments.length === 0 ? 1 : segments.length;
            const nodes = children.slice(index, index + count) as TextNode[];
            this.#binding.forward.set(node, nodes);
            for (const child of nodes) {
              this.#binding.reverse.set(child.getKey(), node);
            }
            index += count;
            break;
          }
          case "linebreak": {
            // LiveLineBreakNode ↔ Lexical linebreak node
            const liveLineBreak = child as LiveLineBreakNode;
            const lineBreakNode = children[index];
            this.#binding.forward.set(liveLineBreak, lineBreakNode);
            this.#binding.reverse.set(lineBreakNode.getKey(), liveLineBreak);
            index++;
            break;
          }
          case "element": {
            // Element nodes are mapped recursively
            this.createBinding(
              child as LiveElementNode,
              children[index] as ElementNode
            );
            index++;
            break;
          }
          default:
            throw new Error(`Unsupported node of kind "${String(kind)}"`);
        }
      }
    }
  }

  /**
   * Whether a bound Lexical mirror no longer represents live editor content.
   *
   * A node is orphaned when Lexical has removed or replaced it — either explicitly
   * via normalization (merge/delete) or because the bound instance is detached
   * from the document tree. For coalesced text slots, every span in the group
   * must be gone before the slot counts as orphaned.
   *
   * @param node - A single Lexical node or coalesced text slot from the binding.
   * @param normalizedNodes - Lexical keys removed during this update's normalization pass.
   * @returns `true` when the mirror should be treated as stale storage-side.
   */
  private isOrphan(
    node: readonly TextNode[] | LexicalNode,
    normalizedNodes: ReadonlySet<NodeKey>
  ): boolean {
    if (node instanceof Array) {
      // If all text nodes bound to the storage node are "normalized",
      // it means those nodes have been deleted or merged by lexical
      // and the storage node is considered orphaned.
      if (node.every((node) => normalizedNodes.has(node.getKey()))) {
        return true;
      }

      // If all text nodes bound to the storage node are detached,
      // it means the storage node is considered orphaned.
      return node.every((node) => {
        return !($getNodeByKey(node.getKey())?.isAttached() ?? false);
      });
    } else {
      if (normalizedNodes.has(node.getKey())) {
        return true;
      }
      return !($getNodeByKey(node.getKey())?.isAttached() ?? false);
    }
  }

  private hasBinding(node: readonly TextNode[] | LexicalNode): boolean {
    if (node instanceof Array) {
      return node.every((n) => {
        return this.#binding.reverse.has(n.getKey());
      });
    }
    return this.#binding.reverse.has(node.getKey());
  }

  private removeBindings(node: LiveStorageNode): void {
    const node_lexical = this.#binding.forward.get(node);
    if (node_lexical !== undefined) {
      if (node_lexical instanceof Array) {
        for (const node of node_lexical) {
          this.#binding.reverse.delete(node.getKey());
        }
      } else {
        this.#binding.reverse.delete(node_lexical.getKey());
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
   * Returns the Lexical ElementNode whose normalized children align with a storage
   * host's `children` LiveList indices — the mirror used before list/text diffing.
   *
   * If the forward binding points to an attached element, returns it. Otherwise,
   * rebinds by matching the storage child's index under its parent (storage identity
   * is stable; Lexical keys can change after normalization).
   *
   * @example Path 1 — happy path (typing in a paragraph)
   *
   * Storage host P1                    Lexical mirror
   * ─────────────────                  ──────────────
   * paragraph (element)            ↔   Paragraph p1  ← returned
   *  └── children[0]: text              └── TextNode t1 "Hello"
   *
   * forward: P1 → p1 (attached)  →  return p1.getLatest()
   *
   * @example Path 2 — document root host (multi-block reorder)
   *
   * Storage host                       Lexical mirror
   * ────────────                       ──────────────
   * document (root)                ↔   Root
   *  └── children: [P1, P2, P3]         └── [p1, p2, p3]
   *
   * forward: document → Root  →  return Root
   *
   * @example Path 3 — rebound (Lexical recreated the paragraph)
   *
   * Before edit:
   *   forward: P1 → old_p1 (detached)
   *
   * After Lexical normalization:
   * Storage (unchanged)                  Lexical
   * document                             Root
   *  └── [0] P1  ← same LiveObject         └── [0] new_p1 (unbound)
   *
   * Rebound steps:
   *   1. forward.get(P1) → old_p1, not attached
   *   2. parent = document, storageIndex = 0
   *   3. parent_lexical = Root
   *   4. normalized slot [0] = new_p1, reverse has no entry → rebind
   *   5. forward: P1 → new_p1, reverse: new_p1 → P1
   *
   * @param node - A root or element storage node that owns a `children` LiveList.
   * @returns The Lexical ElementNode to diff against `host_liveblocks.get("children")`.
   * @throws {Error} When no attached or reboundable Lexical element exists for this host.
   */
  private $getLexicalElementForStorageHost(
    node: LiveObject<LiveRootShape | LiveElementShape>
  ): ElementNode {
    // Path 1: document root host → Lexical Root via forward binding.
    if (node.get("kind") === "root") {
      const root_lexical = this.#binding.forward.get(this.root);
      if (
        root_lexical === undefined ||
        root_lexical instanceof Array ||
        !$isRootNode(root_lexical)
      ) {
        throw new Error("Document root is not bound to a Lexical element.");
      }
      return root_lexical;
    }

    // Path 2: element host with a live forward binding.
    const node_lexical = this.#binding.forward.get(node);
    if (
      node_lexical !== undefined &&
      !(node_lexical instanceof Array) &&
      $isElementNode(node_lexical) &&
      $getNodeByKey(node_lexical.getKey())?.isAttached()
    ) {
      return node_lexical.getLatest();
    }

    // Path 3: rebound — same storage child at same list index, new Lexical instance.
    const parent_liveblocks = this.findStorageParent(
      this.root,
      node as LiveChildNode
    );
    if (parent_liveblocks !== null) {
      const index = (
        parent_liveblocks.get("children") as LiveList<LiveChildNode>
      ).indexOf(node as LiveChildNode);

      if (index !== -1) {
        let parent_lexical: ElementNode | null = null;
        try {
          parent_lexical =
            this.$getLexicalElementForStorageHost(parent_liveblocks);
        } catch {
          // Parent host not resolvable — fall through to error below.
        }

        if (parent_lexical !== null) {
          const children = this.$normalizeLexicalChildren(parent_lexical);
          const candidate = children[index];

          if (
            candidate !== undefined &&
            !(candidate instanceof Array) &&
            $isElementNode(candidate) &&
            this.#binding.reverse.get(candidate.getKey()) === undefined
          ) {
            this.#binding.forward.set(node, candidate);
            this.#binding.reverse.set(candidate.getKey(), node);
            return candidate.getLatest();
          }
        }
      }
    }

    if (
      node_lexical === undefined ||
      node_lexical instanceof Array ||
      !$isElementNode(node_lexical)
    ) {
      throw new Error(
        `Storage host ${node.get("kind")}:${node.get("type")} is not bound.`
      );
    }

    return node_lexical.getLatest();
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
  /**
   * @internal
   */
  public $normalizeLexicalChildren(
    node: ElementNode
  ): Array<readonly TextNode[] | LexicalNode> {
    const children = node.getChildren();
    const slots: Array<TextNode[] | LexicalNode> = [];

    for (let i = 0; i < children.length; ) {
      const child = children[i];
      if ($isTextNode(child)) {
        const node_liveblocks = this.#binding.reverse.get(child.getKey());
        const nodes: TextNode[] = [child.getLatest() as TextNode];
        i++;
        while (i < children.length && $isTextNode(children[i])) {
          const next = children[i];
          if (this.#binding.reverse.get(next.getKey()) !== node_liveblocks) {
            break;
          }
          nodes.push(next.getLatest() as TextNode);
          i++;
        }
        slots.push(nodes);
      } else {
        slots.push(child.getLatest());
        i++;
      }
    }

    return slots;
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

function getTextNodeAndOffsetAtCharacterIndex(
  nodes: readonly TextNode[],
  index: number
): {
  node: TextNode;
  index: number;
  offset: number;
} | null {
  if (index < 0) {
    return null;
  }

  let offset = 0;
  for (let textNodeIndex = 0; textNodeIndex < nodes.length; textNodeIndex++) {
    const textNode = nodes[textNodeIndex];
    const length = textNode.getTextContent().length;
    if (index <= offset + length) {
      return {
        node: textNode,
        index: textNodeIndex,
        offset: index - offset,
      };
    }
    offset += length;
  }

  if (nodes.length > 0 && index === offset) {
    const lastIndex = nodes.length - 1;
    const lastNode = nodes[lastIndex];
    return {
      node: lastNode,
      index: lastIndex,
      offset: lastNode.getTextContent().length,
    };
  }

  return null;
}

/**
 * Compares a coalesced LiveText node against one or more sibling Lexical TextNodes.
 *
 * Lexical stores each formatted span as its own TextNode; storage holds sibling spans
 * as segments inside a single LiveText. This function checks that segment strings and
 * inline formats (bold, italic, etc.) match — not Lexical object identity.
 *
 * @example Returns `true` — two Lexical spans, one LiveText child
 *
 * Lexical (siblings under Paragraph):     Storage (one text child):
 *   TextNode "Hello " (bold)               text → LiveText segments:
 *   TextNode "world"                         ["Hello ", {bold}]
 *                                            ["world"]
 *
 * @example Returns `true` — empty paragraph placeholder
 *
 * Lexical:                                 Storage:
 *   TextNode "" (only child)                text → LiveText: []
 *
 * Both represent an empty text run; a lone `""` segment is normalized to `[]`.
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
function areTextNodesEqual(
  text_liveblocks: LiveTextNode,
  text_lexical: TextNode[]
): boolean {
  const segments_liveblocks = text_liveblocks.get("content").toJSON();
  const segments_lexical = createSegmentsFromTextNodes(text_lexical);
  return areSegmentsEqual(segments_liveblocks, segments_lexical);
}

function createSegmentsFromTextNodes(
  nodes: readonly TextNode[]
): Array<[string] | [string, Record<string, boolean>]> {
  let segments: Array<[string] | [string, Record<string, boolean>]> = nodes.map(
    (node) => {
      const text = node.getTextContent();
      const attributes: Record<string, boolean> = {};
      for (const [key, flag] of Object.entries(TEXT_TYPE_TO_FORMAT)) {
        if (node.getFormat() & flag) {
          attributes[key] = true;
        }
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

function areSegmentsEqual(
  segments_liveblocks: Array<
    [text: string] | [text: string, attributes: TextAttributes]
  >,
  segments_lexical: Array<[string] | [string, Record<string, boolean>]>
): boolean {
  if (segments_liveblocks.length !== segments_lexical.length) {
    return false;
  }

  for (let i = 0; i < segments_liveblocks.length; i++) {
    const node_liveblocks = segments_liveblocks[i];
    const node_lexical = segments_lexical[i];

    if (node_liveblocks[0] !== node_lexical[0]) {
      return false;
    }

    const attributes_liveblocks =
      node_liveblocks.length > 1 ? node_liveblocks[1]! : {};
    const attributes_lexical = node_lexical.length > 1 ? node_lexical[1]! : {};
    for (const key of Object.keys(TEXT_TYPE_TO_FORMAT)) {
      if (
        (attributes_liveblocks[key] === true) !==
        (attributes_lexical[key] === true)
      ) {
        return false;
      }
    }
  }

  return true;
}
function areTextNodesEqualV1(
  node_lexical: readonly TextNode[],
  node_liveblocks: LiveTextNode
): boolean {
  const segments = node_liveblocks.get("content").toJSON();
  if (segments.length === 0) {
    return (
      node_lexical.length === 1 &&
      node_lexical[0].getTextContent() === "" &&
      node_lexical[0].getFormat() === 0
    );
  }

  if (segments.length !== node_lexical.length) {
    return false;
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const node = node_lexical[i];
    if (segment[0] !== node.getTextContent()) {
      return false;
    }
    const attributes =
      segment.length > 1 ? (segment[1] as Record<string, unknown>) : {};
    for (const key of Object.keys(TEXT_TYPE_TO_FORMAT)) {
      if (
        (attributes[key] === true) !==
        ((node.getFormat() &
          TEXT_TYPE_TO_FORMAT[key as keyof typeof TEXT_TYPE_TO_FORMAT]) !==
          0)
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Returns the LiveText segments that overlap a half-open character range
 * `[rangeStart, rangeEnd)` on the flattened segment string. Each overlapped
 * segment is trimmed to the intersecting substring; original attributes are
 * preserved on each part.
 *
 * @example Single segment — range covers the full segment
 *
 * Segments (flat index 0–4):           rangeStart=0, rangeEnd=5
 *   ["Hello", {bold}]                  ─────────────────
 *    01234|5                             ^    ^
 *
 * Returns:
 *   [["Hello", {bold}]]
 *
 * @example Multiple segments — range spans a format boundary
 *
 * Segments:                            rangeStart=0, rangeEnd=11
 *   ["Hello ", {bold}]                   "Hello world"
 *   ["world"]                             0    6    11
 *    0123456|789012                        └────┴─────┘
 *
 * Returns:
 *   [["Hello ", {bold}], ["world"]]
 *
 * @example Partial trim — range cuts through one segment
 *
 * Segments:                            rangeStart=3, rangeEnd=8
 *   ["Hello world"]                        "Hello world"
 *    0123456789012                           ^  │
 *                                            lo wo
 *
 * Returns:
 *   [["lo wo"]]
 *
 * @example Empty range
 *
 * rangeStart >= rangeEnd → []
 */
function getSegmentsInRange(
  segments: Array<[text: string] | [text: string, attributes: TextAttributes]>,
  options: {
    rangeStart: number;
    rangeEnd: number;
  }
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
  segments: Array<[text: string] | [text: string, attributes: TextAttributes]>,
  offset: number
): JsonObject | undefined {
  let position = 0;
  for (const segment of segments) {
    const length = segment[0].length;
    if (offset >= position && offset <= position + length) {
      if (segment.length > 1) {
        return segment[1];
      }
      return undefined;
    }
    position += length;
  }
  return undefined;
}

function $encodeTextPoint(
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

  let flatOffset = point.offset;
  let prevSibling = node_lexical.getPreviousSibling();
  while ($isTextNode(prevSibling)) {
    flatOffset += prevSibling.getTextContentSize();
    prevSibling = prevSibling.getPreviousSibling();
  }

  const liveText = (node_liveblocks as LiveTextNode).get("content");
  return {
    nodeId,
    type: "text",
    offset: liveText[kInternal].encodeIndex(flatOffset),
    version: liveText.version,
  };
}

function $encodeElementPoint(
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

  return {
    nodeId,
    type: "element",
    offset: convertLexicalChildIndexToStorage(node_lexical, point.offset),
    version: 0,
  };
}

/**
 * Converts a Lexical element's child index to the corresponding Liveblocks storage offset,
 * accounting for the fact that consecutive Lexical text nodes are coalesced into a single
 * storage node. It skips over runs of text nodes so that multiple Lexical text children
 * map to one storage index.
 */
function convertLexicalChildIndexToStorage(
  element: ElementNode,
  targetChildIndex: number
): number {
  const children = element.getChildren();
  let index_liveblocks = 0;
  let index_lexical = 0;

  while (index_lexical < targetChildIndex) {
    if (index_lexical >= children.length) {
      return index_liveblocks;
    }
    index_lexical += 1;
    if ($isTextNode(children[index_lexical - 1])) {
      while (
        index_lexical < children.length &&
        $isTextNode(children[index_lexical])
      ) {
        index_lexical += 1;
      }
    }
    index_liveblocks += 1;
  }

  return index_liveblocks;
}

/** Inverse of {@link convertLexicalChildIndexToStorage}. */
function convertStorageOffsetToLexicalChildIndex(
  element: ElementNode,
  storageOffset: number
): number {
  const children = element.getChildren();
  let remainingStorageOffset = storageOffset;
  let lexicalOffset = 0;

  while (remainingStorageOffset > 0 && lexicalOffset < children.length) {
    lexicalOffset += 1;
    if ($isTextNode(children[lexicalOffset - 1])) {
      while (
        lexicalOffset < children.length &&
        $isTextNode(children[lexicalOffset])
      ) {
        lexicalOffset += 1;
      }
    }
    remainingStorageOffset -= 1;
  }

  return lexicalOffset;
}

/**
 * Materializes a Liveblocks storage child from Lexical content (Lexical → Live).
 *
 * Dispatches by input shape:
 *   - `TextNode[]`  → one `LiveTextNode` (coalesced segments)
 *   - linebreak     → `LiveLineBreakNode`
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
  node: LexicalNode | readonly TextNode[]
): LiveChildNode {
  if (node instanceof Array) {
    const node_liveblocks = new LiveObject({
      kind: "text",
      type: "text",
      version: 1,
      content: new LiveText(),
    }) as LiveTextNode;

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

  if ($isLineBreakNode(node)) {
    return new LiveObject({
      kind: "linebreak",
      type: "linebreak",
      version: 1,
    }) as LiveLineBreakNode;
  }

  if ($isElementNode(node)) {
    const children_liveblocks: LiveChildNode[] = [];
    const children_lexical = node.getChildren();

    for (let i = 0; i < children_lexical.length; i++) {
      const child = children_lexical[i]!;
      if ($isTextNode(child)) {
        const textNodes: TextNode[] = [];
        for (
          let textNode = child;
          i < children_lexical.length && $isTextNode(textNode);
          textNode = children_lexical[++i] as TextNode
        ) {
          textNodes.push(textNode.getLatest() as TextNode);
        }
        i--;
        children_liveblocks.push(createStorageNodeFromLexicalNode(textNodes));
      } else {
        children_liveblocks.push(
          createStorageNodeFromLexicalNode(child.getLatest())
        );
      }
    }

    const props = $getLexicalNodeProps(node);

    return new LiveObject({
      kind: "element",
      type: node.getType(),
      version: 1,
      children: new LiveList(children_liveblocks),
      ...(props !== undefined ? { props } : {}),
    }) as LiveElementNode;
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
 */
export function $convertLiveElementNodeToLexicalNode(
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
  for (const child of node.get("children")) {
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
      default:
        throw new Error(`Unsupported live node kind "${String(kind)}"`);
    }
  }

  node_lexical.append(...children);

  const props = node.get("props");
  if (props !== undefined) {
    $setLexicalNodeProps(node_lexical, props);
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
 * @example Empty LiveText → placeholder TextNode
 *
 * Storage:                                Lexical:
 *   text → LiveText: []                     [TextNode ""]
 *
 * @example Single unformatted segment
 *
 * Storage:                                Lexical:
 *   text → LiveText: [["hello"]]            [TextNode "hello"]
 */
function $convertLiveTextNodeToLexicalNode(node: LiveTextNode): TextNode[] {
  const info = $getEditor()._nodes.get("text");
  if (info === undefined) {
    throw new Error(
      'Node of type "text" is not registered. Please ensure that the node has been registered with the editor.'
    );
  }

  const segments = node.get("content").toJSON();
  if (segments.length === 0) {
    const node = new info.klass();
    if (!$isTextNode(node)) {
      throw new Error('Node of type "text" is not a TextNode.');
    }
    node.setTextContent("");
    return [node];
  } else {
    const nodes: TextNode[] = [];
    for (const segment of segments) {
      const node = new info.klass();
      if (!$isTextNode(node)) {
        throw new Error('Node of type "text" is not a TextNode.');
      }
      node.setTextContent(segment[0]);

      const attributes = segment.length > 1 ? segment[1] : undefined;

      let format = 0;
      if (attributes !== undefined) {
        for (const [key, value] of Object.entries(attributes)) {
          if (value && key in TEXT_TYPE_TO_FORMAT) {
            format |= TEXT_TYPE_TO_FORMAT[key];
          }
        }
      }
      node.setFormat(format);
      nodes.push(node.getLatest());
    }
    return nodes;
  }
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
 * Read Lexical element state that maps to storage `props`, using each node's
 * `exportJSON()` contract rather than enumerating internal instance fields.
 */
export function $getLexicalNodeProps(
  node: LexicalNode
): JsonObject | undefined {
  const latest = node.getLatest();
  if (!$isElementNode(latest)) {
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
 * Apply storage `props` onto a Lexical element — inverse of `$getLexicalNodeProps`.
 *
 * Uses each node's `updateFromJSON()` so custom node fields (e.g. heading `tag`)
 * are applied the same way Lexical does for copy/paste and persistence.
 *
 * Layout fields (`direction`, `format`, `indent`, …) are preserved from the
 * current node; they are omitted from storage props by `$getLexicalNodeProps`.
 */
export function $setLexicalNodeProps(
  node: LexicalNode,
  props: JsonObject | undefined
): void {
  const latest = node.getLatest();
  if (!$isElementNode(latest)) {
    return;
  }

  const exported = latest.exportJSON() as Record<string, unknown>;

  if (props === undefined) {
    const payload: Record<string, unknown> = {};
    for (const key of OMIT_FROM_LEXICAL_NODE_PROPS) {
      if (key in exported) {
        payload[key] = exported[key];
      }
    }
    if (latest.getType() === "heading") {
      payload.tag = "h1";
    }
    if (Object.keys(payload).length > 0) {
      latest
        .getWritable()
        .updateFromJSON(payload as LexicalUpdateJSON<SerializedElementNode>);
    }
    return;
  }

  const payload: Record<string, unknown> = {};

  // Keep element layout fields out of storage props from being reset by a partial update.
  for (const key of OMIT_FROM_LEXICAL_NODE_PROPS) {
    if (key in exported) {
      payload[key] = exported[key];
    }
  }

  const nodeState = exported[NODE_STATE_KEY];
  const flatStateKeys = new Set<string>();
  if (nodeState !== undefined && typeof nodeState === "object") {
    for (const stateKey of Object.keys(nodeState as Record<string, unknown>)) {
      flatStateKeys.add(stateKey);
    }
  }

  const statePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (flatStateKeys.has(key)) {
      statePayload[key] = value;
    } else {
      payload[key] = value;
    }
  }

  if (Object.keys(statePayload).length > 0) {
    payload[NODE_STATE_KEY] = statePayload;
  }

  latest
    .getWritable()
    .updateFromJSON(payload as LexicalUpdateJSON<SerializedElementNode>);
}
