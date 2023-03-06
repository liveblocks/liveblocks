import { nanoid } from "nanoid";
import { Editor, Element, Transforms } from "slate";
import { ElementWithId } from "../types";

export const makeNodeId = () => nanoid(16);

export function isElementWithId(v: unknown): v is ElementWithId {
  return (
    Element.isElement(v) && typeof (v as Partial<ElementWithId>).id === "string"
  );
}

export function withElementIds<T extends Editor>(editor: T): T {
  const { apply } = editor;

  const { normalizeNode } = editor;
  editor.normalizeNode = ([node, path]) => {
    if (path.length !== 0) {
      return normalizeNode([node, path]);
    }

    let seenIds = new Set<string>();
    let normalized = false;
    for (let i = 0; i < editor.children.length; i++) {
      const element = editor.children[i];
      if (isElementWithId(element) && !seenIds.has(element.id)) {
        seenIds.add(element.id);
        continue;
      }

      const newId = makeNodeId();
      Transforms.setNodes(editor, { id: newId }, { at: [i] });
      normalized = true;
      seenIds.add(newId);
      continue;
    }

    if (!normalized) {
      return normalizeNode([node, path]);
    }
  };

  editor.apply = (op) => {
    if (op.type === "insert_node" && op.path.length === 1) {
      return apply(op);
    }

    if (op.type === "split_node" && op.path.length === 1) {
      (op.properties as any).id = makeNodeId();
      return apply(op);
    }

    return apply(op);
  };

  return editor;
}
