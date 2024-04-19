import { Editor, Mark, Node } from "@tiptap/react";
import { useCallback, useEffect } from "react";

// Remove a comment highlight from `data-highlight-id`
export function removeCommentHighlight(
  editor: Editor,
  highlightId: string
): boolean {
  let result = false;

  // Iterate over each mark in the text node and find a match
  editor.state.doc.descendants((node, pos: number) => {
    if (node.isText) {
      node.marks.forEach((mark) => {
        const dataId: string | undefined = mark.attrs.highlightId;

        if (dataId === highlightId && node.text) {
          const from = pos;
          const to = pos + node.text.length;

          // Create and dispatch a transaction to remove the mark
          const transaction = editor.state.tr.removeMark(from, to, mark.type);
          editor.view.dispatch(transaction);
          result = true;
        }
      });
    }
  });

  return result;
}

// Get the mark and node of a comment highlight from `data-highlight-id`
export function getCommentHighlight(
  editor: Editor,
  highlightId: string
): null | { mark: Mark; node: Node } {
  let result = null;

  // Iterate over each mark in the text node and find a matching mark
  editor.state.doc.descendants((node /* , pos: number */) => {
    if (node.isText) {
      node.marks.forEach((mark) => {
        const dataId: string | undefined = mark.attrs.highlightId;

        if (dataId === highlightId) {
          result = { mark, node };
        }
      });
    }
  });

  return result;
}

export function getCommentHighlightContent(highlightId: string) {
  const elem = document.querySelector(
    `mark[data-highlight-id="${highlightId}"]`
  );

  if (!elem) {
    return null;
  }

  return elem.innerHTML;
}

export type HighlightEvent = CustomEvent<{ highlightId: string | null }>;
export const HIGHLIGHT_EVENT_NAME = "commentHighlight";

// Trigger highlight active
export function highlightEvent(highlightId: string | null) {
  const event: HighlightEvent = new CustomEvent(HIGHLIGHT_EVENT_NAME, {
    detail: { highlightId },
  });

  document.documentElement.dispatchEvent(event);
}

export function useHighlightEvent() {
  return useCallback((highlightId: string | null) => {
    const event: HighlightEvent = new CustomEvent(HIGHLIGHT_EVENT_NAME, {
      detail: { highlightId },
    });

    document.documentElement.dispatchEvent(event);
  }, []);
}

export function useHighlightEventListener(
  callback: (highlightId: string | null) => void
) {
  useEffect(() => {
    function handler(event: HighlightEvent) {
      callback(event.detail.highlightId);
    }

    document.documentElement.addEventListener(
      HIGHLIGHT_EVENT_NAME,
      handler as any
    );

    return () => {
      document.documentElement.removeEventListener(
        HIGHLIGHT_EVENT_NAME,
        handler as any
      );
    };
  }, [callback]);
}
