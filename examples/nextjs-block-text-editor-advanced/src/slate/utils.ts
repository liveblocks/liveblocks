import { nanoid } from "nanoid";
import { Editor, Element, Node, Operation, Path, Transforms } from "slate";
import {
  BlockType,
  CustomElement,
  Format,
  HeadingElement,
  ParagraphElement,
} from "./types";

export function toPx(value: number | undefined): string | undefined {
  return value ? `${Math.round(value)}px` : undefined;
}

export const makeNodeId = () => nanoid(16);

export const withNodeId = (editor: Editor) => {
  const { apply } = editor;

  editor.apply = (operation: Operation) => {
    if (operation.type === "insert_node" && operation.path.length === 1) {
      return apply(operation);
    }

    if (operation.type === "split_node" && operation.path.length === 1) {
      (operation.properties as any).id = makeNodeId();
      return apply(operation);
    }

    return apply(operation);
  };

  return editor;
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

export function topLevelPath(path: Path): Path {
  return [path[0]];
}

export function withLayout(editor: Editor) {
  const { normalizeNode } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      if (editor.children.length < 1) {
        const title: HeadingElement = {
          id: nanoid(),
          type: BlockType.H1,
          children: [{ text: "Untitled" }],
        };
        Transforms.insertNodes(editor, title, { at: path.concat(0) });
      }

      for (const [child, childPath] of Node.children(editor, path)) {
        const slateIndex = childPath[0];

        if (
          slateIndex === 0 &&
          Element.isElement(child) &&
          child.type !== BlockType.H1
        ) {
          Transforms.setNodes(
            editor,
            {
              type: BlockType.H1,
            },
            {
              at: childPath,
            }
          );
        }
      }
    }

    return normalizeNode([node, path]);
  };

  return editor;
}
