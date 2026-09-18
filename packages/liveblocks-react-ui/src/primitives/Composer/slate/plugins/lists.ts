import type { KeyboardEvent } from "react";
import type { Path as SlatePath, Node as SlateNode } from "slate";
import {
  Editor as SlateEditor,
  Element,
  Node,
  Path,
  Point,
  Range,
  Transforms,
} from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

import type {
  ComposerBodyList,
  ComposerBodyListItem,
  ComposerBodyParagraph,
  ComposerBodyText,
} from "../../../../types";

type ListEditor = SlateEditor & ReactEditor & HistoryEditor;

type ListType = ComposerBodyList["type"];

type ListShortcut = { blockType: ListType; checked?: boolean };

const listTypes = new Set<ListType>([
  "bulleted-list",
  "numbered-list",
  "task-list",
]);

/** Compose list normalization onto the editor chain (inside `withNormalize`). */
export function withLists(editor: ListEditor): ListEditor {
  const { deleteFragment, normalizeNode } = editor;

  editor.deleteFragment = (options) => {
    deleteFragment(options);
    // `Transforms.insertNodes` may call `deleteFragment` before inserting (e.g. replacing a
    // mention draft). Collapsing in the same turn would remove the list before the mention is
    // inserted; defer until the rest of the synchronous stack (including that insert) finishes.
    queueMicrotask(() => {
      collapseRootIfOnlyEmptyList(editor);
    });
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (Node.has(editor, path) && isComposerBodyList(node)) {
      if (node.children.length === 0) {
        SlateEditor.withoutNormalizing(editor, () => {
          Transforms.removeNodes(editor, { at: path });
          Transforms.insertNodes(editor, emptyParagraph(), { at: path });
        });

        return;
      }
    }

    if (Node.has(editor, path) && hasChildNodes(node)) {
      const adjacentIndex = adjacentListIndex(node.children);

      if (adjacentIndex !== -1) {
        const mergeAt: SlatePath = [...path, adjacentIndex + 1];
        Transforms.mergeNodes(editor, { at: mergeAt });

        return;
      }
    }

    normalizeNode(entry);
  };

  return editor;
}

/** True when `blockPath` points at a block whose parent is a `list-item` (e.g. its paragraph). */
function isBlockDirectChildOfListItem(
  editor: ListEditor,
  blockPath: Path
): boolean {
  try {
    const parent = Node.parent(editor, blockPath);

    return Element.isElement(parent) && parent.type === "list-item";
  } catch {
    return false;
  }
}

export function handleListMarkdownShortcut(
  editor: ListEditor,
  event: KeyboardEvent
): boolean {
  if (
    event.key !== " " ||
    !editor.selection ||
    !Range.isCollapsed(editor.selection)
  ) {
    return false;
  }

  const anchor = editor.selection.anchor;
  const blockEntry = SlateEditor.above(editor, {
    match: (n) =>
      Element.isElement(n) &&
      SlateEditor.isBlock(editor, n) &&
      n.type !== "list-item",
  });

  if (!blockEntry) {
    return false;
  }

  const [, blockPath] = blockEntry;

  const blockStart = SlateEditor.start(editor, blockPath);
  const beforeRange = SlateEditor.range(editor, blockStart, anchor);
  const beforeText = SlateEditor.string(editor, beforeRange);
  const shortcut = listShortcutFromMarkdownToken(beforeText);

  if (!shortcut) {
    return false;
  }

  const inListItemParagraph = isBlockDirectChildOfListItem(editor, blockPath);

  if (inListItemParagraph) {
    const listItemPath = Path.parent(blockPath);
    const listItem = Node.get(editor, listItemPath);

    if (!Element.isElement(listItem) || listItem.type !== "list-item") {
      return false;
    }

    const primaryParagraphIndex = listItem.children.findIndex(
      (child) => Element.isElement(child) && child.type === "paragraph"
    );

    if (
      primaryParagraphIndex === -1 ||
      !Path.equals(blockPath, listItemPath.concat(primaryParagraphIndex))
    ) {
      return false;
    }

    event.preventDefault();
    Transforms.select(editor, beforeRange);
    Transforms.delete(editor);

    const listPath = Path.parent(listItemPath);

    convertListForMarkdownShortcut(editor, listPath, listItemPath, shortcut);

    return true;
  }

  event.preventDefault();
  Transforms.select(editor, beforeRange);
  Transforms.delete(editor);

  toggleList(editor, shortcut.blockType, shortcut.checked);

  return true;
}

/** Text offset from the start of `blockPath` to `point` (across all text leaves). */
function offsetFromBlockStart(
  editor: ListEditor,
  blockPath: Path,
  point: Point
): number {
  try {
    const blockStart = SlateEditor.start(editor, blockPath);
    const blockEnd = SlateEditor.end(editor, blockPath);

    if (Point.compare(point, blockStart) < 0) {
      return 0;
    }

    if (Point.compare(point, blockEnd) > 0) {
      return SlateEditor.string(
        editor,
        SlateEditor.range(editor, blockStart, blockEnd)
      ).length;
    }

    return SlateEditor.string(
      editor,
      SlateEditor.range(editor, blockStart, point)
    ).length;
  } catch {
    return point.offset;
  }
}

export function handleListKeyDown(
  editor: ListEditor,
  event: KeyboardEvent
): boolean {
  const selection = editor.selection;

  if (!selection || !Range.isCollapsed(selection)) {
    return false;
  }

  const listItemEntry = currentListItem(editor);

  if (!listItemEntry) {
    return false;
  }

  const [, listItemPath] = listItemEntry;
  const paragraphPath = itemParagraphPath(editor, listItemPath);
  const caretOffsetInParagraph = paragraphPath
    ? offsetFromBlockStart(editor, paragraphPath, selection.anchor)
    : selection.anchor.offset;

  const itemStart = SlateEditor.start(editor, listItemPath);
  const isAtStart = Range.equals(
    selection,
    SlateEditor.range(editor, itemStart)
  );

  if (event.key === "Tab" && event.shiftKey) {
    if (!isNestedListItem(editor, listItemPath)) {
      return false;
    }

    event.preventDefault();
    liftListItem(editor, listItemPath, caretOffsetInParagraph);

    return true;
  }

  if (event.key === "Tab" && !event.shiftKey) {
    const indented = indentListItem(editor, listItemPath);

    if (indented) {
      event.preventDefault();

      return true;
    }

    return false;
  }

  const shouldExitParent =
    isDeleteKey(event.key) &&
    isAtStart &&
    !isNestedListItem(editor, listItemPath) &&
    hasChildList(editor, listItemPath);

  if (shouldExitParent) {
    event.preventDefault();
    exitParentItemToParagraph(editor, listItemPath);

    return true;
  }

  // Composer uses Enter to submit and Shift+Enter for line breaks; mirror that inside lists.
  if (
    event.key === "Enter" &&
    event.shiftKey &&
    isListItemTextEmpty(editor, listItemPath)
  ) {
    event.preventDefault();
    liftListItem(editor, listItemPath, caretOffsetInParagraph);

    return true;
  }

  if (isDeleteKey(event.key) && isAtStart) {
    event.preventDefault();
    liftListItem(editor, listItemPath, caretOffsetInParagraph);

    return true;
  }

  if (event.key !== "Enter" || !event.shiftKey) {
    return false;
  }

  if (!paragraphPath) {
    return false;
  }

  event.preventDefault();
  splitListItem(editor, listItemPath, caretOffsetInParagraph);

  return true;
}

function listShortcutFromMarkdownToken(token: string): ListShortcut | null {
  if (token === "-" || token === "*") {
    return { blockType: "bulleted-list" };
  }

  if (/^\d+\.$/.test(token)) {
    return { blockType: "numbered-list" };
  }

  const taskMatch = token.match(/^-?\[( |x|X)?\]$/);

  if (taskMatch) {
    return {
      blockType: "task-list",
      checked: taskMatch[1]?.toLowerCase() === "x",
    };
  }

  return null;
}

function isDeleteKey(key: string) {
  return key === "Delete" || key === "Backspace";
}

/**
 * When the markdown token is typed at the start of a list item, change the enclosing list
 * type (or lift the item if the type is unchanged).
 */
function convertListForMarkdownShortcut(
  editor: ListEditor,
  listPath: Path,
  triggeringItemPath: Path,
  shortcut: ListShortcut
) {
  const list = Node.get(editor, listPath);

  if (!isComposerBodyList(list)) {
    return;
  }

  const newType = shortcut.blockType;

  if (list.type === newType) {
    liftListItem(editor, triggeringItemPath, 0);

    return;
  }

  SlateEditor.withoutNormalizing(editor, () => {
    Transforms.setNodes(editor, { type: newType }, { at: listPath });

    if (newType === "task-list") {
      for (const [, itemPath] of SlateEditor.nodes(editor, {
        at: listPath,
        match: isComposerBodyListItem,
      })) {
        const checked = Path.equals(itemPath, triggeringItemPath)
          ? shortcut.checked ?? false
          : false;

        Transforms.setNodes(editor, { checked }, { at: itemPath });
      }

      return;
    }

    for (const [, itemPath] of SlateEditor.nodes(editor, {
      at: listPath,
      match: isComposerBodyListItem,
    })) {
      Transforms.unsetNodes(editor, "checked", { at: itemPath });
    }
  });
}

function toggleList(editor: ListEditor, listType: ListType, checked = false) {
  if (isBlockActive(editor, listType)) {
    const listItemEntry = currentListItem(editor);

    if (listItemEntry) {
      liftListItem(editor, listItemEntry[1]);
    }

    return;
  }

  Transforms.setNodes(
    editor,
    { type: "paragraph" },
    { match: (n) => isTextBlock(editor, n) }
  );
  Transforms.wrapNodes(editor, emptyListItemForWrap());
  Transforms.wrapNodes(editor, listElement(listType, []), {
    match: isComposerBodyListItem,
  });

  if (listType === "task-list") {
    const listItemEntry = currentListItem(editor);

    if (listItemEntry) {
      Transforms.setNodes(editor, { checked }, { at: listItemEntry[1] });
    }
  }
}

function liftListItem(editor: ListEditor, itemPath: Path, offset = 0) {
  const listPath = Path.parent(itemPath);

  if (isNestedListItem(editor, itemPath)) {
    const item = Node.get(editor, itemPath);

    if (!Element.isElement(item) || item.type !== "list-item") {
      return;
    }

    const itemIndex = itemPath.at(-1);

    if (itemIndex === undefined) {
      return;
    }

    const parentItemPath = Path.parent(listPath);
    const liftedItem = structuredClone(item) as ComposerBodyListItem;
    const list = Node.get(editor, listPath);

    if (!isComposerBodyList(list)) {
      return;
    }

    const followingItems = list.children
      .slice(itemIndex + 1)
      .map(cloneListItem);
    appendNestedItems(liftedItem, list.type, followingItems);

    const nextItemPath = Path.next(parentItemPath);

    SlateEditor.withoutNormalizing(editor, () => {
      for (let index = list.children.length - 1; index >= itemIndex; index -= 1) {
        Transforms.removeNodes(editor, { at: listPath.concat(index) });
      }

      removeListIfEmpty(editor, listPath);
      Transforms.insertNodes(editor, liftedItem, { at: nextItemPath });
      selectListItemText(editor, nextItemPath, offset);
    });

    return;
  }

  liftListItemToParagraph(editor);
}

function liftListItemToParagraph(editor: ListEditor) {
  Transforms.unwrapNodes(editor, {
    match: isComposerBodyList,
    split: true,
  });
  Transforms.unwrapNodes(editor, { match: isComposerBodyListItem, split: true });
}

function splitListItem(editor: ListEditor, itemPath: Path, offset: number) {
  const item = Node.get(editor, itemPath);

  if (!Element.isElement(item) || item.type !== "list-item") {
    return;
  }

  const paragraphPath = itemParagraphPath(editor, itemPath);

  if (!paragraphPath) {
    return;
  }

  const paragraph = Node.get(editor, paragraphPath);

  if (!Element.isElement(paragraph) || paragraph.type !== "paragraph") {
    return;
  }

  const [before, after] = splitLeaves(
    paragraph.children as ComposerBodyText[],
    offset
  );
  const childIndexes = offset === 0 ? childListIndexes(item) : [];
  const nextItem = emptyListItem(after);
  nextItem.children.push(
    ...childIndexes.map((index) =>
      structuredClone(item.children[index] as ComposerBodyList)
    )
  );
  const nextItemPath = Path.next(itemPath);

  SlateEditor.withoutNormalizing(editor, () => {
    if (offset === 0) {
      for (const index of [...childIndexes].reverse()) {
        Transforms.removeNodes(editor, { at: itemPath.concat(index) });
      }
    }

    Transforms.removeNodes(editor, { at: paragraphPath });
    Transforms.insertNodes(editor, emptyParagraph(before), { at: paragraphPath });
    Transforms.insertNodes(editor, nextItem, { at: nextItemPath });
    selectListItemText(editor, nextItemPath, 0);
  });
}

function exitParentItemToParagraph(editor: ListEditor, itemPath: Path) {
  const item = Node.get(editor, itemPath);

  if (!Element.isElement(item) || item.type !== "list-item") {
    return;
  }

  const itemIndex = itemPath.at(-1);

  if (itemIndex === undefined) {
    return;
  }

  const listPath = Path.parent(itemPath);
  const list = Node.get(editor, listPath);

  if (!isComposerBodyList(list)) {
    return;
  }

  const paragraph = item.children.find(isParagraphElement);

  if (!paragraph) {
    return;
  }

  const promotedItems = item.children
    .filter(isComposerBodyList)
    .map((childList: ComposerBodyList) =>
      listElement(
        childList.type,
        childList.children.map(cloneListItem)
      )
    );
  const previousItems = list.children.slice(0, itemIndex).map(cloneListItem);
  const nextItems = list.children.slice(itemIndex + 1).map(cloneListItem);
  const replacementNodes = [
    ...(previousItems.length > 0 ? [listElement(list.type, previousItems)] : []),
    structuredClone(paragraph) as ComposerBodyParagraph,
    ...promotedItems,
    ...(nextItems.length > 0 ? [listElement(list.type, nextItems)] : []),
  ];
  const paragraphPath =
    previousItems.length > 0 ? Path.next(listPath) : listPath;

  SlateEditor.withoutNormalizing(editor, () => {
    Transforms.removeNodes(editor, { at: listPath });
    Transforms.insertNodes(editor, replacementNodes as SlateNode[], { at: listPath });
    Transforms.select(editor, SlateEditor.start(editor, paragraphPath));
  });
}

function indentListItem(editor: ListEditor, itemPath: Path) {
  const itemIndex = itemPath.at(-1);

  if (itemIndex === undefined) {
    return false;
  }

  if (itemIndex === 0) {
    return indentFirstListItem(editor, itemPath);
  }

  let indented = false;

  SlateEditor.withoutNormalizing(editor, () => {
    const previousItemPath = Path.previous(itemPath);
    const previousItem = Node.get(editor, previousItemPath);

    if (!Element.isElement(previousItem) || previousItem.type !== "list-item") {
      return;
    }

    const nestedListPath = getOrCreateNestedList(editor, previousItemPath);
    const nestedList = Node.get(editor, nestedListPath);

    if (!isComposerBodyList(nestedList)) {
      return;
    }

    Transforms.moveNodes(editor, {
      at: itemPath,
      to: nestedListPath.concat(nestedList.children.length),
    });
    indented = true;
  });

  return indented;
}

function indentFirstListItem(editor: ListEditor, itemPath: Path) {
  const listPath = Path.parent(itemPath);
  const listIndex = listPath.at(-1);

  if (listIndex === undefined || listIndex === 0) {
    return false;
  }

  const list = Node.get(editor, listPath);

  if (!isComposerBodyList(list)) {
    return false;
  }

  const previousListPath = Path.previous(listPath);
  const previousList = Node.get(editor, previousListPath);

  if (
    !isComposerBodyList(previousList) ||
    previousList.children.length === 0
  ) {
    return false;
  }

  const previousItemPath = previousListPath.concat(
    previousList.children.length - 1
  );
  const previousItem = Node.get(editor, previousItemPath);

  if (
    !Element.isElement(previousItem) ||
    previousItem.type !== "list-item"
  ) {
    return false;
  }

  const nestedListIndex = previousItem.children.findIndex(
    (child): child is ComposerBodyList =>
      isComposerBodyList(child) && child.type === list.type
  );
  const offset = editor.selection?.anchor.offset ?? 0;

  if (nestedListIndex === -1) {
    const targetPath = previousItemPath.concat(previousItem.children.length);

    SlateEditor.withoutNormalizing(editor, () => {
      Transforms.insertNodes(
        editor,
        listElement(list.type, [
          cloneListItem(list.children[0] as ComposerBodyListItem),
        ]),
        { at: targetPath }
      );
      Transforms.removeNodes(editor, { at: itemPath });
      removeListIfEmpty(editor, listPath);
      selectListItemText(editor, targetPath.concat(0), offset);
    });

    return true;
  }

  const nestedListPath = previousItemPath.concat(nestedListIndex);
  const nestedList = Node.get(editor, nestedListPath);

  if (!isComposerBodyList(nestedList)) {
    return false;
  }

  const targetPath = nestedListPath.concat(nestedList.children.length);

  SlateEditor.withoutNormalizing(editor, () => {
    Transforms.insertNodes(
      editor,
      cloneListItem(list.children[0] as ComposerBodyListItem),
      { at: targetPath }
    );
    Transforms.removeNodes(editor, { at: itemPath });
    removeListIfEmpty(editor, listPath);
    selectListItemText(editor, targetPath, offset);
  });

  return true;
}

function getOrCreateNestedList(
  editor: ListEditor,
  itemPath: Path,
  listType = parentListTypeForItem(editor, itemPath)
) {
  const item = Node.get(editor, itemPath);

  if (!Element.isElement(item) || item.type !== "list-item") {
    throw new Error("Expected list item");
  }

  const existingIndex = item.children.findIndex(
    (child) => isComposerBodyList(child) && child.type === listType
  );

  if (existingIndex !== -1) {
    return itemPath.concat(existingIndex);
  }

  const nestedListPath = itemPath.concat(item.children.length);
  Transforms.insertNodes(editor, listElement(listType, []), { at: nestedListPath });

  return nestedListPath;
}

function removeListIfEmpty(editor: ListEditor, listPath: Path) {
  const list = Node.get(editor, listPath);

  if (isComposerBodyList(list) && list.children.length === 0) {
    Transforms.removeNodes(editor, { at: listPath });
  }
}

function hasChildList(editor: ListEditor, itemPath: Path) {
  const item = Node.get(editor, itemPath);

  return (
    Element.isElement(item) &&
    item.type === "list-item" &&
    item.children.some(isComposerBodyList)
  );
}

function itemParagraphPath(
  editor: ListEditor,
  itemPath: Path
): Path | null {
  const item = Node.get(editor, itemPath);

  if (!Element.isElement(item) || item.type !== "list-item") {
    return null;
  }

  const index = item.children.findIndex(
    (child) => Element.isElement(child) && child.type === "paragraph"
  );

  return index === -1 ? null : itemPath.concat(index);
}

function selectListItemText(
  editor: ListEditor,
  itemPath: Path,
  offset: number
) {
  const paragraphPath = itemParagraphPath(editor, itemPath);

  if (!paragraphPath) {
    return;
  }

  const textPath = paragraphPath.concat(0);

  if (!Node.has(editor, textPath)) {
    return;
  }

  const textNode = Node.get(editor, textPath);
  const end = "text" in textNode ? textNode.text.length : 0;
  const point = { path: textPath, offset: Math.min(offset, end) };

  Transforms.select(editor, { anchor: point, focus: point });
}

function emptyParagraph(
  children: ComposerBodyText[] = [{ text: "" }]
): ComposerBodyParagraph {
  return { type: "paragraph", children };
}

function emptyListItem(children?: ComposerBodyText[]): ComposerBodyListItem {
  return { type: "list-item", children: [emptyParagraph(children)] };
}

/** Skeleton for {@link Transforms.wrapNodes}; Slate fills from the wrapped range. */
function emptyListItemForWrap(): ComposerBodyListItem {
  return emptyListItem();
}

function listElement(
  listType: ListType,
  children: ComposerBodyListItem[]
): ComposerBodyList {
  if (listType === "bulleted-list") {
    return { type: "bulleted-list", children };
  }

  if (listType === "numbered-list") {
    return { type: "numbered-list", children };
  }

  return { type: "task-list", children };
}

function appendNestedItems(
  item: ComposerBodyListItem,
  listType: ListType,
  nestedItems: ComposerBodyListItem[]
) {
  if (nestedItems.length === 0) {
    return;
  }

  const nestedList = item.children.find(
    (child): child is ComposerBodyList =>
      isComposerBodyList(child) && child.type === listType
  );

  if (nestedList) {
    nestedList.children.push(...nestedItems);

    return;
  }

  item.children.push(listElement(listType, nestedItems));
}

function cloneListItem(item: ComposerBodyListItem): ComposerBodyListItem {
  return structuredClone(item);
}

function currentListItem(editor: ListEditor) {
  const entry = SlateEditor.above(editor, { match: isComposerBodyListItem });

  if (
    !entry ||
    !Element.isElement(entry[0]) ||
    entry[0].type !== "list-item"
  ) {
    return null;
  }

  return entry;
}

function isTextBlock(editor: ListEditor, node: SlateNode) {
  return (
    Element.isElement(node) &&
    SlateEditor.isBlock(editor, node) &&
    !isComposerBodyList(node) &&
    !isComposerBodyListItem(node)
  );
}

function isComposerBodyListItem(node: SlateNode): node is ComposerBodyListItem {
  return Element.isElement(node) && node.type === "list-item";
}

function isComposerBodyList(node: SlateNode): node is ComposerBodyList {
  return Element.isElement(node) && isListType(node.type);
}

function isParagraphElement(
  node: SlateNode
): node is ComposerBodyParagraph {
  return Element.isElement(node) && node.type === "paragraph";
}

function hasChildNodes(
  node: SlateNode
): node is SlateNode & { children: SlateNode[] } {
  return "children" in node && Array.isArray(node.children);
}

function childListIndexes(item: ComposerBodyListItem) {
  return item.children.reduce<number[]>((indexes, child, index) => {
    if (isComposerBodyList(child)) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function isListType(type: string): type is ListType {
  return listTypes.has(type as ListType);
}

function parentListTypeForItem(editor: ListEditor, itemPath: Path): ListType {
  const list = Node.get(editor, Path.parent(itemPath));

  if (!isComposerBodyList(list)) {
    return "bulleted-list";
  }

  return list.type;
}

function isListItemTextEmpty(editor: ListEditor, itemPath: Path) {
  const paragraphPath = itemParagraphPath(editor, itemPath);

  if (!paragraphPath) {
    return false;
  }

  return Node.string(Node.get(editor, paragraphPath)) === "";
}

function isNestedListItem(editor: ListEditor, itemPath: Path) {
  const listPath = Path.parent(itemPath);
  const parentItemPath = Path.parent(listPath);
  const parentItem = Node.has(editor, parentItemPath)
    ? Node.get(editor, parentItemPath)
    : null;

  return Element.isElement(parentItem) && parentItem.type === "list-item";
}

function splitLeaves(leaves: ComposerBodyText[], offset: number) {
  const before: ComposerBodyText[] = [];
  const after: ComposerBodyText[] = [];
  let remaining = offset;

  for (const leaf of leaves) {
    if (remaining >= leaf.text.length) {
      before.push({ ...leaf });
      remaining -= leaf.text.length;

      continue;
    }

    if (remaining <= 0) {
      after.push({ ...leaf });

      continue;
    }

    before.push({ ...leaf, text: leaf.text.slice(0, remaining) });
    after.push({ ...leaf, text: leaf.text.slice(remaining) });
    remaining = 0;
  }

  return [
    before.length > 0 ? before : [{ text: "" }],
    after.length > 0 ? after : [{ text: "" }],
  ] as const;
}

function adjacentListIndex(children: readonly SlateNode[]) {
  for (let index = 0; index < children.length - 1; index += 1) {
    const child = children[index];
    const nextChild = children[index + 1];

    if (child === undefined || nextChild === undefined) {
      continue;
    }

    if (
      isComposerBodyList(child) &&
      isComposerBodyList(nextChild) &&
      child.type === nextChild.type
    ) {
      return index;
    }
  }

  return -1;
}

function isBlockActive(editor: ListEditor, blockType: ListType) {
  const selection = editor.selection;

  if (!selection) {
    return false;
  }

  const [match] = SlateEditor.nodes(editor, {
    at: selection,
    match: (n) => Element.isElement(n) && n.type === blockType,
  });

  return !!match;
}

function isEmptyListItemForCollapse(item: SlateNode): boolean {
  if (!Element.isElement(item) || item.type !== "list-item") {
    return false;
  }

  const paragraph = item.children.find(
    (child): child is ComposerBodyParagraph =>
      Element.isElement(child) && child.type === "paragraph"
  );

  if (!paragraph) {
    return false;
  }

  // Inlines (mentions, links) contribute no text to `Node.string` but are not "empty".
  if (paragraph.children.some((child) => Element.isElement(child))) {
    return false;
  }

  if (Node.string(paragraph) !== "") {
    return false;
  }

  return !item.children.some(isComposerBodyList);
}

function isComposerListSemanticallyEmpty(list: SlateNode): boolean {
  if (!isComposerBodyList(list) || list.children.length === 0) {
    return false;
  }

  return list.children.every((child) => isEmptyListItemForCollapse(child));
}

/** After a ranged delete, replace a root-only empty list with a plain empty paragraph. */
function collapseRootIfOnlyEmptyList(editor: ListEditor) {
  if (editor.children.length !== 1) {
    return;
  }

  const root = editor.children[0];

  if (!isComposerBodyList(root) || !isComposerListSemanticallyEmpty(root)) {
    return;
  }

  // If there is any visible text left (including a trailing space after a mention), do not
  // strip the list. This avoids collapsing when the mention draft was deleted synchronously
  // before `insertMention` runs (e.g. first item empty, second item "@name" only).
  if (SlateEditor.string(editor, []) !== "") {
    return;
  }

  SlateEditor.withoutNormalizing(editor, () => {
    Transforms.removeNodes(editor, { at: [0] });
    Transforms.insertNodes(editor, emptyParagraph(), { at: [0] });
    Transforms.select(editor, SlateEditor.start(editor, [0]));
  });
}
