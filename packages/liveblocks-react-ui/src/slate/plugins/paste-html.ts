import type { Descendant, Editor, Element, Node as SlateNode } from "slate";
import { Transforms } from "slate";
import { jsx } from "slate-hyperscript";

import type {
  ComposerBodyBlockElement,
  ComposerBodyCustomLink,
  ComposerBodyInlineElement,
  ComposerBodyParagraph,
  ComposerBodyText,
} from "../../types";

// Based on: https://github.com/ianstormtaylor/slate/blob/main/site/examples/paste-html.tsx

type OmitTextChildren<T> = Omit<T, "text" | "children">;

type ComposerBodyElementTag = OmitTextChildren<
  ComposerBodyBlockElement | ComposerBodyInlineElement
>;
type ComposerBodyTextTag = OmitTextChildren<ComposerBodyText>;

type DeserializedNode =
  | string
  | null
  | Element
  | Descendant[]
  | ComposerBodyText[]
  | DeserializedNode[];

const ELEMENT_TAGS = {
  A: (element): OmitTextChildren<ComposerBodyCustomLink> => ({
    type: "custom-link",
    url: element.getAttribute("href") ?? "",
  }),
  P: (): OmitTextChildren<ComposerBodyParagraph> => ({ type: "paragraph" }),
} as Record<string, (node: HTMLElement) => ComposerBodyElementTag>;

const TEXT_TAGS = {
  CODE: (): ComposerBodyTextTag => ({ code: true }),
  DEL: (): ComposerBodyTextTag => ({ strikethrough: true }),
  EM: (): ComposerBodyTextTag => ({ italic: true }),
  I: (): ComposerBodyTextTag => ({ italic: true }),
  S: (): ComposerBodyTextTag => ({ strikethrough: true }),
  STRONG: (): ComposerBodyTextTag => ({ bold: true }),
  // `B` is omitted because Google Docs uses `<b>` in weird ways
  // B: (): ComposerBodyTextTag => ({ bold: true }),
} as Record<string, (node: HTMLElement) => ComposerBodyTextTag>;

function deserialize(node: Node): DeserializedNode {
  if (node.nodeType === 3) {
    return node.textContent;
  } else if (node.nodeType !== 1) {
    return null;
  } else if (node.nodeName === "BR") {
    return "\n";
  }

  const childNodes = Array.from(node.childNodes);
  let children = childNodes.map(deserialize).flat();

  if (children.length === 0) {
    children = [{ text: "" }];
  }

  if (node.nodeName === "BODY") {
    return jsx("fragment", {}, children);
  }

  if (ELEMENT_TAGS[node.nodeName]) {
    const attrs = ELEMENT_TAGS[node.nodeName](node as HTMLElement);

    return jsx("element", attrs, children);
  }

  if (TEXT_TAGS[node.nodeName]) {
    const attrs = TEXT_TAGS[node.nodeName](node as HTMLElement);

    return children.map((child) => jsx("text", attrs, child));
  }

  return children as DeserializedNode;
}

export function withPasteHtml(editor: Editor) {
  const { insertData } = editor;

  // Deserialize rich text from HTML when pasting
  editor.insertData = (data) => {
    const html = data.getData("text/html");

    if (html) {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const fragment = deserialize(parsed.body);

      if (fragment !== null && Array.isArray(fragment)) {
        Transforms.insertFragment(editor, fragment as SlateNode[]);

        return;
      }
    }

    insertData(data);
  };

  return editor;
}
