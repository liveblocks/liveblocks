import type { NodeEntry, Text } from "slate";
import { Editor, Element, Node, Path, Range, Transforms } from "slate";

import type { ComposerBodyAutoLink } from "../../types";
import { isPlainText, isText } from "../utils/is-text";
import { filterActiveMarks } from "../utils/marks";
import { isComposerBodyCustomLink } from "./custom-links";

/**
 * This implementation is inspired by Lexical's AutoLink plugin.
 * Additional modifications and features were added to adapt it to our specific needs.
 *
 * Original Lexical AutoLink plugin can be found at [Lexical's Github Repository](https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalAutoLinkPlugin.ts)
 */
export function withAutoLinks(editor: Editor): Editor {
  const { isInline, normalizeNode, deleteBackward } = editor;

  editor.isInline = (element) => {
    return element.type === "auto-link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Prevent auto links from being created inside custom links
    if (isComposerBodyCustomLink(node)) {
      return;
    }

    if (isText(node)) {
      const parentNode = Node.parent(editor, path);

      // Prevent auto links from being created inside custom links
      if (isComposerBodyCustomLink(parentNode)) {
        return;
      } else if (isComposerBodyAutoLink(parentNode)) {
        const parentPath = Path.parent(path);
        handleLinkEdit(editor, [parentNode, parentPath]);

        // Prevent rich text within auto links by removing all marks of inner text nodes
        if (!isPlainText(node)) {
          const marks = filterActiveMarks(node);

          Transforms.unsetNodes(editor, marks, { at: path });
        }
      } else {
        handleLinkCreate(editor, [node, path]);
        handleNeighbours(editor, [node, path]);
      }
    }

    normalizeNode(entry);
  };

  editor.deleteBackward = (unit) => {
    deleteBackward(unit);
    const { selection } = editor;
    if (!selection) return;

    if (!Range.isCollapsed(selection)) return;

    const [match] = Editor.nodes(editor, {
      at: selection,
      match: isComposerBodyAutoLink,
      mode: "lowest",
    });

    if (!match) return;

    Transforms.unwrapNodes(editor, {
      match: isComposerBodyAutoLink,
    });
  };

  return editor;
}

export function isComposerBodyAutoLink(
  node: Node
): node is ComposerBodyAutoLink {
  return Element.isElement(node) && node.type === "auto-link";
}

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
const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9().@:%_+~#?&//=]*)/;

const PUNCTUATION_OR_SPACE = /[.,;!?\s()]/;

const PERIOD_OR_QUESTION_MARK_FOLLOWED_BY_ALPHANUMERIC = /^[.?][a-zA-Z0-9]+/;

const PARENTHESES = /[()]/;

/**
 * Helper function to check if a character is a separator (punctuation or space)
 * @param char The character to check
 * @returns Whether the character is a separator or not
 */
function isSeparator(char: string): boolean {
  return PUNCTUATION_OR_SPACE.test(char);
}

/**
 * Helper function to check if a text content ends with a separator (punctuation or space)
 * @param textContent The text content to check
 * @returns Whether the text content ends with a separator or not
 */
function endsWithSeparator(textContent: string): boolean {
  const lastCharacter = textContent[textContent.length - 1];

  return lastCharacter !== undefined ? isSeparator(lastCharacter) : false;
}

/**
 * Helper function to check if a text content starts with a separator (punctuation or space)
 * @param textContent The text content to check
 * @returns Whether the text content starts with a separator or not
 */
function startsWithSeparator(textContent: string): boolean {
  const firstCharacter = textContent[0];

  return firstCharacter !== undefined ? isSeparator(firstCharacter) : false;
}

/**
 * Helper function to check if a text content ends with a period or question mark
 * @param textContent The text content to check
 * @returns Whether the text content ends with a period or not
 */
function endsWithPeriodOrQuestionMark(textContent: string): boolean {
  return (
    textContent[textContent.length - 1] === "." ||
    textContent[textContent.length - 1] === "?"
  );
}

/**
 * Helper function to get the "logical length" of a URL, taking into account things like opening/closing parentheses
 * @param url The URL to check
 * @returns The "logical length" of the URL
 */
function getUrlLogicalLength(url: string): number {
  if (!PARENTHESES.test(url)) {
    return url.length;
  }

  let logicalLength = 0;
  let parenthesesCount = 0;

  for (const character of url) {
    if (character === "(") {
      parenthesesCount++;
    }

    if (character === ")") {
      parenthesesCount--;

      if (parenthesesCount < 0) {
        break;
      }
    }

    logicalLength++;
  }

  return logicalLength;
}

/**
 * Helper function to check if the previous node is valid (text node that ends with a separator or is empty)
 */
function isPreviousNodeValid(editor: Editor, path: Path): boolean {
  const entry = Editor.previous(editor, { at: path });
  if (!entry) return true;

  return (
    isText(entry[0]) &&
    (endsWithSeparator(entry[0].text) || entry[0].text === "")
  );
}

/**
 * Helper function to check if the next node is valid (text node that starts with a separator or is empty)
 */
function isNextNodeValid(editor: Editor, path: Path): boolean {
  const entry = Editor.next(editor, { at: path });
  if (!entry) return true;

  return (
    isText(entry[0]) &&
    (startsWithSeparator(entry[0].text) || entry[0].text === "")
  );
}

/**
 * Helper function to check if the content around a text node is valid.
 * @param editor
 * @param entry
 * @param start
 * @param end
 * @returns
 */
function isContentAroundValid(
  editor: Editor,
  entry: NodeEntry<Text>,
  start: number,
  end: number
): boolean {
  const [node, path] = entry;
  const text = node.text;

  const contentBefore = text[start - 1];
  const contentBeforeIsValid =
    start > 0 && contentBefore
      ? isSeparator(contentBefore)
      : isPreviousNodeValid(editor, path);

  const contentAfter = text[end];
  const contentAfterIsValid =
    end < text.length && contentAfter
      ? isSeparator(contentAfter)
      : isNextNodeValid(editor, path);

  return contentBeforeIsValid && contentAfterIsValid;
}

const handleLinkEdit = (
  editor: Editor,
  entry: NodeEntry<ComposerBodyAutoLink>
) => {
  const [node, path] = entry;

  // Step 1: Ensure that the Link node only contains text nodes as children
  const children = Node.children(editor, path);
  for (const [child] of children) {
    if (isText(child)) continue;
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }
  // Attempt to match the text content (of the Link node) against the URL regex
  const text = Node.string(node);
  const match = URL_REGEX.exec(text);
  const matchContent = match?.[0];

  // Step 2: Ensure that the text content of the Link node matches the URL regex and is identical to the match
  if (!match || matchContent !== text) {
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }

  // Step 3: Ensure that if the text content of the Link node ends with a period, we unwrap the Link node and wrap the text before the period in a new Link node
  if (endsWithPeriodOrQuestionMark(text)) {
    Transforms.unwrapNodes(editor, { at: path });

    const textBeforePeriod = text.slice(0, text.length - 1);

    // Remove the last character from the link text and wrap the remaining text in a new link node
    Transforms.wrapNodes<ComposerBodyAutoLink>(
      editor,
      {
        type: "auto-link",
        url: textBeforePeriod,
        children: [],
      },
      {
        at: {
          anchor: { path, offset: 0 },
          focus: { path, offset: textBeforePeriod.length },
        },
        split: true,
      }
    );
    return;
  }

  // Step 4: Allow some conditions to shorten the URL (e.g. supporting parentheses but only if they are balanced)
  const logicalLength = getUrlLogicalLength(text);

  if (logicalLength < text.length) {
    Transforms.unwrapNodes(editor, { at: path });

    const logicalText = text.slice(0, logicalLength);

    // Keep the "logical" text and wrap it in a new link node
    Transforms.wrapNodes<ComposerBodyAutoLink>(
      editor,
      {
        type: "auto-link",
        url: logicalText,
        children: [],
      },
      {
        at: {
          anchor: { path, offset: 0 },
          focus: { path, offset: logicalText.length },
        },
        split: true,
      }
    );
    return;
  }

  // Step 5: Ensure that the text content of the Link node is surrounded by separators or the start/end of the text content
  if (!isPreviousNodeValid(editor, path) || !isNextNodeValid(editor, path)) {
    Transforms.unwrapNodes(editor, { at: path });
    return;
  }

  // Step 6: Ensure that the url attribute of the Link node is identical to its text content
  if (node.url !== text) {
    Transforms.setNodes(editor, { url: matchContent }, { at: path });
    return;
  }
};

const handleLinkCreate = (editor: Editor, entry: NodeEntry<Text>) => {
  const [node, path] = entry;

  // Step 1: Ensure that the text content of the node matches the URL regex
  const match = URL_REGEX.exec(node.text);
  const matchContent = match?.[0];

  if (!match || matchContent === undefined) {
    return;
  }

  const start = match.index;
  const end = start + matchContent.length;

  // Step 2: Ensure that the content around the node is valid
  if (!isContentAroundValid(editor, entry, start, end)) return;

  Transforms.wrapNodes<ComposerBodyAutoLink>(
    editor,
    {
      type: "auto-link",
      url: matchContent,
      children: [],
    },
    {
      at: {
        anchor: { path, offset: start },
        focus: { path, offset: end },
      },
      split: true,
    }
  );
  return;
};

const handleNeighbours = (editor: Editor, entry: NodeEntry<Text>) => {
  const [node, path] = entry;
  const text = node.text;

  const previousSibling = Editor.previous(editor, { at: path });

  if (previousSibling && isComposerBodyAutoLink(previousSibling[0])) {
    if (PERIOD_OR_QUESTION_MARK_FOLLOWED_BY_ALPHANUMERIC.test(text)) {
      Transforms.unwrapNodes(editor, { at: previousSibling[1] });
      Transforms.mergeNodes(editor, { at: path });
      return;
    }

    if (!startsWithSeparator(text)) {
      Transforms.unwrapNodes(editor, { at: previousSibling[1] });
      return;
    }
  }

  const nextSibling = Editor.next(editor, { at: path });
  if (
    nextSibling &&
    isComposerBodyAutoLink(nextSibling[0]) &&
    !endsWithSeparator(text)
  ) {
    Transforms.unwrapNodes(editor, { at: nextSibling[1] });
    return;
  }
};
