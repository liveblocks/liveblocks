import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { TextMentionData } from "@liveblocks/core";
import {
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import type {
  Dispatch,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  SetStateAction,
} from "react";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export const SuggestionsContext = createContext<TextMentionData[] | null>(null);

export const OnSuggestionSelectCallbackContext = createContext<
  ((mention: TextMentionData) => void) | null
>(null);

export const OnResetMatchCallbackContext = createContext<(() => void) | null>(
  null
);

const HighlightedIndexContext = createContext<
  [number, Dispatch<SetStateAction<number>>] | null
>(null);

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const List = forwardRef<HTMLDivElement, ListProps>(
  function (props, forwardedRef) {
    const { children, ...divProps } = props;
    const [editor] = useLexicalComposerContext();
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const suggestions = useSuggestions();
    const onSuggestionSelect = useOnSuggestionSelectCallback();
    const onEscapeKeyDown = useOnResetMatchCallback();

    useEffect(() => {
      function onKeyArrowDown(event: KeyboardEvent): boolean {
        if (suggestions.length === 0) return true;
        if (highlightedIndex === null) return true;

        // If the highlighted index is at the last suggestion, then we loop back to the first suggestion, otherwise we increment the index.
        const nextIndex =
          highlightedIndex === suggestions.length - 1
            ? 0
            : highlightedIndex + 1;
        setHighlightedIndex(nextIndex);

        event.preventDefault();
        event.stopImmediatePropagation();

        return true;
      }

      return editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        onKeyArrowDown,
        COMMAND_PRIORITY_LOW
      );
    }, [editor, highlightedIndex, suggestions]);

    useEffect(() => {
      function onKeyArrowUp(event: KeyboardEvent): boolean {
        if (suggestions.length === 0) return true;
        if (highlightedIndex === null) return true;

        // If the highlighted index is at the first suggestion, then we loop back to the last suggestion, otherwise we decrement the index.
        const nextIndex =
          highlightedIndex === 0
            ? suggestions.length - 1
            : highlightedIndex - 1;
        setHighlightedIndex(nextIndex);

        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }

      return editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        onKeyArrowUp,
        COMMAND_PRIORITY_LOW
      );
    }, [editor, highlightedIndex, suggestions]);

    useEffect(() => {
      function onKeyEscape(event: KeyboardEvent): boolean {
        event.preventDefault();
        event.stopImmediatePropagation();

        onEscapeKeyDown();
        return true;
      }

      return editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        onKeyEscape,
        COMMAND_PRIORITY_LOW
      );
    }, [editor, onEscapeKeyDown]);

    useEffect(() => {
      function onKeyEnter(event: KeyboardEvent | null): boolean {
        if (suggestions.length === 0) return true;

        onSuggestionSelect(suggestions[highlightedIndex]);

        if (event === null) return true;

        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }

      return editor.registerCommand(
        KEY_ENTER_COMMAND,
        onKeyEnter,
        COMMAND_PRIORITY_LOW
      );
    }, [editor, onSuggestionSelect, highlightedIndex, suggestions]);

    useEffect(() => {
      const root = editor.getRootElement();
      if (root === null) return;

      root.setAttribute(
        "aria-activedescendant",
        `typeahead-item-${highlightedIndex}`
      );

      return () => {
        root.removeAttribute("aria-activedescendant");
      };
    }, [editor, highlightedIndex]);

    return (
      <HighlightedIndexContext.Provider
        value={[highlightedIndex, setHighlightedIndex]}
      >
        <div role="listbox" {...divProps} ref={forwardedRef}>
          {children}
        </div>
      </HighlightedIndexContext.Provider>
    );
  }
);

interface ItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const Item = forwardRef<HTMLDivElement | null, ItemProps>(
  function Item(props, forwardedRef) {
    const { children, value, onMouseEnter, onClick, ...divProps } = props;
    const divRef = useRef<HTMLDivElement>(null);

    const [highlightedIndex, setHighlightedIndex] = useHighlightedIndex();
    const suggestions = useSuggestions();
    const onSuggestionSelect = useOnSuggestionSelectCallback();

    const isHighlighted = suggestions[highlightedIndex].id === value;

    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => divRef.current
    );

    useEffect(() => {
      if (!isHighlighted) return;

      const div = divRef.current;
      if (div === null) return;

      div.scrollIntoView({ block: "nearest" });
    }, [isHighlighted]);

    function handleMouseEnter(event: MouseEvent<HTMLDivElement>) {
      onMouseEnter?.(event);

      if (event.isDefaultPrevented()) return;

      const index = suggestions.findIndex(
        (suggestion) => suggestion.id === value
      );
      if (index === -1) return;

      setHighlightedIndex(index);
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
      onClick?.(event);

      if (event.isDefaultPrevented()) return;

      onSuggestionSelect(suggestions[highlightedIndex]);
    }

    return (
      <div
        role="option"
        data-highlighted={isHighlighted || undefined}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        {...divProps}
        ref={divRef}
      >
        {children}
      </div>
    );
  }
);

function useHighlightedIndex(): [number, Dispatch<SetStateAction<number>>] {
  const context = useContext(HighlightedIndexContext);
  if (context === null) {
    throw new Error(
      "useHighlightedIndex must be used within a HighlightedIndexProvider"
    );
  }
  return context;
}

function useSuggestions(): TextMentionData[] {
  const suggestions = useContext(SuggestionsContext);
  if (suggestions === null) {
    throw new Error("useSuggestions: SuggestionsContext not found");
  }

  return suggestions;
}

function useOnSuggestionSelectCallback(): (mention: TextMentionData) => void {
  const onSuggestionSelect = useContext(OnSuggestionSelectCallbackContext);
  if (onSuggestionSelect === null) {
    throw new Error(
      "useOnSuggestionSelectCallback: OnSuggestionSelectContext not found"
    );
  }

  return onSuggestionSelect;
}

function useOnResetMatchCallback(): () => void {
  const onResetMatch = useContext(OnResetMatchCallbackContext);
  if (onResetMatch === null) {
    throw new Error("useOnResetMatchCallback: OnResetMatchContext not found");
  }

  return onResetMatch;
}

export { Item, List };
