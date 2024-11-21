import {
  Editor,
  Element as SlateElement,
  Node as SlateNode,
  Range as SlateRange,
  Transforms,
} from "slate";

import type { ComposerBodyLink } from "../../types";
import { getMatchRange } from "../utils/get-match-range";
import { isPlainText, isText } from "../utils/is-text";
import { filterActiveMarks } from "../utils/marks";

/**
 * 1. ((https?:\/\/(www\.)?)|(www\.))
 * - Matches 'http://' or 'https://' optionally followed by 'www.', or just 'www.'
 *
 * 2. [-a-zA-Z0-9@:%._+~#=]{1,256}
 * - Matches any character in the set [-a-zA-Z0-9@:%._+~#=] between 1 and 256 times, often found in the domain and subdomain part of the URL
 *
 * 3. \.[a-zA-Z0-9()]{1,6}
 * - Matches a period followed by any character in the set [a-zA-Z0-9()] between 1 and 6 times, usually indicating the domain extension like .com, .org, etc.
 *
 * 4. \b
 * - Represents a word boundary, ensuring that the characters following cannot be part of a different word
 *
 * 5. ([-a-zA-Z0-9().@:%_+~#?&//=]*)
 * - Matches any character in the set [-a-zA-Z0-9().@:%_+~#?&//=] between 0 and unlimited times, often found in the path, query parameters, or anchor part of the URL
 *
 * Matching URLs:
 * - http://www.example.com
 * - https://www.example.com
 * - www.example.com
 * - https://example.com/path?query=param#anchor
 *
 * Non-Matching URLs:
 * - http:/example.com (malformed scheme)
 * - example (missing scheme and domain extension)
 * - ftp://example.com (ftp scheme is not supported)
 * - example.com (missing scheme)
 */
export const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9().@:%_+~#?&//=]*)/g;
export const URL_REGEX_GLOBAL = new RegExp(URL_REGEX, "g");

export function isUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export function withLinks(editor: Editor): Editor {
  const { isInline, normalizeNode, insertText } = editor;

  editor.isInline = (element) => {
    return element.type === "link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Prevent rich text within links by removing all marks of inner text nodes
    if (isText(node)) {
      const parentNode = SlateNode.parent(editor, path);

      if (isComposerBodyLink(parentNode)) {
        if (!isPlainText(node)) {
          const marks = filterActiveMarks(node);

          Transforms.unsetNodes(editor, marks, { at: path });
        }
      }
    }

    // Prevent nested or empty links
    if (isComposerBodyLink(node)) {
      if (
        node.children.length === 0 ||
        (node.children.length === 1 && node.children[0]?.text === "")
      ) {
        Transforms.removeNodes(editor, { at: path });
      }
    }

    normalizeNode(entry);
  };

  editor.insertText = (text, options) => {
    const { selection } = editor;

    // Create links when typing a space following a URL
    if (selection && SlateRange.isCollapsed(selection) && text === " ") {
      const before = getMatchRange(editor, selection);
      const beforeText = before && Editor.string(editor, before);

      if (beforeText && isUrl(beforeText)) {
        // Delete the plain text URL and replace it with a link element
        Transforms.delete(editor, { at: before });
        Transforms.insertFragment(editor, [
          {
            type: "link",
            url: beforeText,
            children: [{ text: beforeText }],
          },
          {
            text: "",
          },
        ]);
      }
    }

    insertText(text, options);
  };

  return editor;
}

export function isComposerBodyLink(node: SlateNode): node is ComposerBodyLink {
  return SlateElement.isElement(node) && node.type === "link";
}
