import { nanoid } from "nanoid";
import { Editor, Element, Node, Operation, Path, Transforms } from "slate";
import { BlockType, CustomElement, Format, HeadingElement, ParagraphElement } from "./types";

export function toPx(value: number | undefined): string | undefined {
  return value ? `${Math.round(value)}px` : undefined;
}

export const makeNodeId = () => nanoid(16);

// TODO: Only generate ids for top level nodes
export const withNodeId = (editor: Editor) => {
  const { apply } = editor;

  editor.apply = (operation: Operation) => {
    if (operation.type === "insert_node") {
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

      if (editor.children.length < 2) {
        const paragraph: ParagraphElement = {
          id: nanoid(),
          type: BlockType.Paragraph,
          children: [{ text: "" }],
        };
        Transforms.insertNodes(editor, paragraph, { at: path.concat(1) });
      }

      for (const [child, childPath] of Node.children(editor, path)) {
        let type: BlockType.H1 | BlockType.Paragraph;
        const slateIndex = childPath[0];
        const enforceType = (type: BlockType.H1 | BlockType.Paragraph) => {
          if (Element.isElement(child) && child.type !== type) {
            const newProperties: Partial<CustomElement> = { type };
            Transforms.setNodes(editor, newProperties, {
              at: childPath,
            });
          }
        };

        switch (slateIndex) {
          case 0:
            type = BlockType.H1;
            enforceType(type);
            break;
          case 1:
            type = BlockType.Paragraph;
            enforceType(type);
          default:
            break;
        }
      }
    }

    return normalizeNode([node, path]);
  };

  return editor;
}
