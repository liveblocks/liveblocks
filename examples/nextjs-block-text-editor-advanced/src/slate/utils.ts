import { nanoid } from "nanoid";
import { Editor, Operation, Element, Node } from "slate";
import { Format } from "./types";

export function toPx(value: number | undefined): string | undefined {
  return value ? `${Math.round(value)}px` : undefined;
}

export const makeNodeId = () => nanoid(16);

// TODO: Remove recursivity
export const withNodeId = (editor: Editor) => {
  const { apply } = editor;

  editor.apply = (operation: Operation) => {
    if (operation.type === "insert_node") {
      assignIdRecursively(operation.node);
      return apply(operation);
    }

    if (operation.type === "split_node") {
      (operation.properties as any).id = makeNodeId();
      return apply(operation);
    }

    return apply(operation);
  };

  return editor;
};

export const assignIdRecursively = (node: Node) => {
  if (Element.isElement(node)) {
    node.id = makeNodeId();
    node.children.forEach(assignIdRecursively);
  }
};

export function toggleMark(editor: Editor, format: Format) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

export function isMarkActive(editor: Editor, format: Format) {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}
