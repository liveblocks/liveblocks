import {
  autoUpdate,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { useLayoutEffect } from "@liveblocks/react/_private";
import { Portal } from "@liveblocks/react-ui/_private";
import { TextSelection } from "@tiptap/pm/state";
import { type Editor, useEditorState } from "@tiptap/react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { forwardRef, useCallback, useMemo } from "react";

import type { ExtendedChainedCommands, SuggestionRange } from "../types";
import { SUGGESTIONS_PLUGIN_KEY } from "../types";
import { getDomRangeFromSelection } from "../utils";

export type FloatingSuggestionsProps = Omit<
  ComponentProps<"div">,
  "children"
> & {
  /**
   * The Tiptap editor.
   */
  editor: Editor | null;

  /**
   * Override the default review UI.
   */
  children?: (props: {
    suggestion: SuggestionRange;
    accept: () => void;
    reject: () => void;
  }) => ReactNode;
};

export const FLOATING_SUGGESTIONS_COLLISION_PADDING = 10;

function getSelectedSuggestion(editor: Editor): SuggestionRange | null {
  const pluginState = SUGGESTIONS_PLUGIN_KEY.getState(editor.state);
  const selectedId =
    pluginState?.hoveredSuggestionId ?? pluginState?.activeSuggestionId;

  if (!pluginState || !selectedId) {
    return null;
  }

  return (
    pluginState.suggestions.find(
      (suggestion) => suggestion.suggestionId === selectedId
    ) ?? null
  );
}

function compareSuggestions(
  a: SuggestionRange | null,
  b: SuggestionRange | null
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.suggestionId === b.suggestionId &&
    a.kind === b.kind &&
    a.from === b.from &&
    a.to === b.to
  );
}

export const FloatingSuggestions = forwardRef<
  HTMLDivElement,
  FloatingSuggestionsProps
>(function FloatingSuggestions(
  { editor, children, className, onMouseDown, ...props },
  forwardedRef
) {
  const suggestion = useEditorState({
    editor,
    selector: (ctx) => (ctx.editor ? getSelectedSuggestion(ctx.editor) : null),
    equalityFn: compareSuggestions,
  });
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "top",
    middleware: [
      inline({ padding: FLOATING_SUGGESTIONS_COLLISION_PADDING }),
      flip({ padding: FLOATING_SUGGESTIONS_COLLISION_PADDING, crossAxis: false }),
      offset(8),
      hide({ padding: FLOATING_SUGGESTIONS_COLLISION_PADDING }),
      shift({
        padding: FLOATING_SUGGESTIONS_COLLISION_PADDING,
        limiter: limitShift(),
      }),
      size({ padding: FLOATING_SUGGESTIONS_COLLISION_PADDING }),
    ],
    whileElementsMounted: (...args) =>
      autoUpdate(...args, { animationFrame: true }),
  });

  const suggestionSelection = useMemo(() => {
    if (!editor || !suggestion) {
      return null;
    }

    return TextSelection.create(editor.state.doc, suggestion.from, suggestion.to);
  }, [editor, suggestion]);

  useLayoutEffect(() => {
    if (!editor || !suggestionSelection) {
      setReference(null);
      return;
    }

    const domRange = getDomRangeFromSelection(editor, suggestionSelection);
    setReference(domRange);
  }, [editor, suggestionSelection, setReference]);

  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      setFloating(node);
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, setFloating]
  );

  if (!editor || !suggestion || !suggestionSelection) {
    return null;
  }

  const accept = () => {
    (
      editor.chain().focus() as ExtendedChainedCommands<
        "acceptSuggestion",
        [string]
      >
    )
      .acceptSuggestion(suggestion.suggestionId)
      .run();
  };

  const reject = () => {
    (
      editor.chain().focus() as ExtendedChainedCommands<
        "rejectSuggestion",
        [string]
      >
    )
      .rejectSuggestion(suggestion.suggestionId)
      .run();
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(event);

    if (!event.defaultPrevented) {
      event.preventDefault();
    }
  };

  return (
    <Portal asChild>
      <div
        className={[
          "lb-root",
          "lb-portal",
          "lb-elevation",
          "lb-tiptap-floating",
          "lb-tiptap-floating-suggestions",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        ref={setFloatingRef}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        }}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {children ? (
          children({ suggestion, accept, reject })
        ) : (
          <>
            <span className="lb-tiptap-floating-suggestions-label">
              {suggestion.kind === "insert"
                ? "Suggested addition"
                : "Suggested deletion"}
            </span>
            <button
              className="lb-tiptap-floating-suggestions-button"
              type="button"
              onClick={accept}
            >
              Accept
            </button>
            <button
              className="lb-tiptap-floating-suggestions-button"
              type="button"
              onClick={reject}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </Portal>
  );
});
