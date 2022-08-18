import { nanoid } from "nanoid";
import { Editor, Element, Operation, Path, Transforms } from "slate";
import { BlockType, Format, TitleElement, Theme } from "./types";

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
    // Make sure the document always contains a title
    if (path.length === 0) {
      insertTitleIfMissing(editor);
      transformBlockToTitleIfNecessary(editor);
      removeTitleStyling(editor);
    }

    return normalizeNode([node, path]);
  };

  return editor;
}

function insertTitleIfMissing(editor: Editor) {
  if (editor.children.length < 1) {
    const title: TitleElement = {
      id: nanoid(),
      type: BlockType.Title,
      children: [{ text: "Untitled" }],
    };
    Transforms.insertNodes(editor, title, { at: [0] });
  }
}

function transformBlockToTitleIfNecessary(editor: Editor) {
  const firstChild = editor.children[0];

  if (Element.isElement(firstChild) && firstChild.type !== BlockType.Title) {
    Transforms.setNodes(
      editor,
      {
        type: BlockType.Title,
      },
      {
        at: [0],
      }
    );
  }
}

function removeTitleStyling(editor: Editor) {
  const title = editor.children[0];

  if (Element.isElement(title) && title.type === BlockType.Title) {
    if (title.children.length > 1) {
      debugger;

      const string = Editor.string(editor, [0]);

      for (let i = title.children.length - 1; i >= 0; i--) {
        editor.apply({
          type: "remove_node",
          node: title.children[i],
          path: [0, i],
        });
      }

      editor.apply({
        type: "insert_node",
        path: [0, 0],
        node: { text: string },
      });
    }

    const leaf = title.children[0];
    const marksToRemove = (
      ["underline", "italic", "bold", "strikeThrough"] as Format[]
    ).filter((mark) => leaf[mark]);

    if (marksToRemove.length > 0) {
      Transforms.unsetNodes(editor, marksToRemove, { at: [0, 0] });
    }
  }
}

export function applyTheme(theme: Theme) {
  const htmlElement = document.querySelector("html");
  if (!htmlElement) {
    return;
  }

  htmlElement.className = `theme-${theme}`;
}

type CursorType =
  | "grab"
  | "grabbing";

 export function setGlobalCursor(type: CursorType) {
   document.body.classList.add(type);
 }

 export function removeGlobalCursor(type: CursorType) {
   document.body.classList.remove(type);
 }
