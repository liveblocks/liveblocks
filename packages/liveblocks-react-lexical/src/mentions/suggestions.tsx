import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
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

export const SuggestionsContext = createContext<string[] | null>(null);

export const OnValueSelectCallbackContext = createContext<
  ((value: string) => void) | null
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
    const values = useSuggestions();
    const onValueSelect = useOnValueSelectCallback();
    const onEscapeKeyDown = useOnResetMatchCallback();

    useEffect(() => {
      function onKeyArrowDown(event: KeyboardEvent): boolean {
        if (values.length === 0) return true;
        if (highlightedIndex === null) return true;

        // If the highlighted index is at the last suggestion, then we loop back to the first suggestion, otherwise we increment the index.
        const nextIndex =
          highlightedIndex === values.length - 1 ? 0 : highlightedIndex + 1;
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
    }, [editor, highlightedIndex, values]);

    useEffect(() => {
      function onKeyArrowUp(event: KeyboardEvent): boolean {
        if (values.length === 0) return true;
        if (highlightedIndex === null) return true;

        // If the highlighted index is at the first suggestion, then we loop back to the last suggestion, otherwise we decrement the index.
        const nextIndex =
          highlightedIndex === 0 ? values.length - 1 : highlightedIndex - 1;
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
    }, [editor, highlightedIndex, values]);

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
        if (values.length === 0) return true;

        onValueSelect(values[highlightedIndex]);

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
    }, [editor, onValueSelect, highlightedIndex, values]);

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
    const onValueSelect = useOnValueSelectCallback();

    const isHighlighted = suggestions[highlightedIndex] === value;

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

      const index = suggestions.indexOf(value);
      if (index === -1) return;

      setHighlightedIndex(index);
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
      onClick?.(event);

      if (event.isDefaultPrevented()) return;

      onValueSelect(value);
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

function useSuggestions(): string[] {
  const suggestions = useContext(SuggestionsContext);
  if (suggestions === null) {
    throw new Error("useSuggestions: SuggestionsContext not found");
  }

  return suggestions;
}

function useOnValueSelectCallback(): (value: string) => void {
  const onValueSelect = useContext(OnValueSelectCallbackContext);
  if (onValueSelect === null) {
    throw new Error("useOnValueSelectCallback: OnValueSelectContext not found");
  }

  return onValueSelect;
}

function useOnResetMatchCallback(): () => void {
  const onResetMatch = useContext(OnResetMatchCallbackContext);
  if (onResetMatch === null) {
    throw new Error("useOnResetMatchCallback: OnResetMatchContext not found");
  }

  return onResetMatch;
}

export { Item, List };
