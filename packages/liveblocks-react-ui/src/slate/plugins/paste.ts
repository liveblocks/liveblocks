import type { Descendant, Editor, Node as SlateNode } from "slate";
import { Range as SlateRange, Transforms } from "slate";
import { jsx } from "slate-hyperscript";

import type {
  ComposerBodyBlockElement,
  ComposerBodyInlineElement,
  ComposerBodyLink,
  ComposerBodyParagraph,
  ComposerBodyText,
} from "../../types";
import { getFiles } from "../../utils/data-transfer";
import { isPlainText, isText } from "../utils/is-text";
import { selectionContainsInlines } from "../utils/selection-contains-inlines";
import { isUrl, URL_REGEX_GLOBAL } from "./links";

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

const createParagraphElement = (): OmitTextChildren<ComposerBodyParagraph> => ({
  type: "paragraph",
});

const ELEMENT_TAGS = {
  A: (element): OmitTextChildren<ComposerBodyLink> => {
    const href = element.getAttribute("href");

    return {
      type: "link",
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
    const { selection } = editor;
    const plainText = data.getData("text/plain");

    // 1. If there are files, create attachments from them
    if (data.types.includes("Files") && pasteFilesAsAttachments) {
      const files = getFiles(data);

      if (files.length > 0) {
        createAttachments(files);

        return;
      }
    }

    // 2. If a URL is being pasted on a plain text selection, create a link with the selection
    if (selection && !SlateRange.isCollapsed(selection)) {
      // Check if the selection is contained in a single block
      if (selection.anchor.path[0] === selection.focus.path[0]) {
        // Check if the pasted text is a valid URL
        if (isUrl(plainText)) {
          // Check if the selection only contains (rich and/or plain) text nodes
          if (!selectionContainsInlines(editor, (node) => !isText(node))) {
            // If all conditions are met, wrap the selected nodes in a link
            Transforms.wrapNodes<ComposerBodyLink>(
              editor,
              {
                type: "link",
                url: plainText,
                children: [],
              },
              {
                at: selection,
                split: true,
                match: isPlainText,
              }
            );

            return;
          }
        }
      }
    }

    // 3. If there's Slate data, immediately let Slate handle it
    if (data.types.includes("application/x-slate-fragment")) {
      insertData(data);

      return;
    }

    // 4. If there's HTML, deserialize rich text from it
    if (data.types.includes("text/html")) {
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
        // Go back to the list of conditions if something went wrong
      }
    }

    // 5. If the pasted plain text contains URLs, create links for them
    if (plainText.match(URL_REGEX_GLOBAL)) {
      try {
        // Split lines into paragraphs
        const paragraphs = plainText.split(/\r\n|\r|\n/);

        const nodes: ComposerBodyParagraph[] = paragraphs.map((paragraph) => {
          // Find all URLs and their positions in the paragraph
          const matches = [...paragraph.matchAll(URL_REGEX_GLOBAL)];
          const children: ComposerBodyInlineElement[] = [];
          let lastIndex = 0;

          // Interleave text and link nodes
          for (const match of matches) {
            const url = match[0]!;
            const startIndex = match.index!;

            // Add the text before the URL (if any)
            if (startIndex > lastIndex) {
              children.push({
                text: paragraph.slice(lastIndex, startIndex),
              });
            }

            // Add the URL as a link
            children.push({
              type: "link",
              url,
              children: [{ text: url }],
            });

            lastIndex = startIndex + url.length;
          }

          // Add the remaining text after the last URL (if any)
          if (lastIndex < paragraph.length) {
            children.push({
              text: paragraph.slice(lastIndex),
            });
          }

          // If no URLs were found, create a plain text node
          if (children.length === 0) {
            children.push({ text: paragraph });
          }

          return {
            type: "paragraph",
            children,
          };
        });

        // If there's a range selection, delete its content before inserting the new nodes
        if (selection && !SlateRange.isCollapsed(selection)) {
          Transforms.delete(editor, { at: selection });
        }

        // Insert the new nodes
        Transforms.insertFragment(editor, nodes);

        return;
      } catch {
        // Go back to the list of conditions if something went wrong
      }
    }

    // 6. If none of the conditions were met, we let Slate decide what to do
    insertData(data);
  };

  return editor;
}
