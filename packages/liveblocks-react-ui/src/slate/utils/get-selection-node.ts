import { Editor, Element } from "slate";

import type {
  ComposerBodyBlockElement,
  ComposerBodyInlineNonTextElement,
} from "../../types";

export function getSelectionInline(
  editor: Editor
): ComposerBodyInlineNonTextElement | undefined {
  const { selection } = editor;

  if (!selection) {
    return;
  }

  // Get the node at the current selection
  const [node] = Editor.node(editor, selection);

  // If the node itself is an inline element, return it
  if (Element.isElement(node) && editor.isInline(node)) {
    return node as ComposerBodyInlineNonTextElement;
  }

  // Otherwise, check if we're inside an inline node
  const inlineEntries = Array.from(
    Editor.nodes(editor, {
      at: selection,
      match: (n) => Element.isElement(n) && editor.isInline(n),
      mode: "lowest",
    })
  );

  // If there are multiple inlines in the current selection, bail out
  if (inlineEntries.length > 1) {
    return;
  }

  return inlineEntries[0]?.[0] as ComposerBodyInlineNonTextElement | undefined;
}

export function getSelectionBlock(
  editor: Editor
): ComposerBodyBlockElement | undefined {
  const { selection } = editor;

  if (!selection) {
    return;
  }

  // Check if the selection spans across multiple blocks
  const blockEntries = Array.from(
    Editor.nodes(editor, {
      at: selection,
      match: (n) => Element.isElement(n) && editor.isBlock(n),
      mode: "all",
    })
  );

  // If the selection spans across multiple blocks, return undefined
  if (blockEntries.length > 1) {
    return;
  }

  // If the node itself is a block element, return it
  const [node] = Editor.node(editor, selection);

  if (Element.isElement(node) && editor.isBlock(node)) {
    return node as ComposerBodyBlockElement;
  }

  // Otherwise, check if we're inside a block node
  const [blockEntry] = Editor.nodes(editor, {
    at: selection,
    match: (n) => Element.isElement(n) && editor.isBlock(n),
    mode: "lowest",
  });

  return blockEntry?.[0] as ComposerBodyBlockElement | undefined;
}
