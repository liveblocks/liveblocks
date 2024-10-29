import {
  Editor as SlateEditor,
  Element as SlateElement,
  Node as SlateNode,
  Path as SlatePath,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyList, ComposerBodyListItem } from "../../types";
import { isEmpty } from "../utils/is-empty";
import { isSelectionCollapsed } from "../utils/is-selection-collapsed";

export function isList(node: SlateNode): node is ComposerBodyList {
  return (
    SlateElement.isElement(node) &&
    (node.type === "unordered-list" || node.type === "ordered-list")
  );
}

export function isListItem(node: SlateNode): node is ComposerBodyListItem {
  return SlateElement.isElement(node) && node.type === "list-item";
}

export function withLists<T extends SlateEditor>(editor: T): T {
  const { isBlock, deleteBackward, normalizeNode, insertBreak } = editor;

  editor.isBlock = (element) => {
    return isList(element) || isListItem(element) || isBlock(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // TODO: This doesn't work
    // Merge adjacent lists of the same type
    if (isList(node)) {
      const [previousNode, previousPath] =
        SlateEditor.previous(editor, {
          at: path,
          match: isList,
        }) ?? [];

      if (previousNode && previousPath && previousNode.type === node.type) {
        console.log(node, previousNode);
        SlateTransforms.mergeNodes(editor, { at: previousPath });
        return;
      }
    }

    // TODO: List items should only contain paragraphs or nested lists

    normalizeNode(entry);
  };

  editor.deleteBackward = (unit) => {
    const { selection } = editor;

    if (
      selection &&
      SlateEditor.isStart(editor, selection.anchor, selection.anchor.path)
    ) {
      const [listItem] = SlateEditor.nodes(editor, {
        match: isListItem,
        mode: "lowest",
      });

      if (listItem) {
        const [, listItemPath] = listItem;
        const parentPath = SlatePath.parent(listItemPath);
        const parent = SlateNode.get(editor, parentPath);

        if (isList(parent)) {
          // Delete the list if it only has one list item
          if (parent.children.length === 1) {
            SlateTransforms.unwrapNodes(editor, {
              match: isListItem,
              split: true,
            });
            SlateTransforms.unwrapNodes(editor, {
              match: isList,
              split: true,
            });
          } else {
            // Delete the list item and move the cursor to the end of the list
            SlateTransforms.delete(editor, {
              at: listItemPath,
            });
            SlateTransforms.select(editor, SlateEditor.end(editor, parentPath));
          }

          return;
        }
      }
    }

    deleteBackward(unit);
  };

  editor.insertBreak = () => {
    const { selection } = editor;

    if (selection && isSelectionCollapsed(selection)) {
      const [listItem] = SlateEditor.nodes(editor, {
        match: isListItem,
        mode: "lowest",
      });

      if (listItem) {
        // Get the current list item's path
        const [, listItemPath] = listItem;

        // Insert a new list item with a paragraph after the current one
        SlateTransforms.insertNodes(
          editor,
          {
            type: "list-item",
            children: [{ type: "paragraph", children: [{ text: "" }] }],
          },
          { at: SlatePath.next(listItemPath), select: true }
        );
      }

      return;
    }

    insertBreak();
  };

  return editor;
}
