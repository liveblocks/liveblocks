import type { Descendant, Editor, Node as SlateNode } from "slate";
import { Transforms } from "slate";
import { jsx } from "slate-hyperscript";

import type {
  ComposerBodyAutoLink,
  ComposerBodyBlockElement,
  ComposerBodyCustomLink,
  ComposerBodyInlineElement,
  ComposerBodyParagraph,
  ComposerBodyText,
} from "../../types";
import { getFiles } from "../../utils/data-transfer";

// Based on: https://github.com/ianstormtaylor/slate/blob/main/site/examples/paste-html.tsx

type OmitTextChildren<T> = Omit<T, "text" | "children">;

type ComposerBodyElementTag = OmitTextChildren<
  ComposerBodyBlockElement | ComposerBodyInlineElement
>;
type ComposerBodyTextTag = OmitTextChildren<ComposerBodyText>;

type DeserializedNode =
  | null
  | string
  | Descendant
  | Descendant[]
  | DeserializedNode[];

function areUrlsEqual(a: string, b: string) {
  try {
    const urlA = new URL(a);
    const urlB = new URL(b);

    return urlA.origin === urlB.origin && urlA.pathname === urlB.pathname;
  } catch {
    return false;
  }
}

const createParagraphElement = (): OmitTextChildren<ComposerBodyParagraph> => ({
  type: "paragraph",
});

const ELEMENT_TAGS = {
  A: (
    element
  ): OmitTextChildren<ComposerBodyCustomLink | ComposerBodyAutoLink> => {
    const href = element.getAttribute("href");
    const innerText = element.innerText;

    return {
      type: href && areUrlsEqual(href, innerText) ? "auto-link" : "custom-link",
      url: href ?? "",
    };
  },
  P: createParagraphElement,
  // Falling back to paragraphs for unsupported elements
  BLOCKQUOTE: createParagraphElement,
  H1: createParagraphElement,
  H2: createParagraphElement,
  H3: createParagraphElement,
  H4: createParagraphElement,
  H5: createParagraphElement,
  H6: createParagraphElement,
  LI: createParagraphElement,
} as Record<string, (node: HTMLElement) => ComposerBodyElementTag>;

const TEXT_TAGS = {
  CODE: (): ComposerBodyTextTag => ({ code: true }),
  DEL: (): ComposerBodyTextTag => ({ strikethrough: true }),
  EM: (): ComposerBodyTextTag => ({ italic: true }),
  I: (): ComposerBodyTextTag => ({ italic: true }),
  S: (): ComposerBodyTextTag => ({ strikethrough: true }),
  STRONG: (): ComposerBodyTextTag => ({ bold: true }),
  B: (): ComposerBodyTextTag => ({ bold: true }),
} as Record<string, (node: HTMLElement) => ComposerBodyTextTag>;

function flattenListItems(node: HTMLElement): HTMLElement[] {
  const listItems: HTMLElement[] = [];

  if (node.nodeName === "LI") {
    listItems.push(node);
  }

  node.childNodes.forEach((child) => {
    if (child.nodeType === 1) {
      listItems.push(...flattenListItems(child as HTMLElement));
    }
  });

  return listItems;
}

function jsxTextChildren(
  children: DeserializedNode[],
  attrs?: ComposerBodyTextTag
) {
  return children.map((child) => jsx("text", attrs, child));
}

function deserialize(node: Node): DeserializedNode {
  if (node.nodeType === 3) {
    return node.textContent;
  } else if (node.nodeType !== 1) {
    return null;
  } else if (node.nodeName === "BR") {
    // Insert a new paragraph
    return jsx("element", createParagraphElement(), []);
  }

  const childNodes = Array.from(node.childNodes);
  let children = childNodes.map(deserialize).flat();

  // Lists aren't supported (yet), so we flatten them into paragraphs
  if (node.nodeName === "UL" || node.nodeName === "OL") {
    const listItems = flattenListItems(node as HTMLElement);

    children = listItems.map((li) => deserialize(li)).flat();
  }

  if (children.length === 0) {
    children = [{ text: "" }];
  }

  if (node.nodeName === "BODY") {
    // If the body only contains text nodes, we wrap it in a paragraph
    if (
      children.length > 0 &&
      children.every((child) => typeof child === "string")
    ) {
      children = [
        { type: "paragraph", children: [{ text: children.join("") }] },
      ];
    }

    return jsx(
      "fragment",
      {},
      children.filter((child) => typeof child !== "string")
    );
  }

  if (ELEMENT_TAGS[node.nodeName]) {
    const attrs = ELEMENT_TAGS[node.nodeName]!(node as HTMLElement);

    return jsx("element", attrs, children);
  }

  if (TEXT_TAGS[node.nodeName]) {
    const attrs = TEXT_TAGS[node.nodeName]!(node as HTMLElement);

    // If there is at least one non-text child, we skip this node
    if (
      children.some(
        (child) => child && typeof child !== "string" && "type" in child
      )
    ) {
      return jsx("fragment", {}, children);
    }

    return jsxTextChildren(children, attrs);
  }

  // Guess inline marks based on styles
  if (node.nodeName === "SPAN") {
    const style = (node as HTMLElement).style;
    const attrs: ComposerBodyTextTag = {};

    if (
      style.fontWeight === "bold" ||
      style.fontWeight === "700" ||
      style.fontWeight === "800" ||
      style.fontWeight === "900"
    ) {
      attrs.bold = true;
    }

    if (style.fontStyle === "italic") {
      attrs.italic = true;
    }

    if (style.textDecoration === "line-through") {
      attrs.strikethrough = true;
    }

    return jsxTextChildren(children, attrs);
  }

  return children as DeserializedNode;
}

export function withPaste(
  editor: Editor,
  {
    createAttachments,
    pasteFilesAsAttachments,
  }: {
    createAttachments: (files: File[]) => void;
    pasteFilesAsAttachments?: boolean;
  }
) {
  const { insertData } = editor;

  editor.insertData = (data) => {
    // Create attachments from files when pasting
    if (data.types.includes("Files") && pasteFilesAsAttachments) {
      const files = getFiles(data);

      if (files.length > 0) {
        createAttachments(files);

        return;
      }
    }

    // Deserialize rich text from HTML when pasting (unless there's also Slate data)
    if (
      data.types.includes("text/html") &&
      !data.types.includes("application/x-slate-fragment")
    ) {
      const html = data.getData("text/html");

      try {
        const { body } = new DOMParser().parseFromString(html, "text/html");

        // WebKit browsers can add a trailing `<br>`
        body.querySelector("br.Apple-interchange-newline")?.remove();

        // Google Docs can use `<b>` as a wrapper for the entire document,
        // it shouldn't be supported so we remove it
        if (body.children.length === 1 && body.children[0]?.nodeName === "B") {
          const wrapper = body.children[0] as HTMLElement;

          while (wrapper.firstChild) {
            body.insertBefore(wrapper.firstChild, wrapper);
          }

          body.removeChild(wrapper);
        }

        const fragment = deserialize(body);

        if (fragment !== null && Array.isArray(fragment)) {
          Transforms.insertFragment(editor, fragment as SlateNode[]);

          return;
        }
      } catch {
        // Fallback to default `insertData` behavior
      }
    }

    // Default `insertData` behavior
    insertData(data);
  };

  return editor;
}
