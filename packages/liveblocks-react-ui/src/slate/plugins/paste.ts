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
  // `B` is omitted because Google Docs uses `<b>` in weird ways
  // B: (): ComposerBodyTextTag => ({ bold: true }),
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

function normalize(html: string) {
  // WebKit browsers can add a trailing <br>
  html = html.replace(/<br class="?Apple-interchange-newline"?>/gi, "");

  return html;
}

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

  // Lists aren't supported (yet), so we flatten them into paragraphs
  if (node.nodeName === "UL" || node.nodeName === "OL") {
    const listItems = flattenListItems(node as HTMLElement);

    children = listItems.map((li) => deserialize(li)).flat();
  }

  if (children.length === 0) {
    children = [{ text: "" }];
  }

  if (node.nodeName === "BODY") {
    return jsx("fragment", {}, children);
  }

  if (ELEMENT_TAGS[node.nodeName]) {
    const attrs = ELEMENT_TAGS[node.nodeName]!(node as HTMLElement);

    return jsx("element", attrs, children);
  }

  if (TEXT_TAGS[node.nodeName]) {
    const attrs = TEXT_TAGS[node.nodeName]!(node as HTMLElement);

    return children.map((child) => jsx("text", attrs, child));
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

    // Deserialize rich text from HTML when pasting
    if (data.types.includes("text/html")) {
      const html = normalize(data.getData("text/html"));
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
