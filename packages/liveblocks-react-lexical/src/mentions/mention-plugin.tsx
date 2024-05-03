import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { kInternal } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  TextNode,
} from "lexical";

import React, {
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import MentionNode, { $createMentionNode } from "./mention-node";

const MENTION_TRIGGER = "@";

const PUNCTUATIONS =
  "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";

// Characters we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARACTERS = "[^" + MENTION_TRIGGER + PUNCTUATIONS + "\\s]";

const VALID_JOINS =
  "(?:" +
  "\\.[ |$]|" + // E.g. "r. " in "Mr. Smith"
  " |" + // E.g. " " in "Josh Duck"
  "[" +
  PUNCTUATIONS +
  "]|" + // E.g. "-' in "Salier-Hellendag"
  ")";

const LENGTH_LIMIT = 75;

const MentionRegex = new RegExp(
  "(^|\\s|\\()(" +
    "[" +
    MENTION_TRIGGER +
    "]" +
    "((?:" +
    VALID_CHARACTERS +
    VALID_JOINS +
    "){0," +
    LENGTH_LIMIT +
    "})" +
    ")$"
);

function $getAnchorNodeTextContent(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const anchor = selection.anchor;
  if (anchor.type !== "text") return null;
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) return null;
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}

/**
 * Walk backwards along user input and forward through entity title to try and replace more of the user's text with entity.
 */
function getFullMatchOffset(
  documentText: string,
  entryText: string,
  offset: number
): number {
  let triggerOffset = offset;
  for (let i = triggerOffset; i <= entryText.length; i++) {
    if (documentText.substr(-i) === entryText.substr(0, i)) {
      triggerOffset = i;
    }
  }
  return triggerOffset;
}

function $isCurrentSelectionAtBoundary(offset: number): boolean {
  // If the offset is not zero, i.e. not at the beginning of the text node, the selection is somewhere in the middle of the entity, i.e. not at the boundary.
  if (offset !== 0) return false;

  // Othewise (if the offset is zero), it means the selection could be at the start of an entity. It could also be at the end of the previous entity, or it could be in a position where there are no entities at all.
  // So, we check if the previous sibling of the node at the anchor of the selection is a text entity. If it is, then the selection is at the boundary of the entity.
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) return false;

  const anchor = selection.anchor.getNode();
  const prevSibling = anchor.getPreviousSibling();

  if (!$isTextNode(prevSibling)) return false;
  if (!prevSibling.isTextEntity()) return false;

  return true;
}

function $getRangeAtMatch(match: RegExpExecArray): globalThis.Range | null {
  const offsetWithWhitespaces = match.index + match[1].length;

  if ($isCurrentSelectionAtBoundary(offsetWithWhitespaces)) return null;

  const selection = window.getSelection();
  if (selection === null) return null;
  if (!selection.isCollapsed) return null;

  const anchor = selection.anchorNode;
  if (anchor === null) return null;

  const endOffset = selection.anchorOffset;
  if (endOffset == null) return null;

  const range = document.createRange();

  try {
    range.setStart(anchor, offsetWithWhitespaces);
    range.setEnd(anchor, endOffset);
    return range;
  } catch (error) {
    return null;
  }
}

export default function MentionPlugin() {
  const [editor] = useLexicalComposerContext();

  if (!editor.hasNodes([MentionNode])) {
    throw new Error("MentionPlugin: MentionNode not registered on editor");
  }

  const [match, setMatch] = useState<RegExpExecArray | null>(null);
  const matchingString = match?.[3];

  const {
    [kInternal]: { useMentionSuggestions },
  } = useRoomContextBundle();
  const suggestions = useMentionSuggestions(matchingString);

  useEffect(() => {
    function $onStateRead() {
      const text = $getAnchorNodeTextContent();
      if (text === null) {
        setMatch(null);
        return;
      }

      const match = MentionRegex.exec(text);
      setMatch(match);
    }

    return editor.registerUpdateListener(({ editorState: state }) => {
      state.read($onStateRead);
    });
  }, [editor]);

  useEffect(() => {
    function $handleBackspace(event: KeyboardEvent): boolean {
      console.log("BACKSPACE");
      const selection = $getSelection();
      if (selection === null) return false;

      if (!$isRangeSelection(selection)) return false;

      if (!selection.isCollapsed()) return false;

      return false;
    }

    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      $handleBackspace,
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  const handleValueChange = useCallback(
    (suggestion: string) => {
      function $onValueChange() {
        const mentionNode = $createMentionNode(suggestion);

        setMatch(null);

        if (match === null) return;

        const selection = $getSelection();

        if (!$isRangeSelection(selection)) return;
        if (!selection.isCollapsed()) return;

        const anchor = selection.anchor;
        if (anchor.type !== "text") return;

        const anchorNode: TextNode = anchor.getNode();
        if (!anchorNode.isSimpleText()) return;

        const selectionOffset = anchor.offset;
        const text = anchorNode.getTextContent().slice(0, selectionOffset);

        const characterOffset = match[2].length;
        const queryOffset = getFullMatchOffset(text, match[2], characterOffset);
        const startOffset = selectionOffset - queryOffset;
        if (startOffset < 0) return;

        // Split the anchor (text) node and create a new text node only containing matched text.
        if (startOffset === 0) {
          const [node] = anchorNode.splitText(selectionOffset);
          node.replace(mentionNode);
        } else {
          const [, node] = anchorNode.splitText(startOffset, selectionOffset);
          node.replace(mentionNode);
        }
      }

      editor.update($onValueChange);
    },
    [editor, match]
  );

  if (match === null || matchingString === undefined) return null;

  if (suggestions === undefined || suggestions.length === 0) return null;

  const range = editor.getEditorState().read(() => $getRangeAtMatch(match));

  if (range === null) return null;

  const rect = range.getBoundingClientRect();

  return createPortal(
    <MentionDropdownMenuRoot rect={rect}>
      <MentionDropdownMenuContent
        key={matchingString}
        values={suggestions}
        onValueChange={handleValueChange}
        onEscapeKeyDown={() => setMatch(null)}
      />
    </MentionDropdownMenuRoot>,
    document.body
  );
}

interface DropdownMenuRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  rect: DOMRect;
}

function MentionDropdownMenuRoot({
  children,
  rect,
  style,
  ...divProps
}: DropdownMenuRootProps) {
  const [editor] = useLexicalComposerContext();
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = editor.getRootElement();
    if (root === null) return;

    const div = divRef.current;
    if (div === null) return;

    div.style.left = `${rect.left + window.scrollX}px`;
    div.style.top = `${rect.bottom + window.scrollY}px`;
  }, [editor, rect]);

  return (
    <div
      {...divProps}
      ref={divRef}
      role="listbox"
      style={{ position: "absolute", ...style }}
    >
      {children}
    </div>
  );
}

interface DropdownMenuContentProps {
  values: string[];
  onValueChange: (suggestion: string) => void;
  onEscapeKeyDown: () => void;
}

function MentionDropdownMenuContent({
  values,
  onValueChange,
  onEscapeKeyDown,
}: DropdownMenuContentProps) {
  const [editor] = useLexicalComposerContext();

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

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
    function onKeyEnter(event: KeyboardEvent | null): boolean {
      if (values.length === 0) return true;

      onValueChange(values[highlightedIndex]);

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
  }, [editor, onValueChange, highlightedIndex, values]);

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

  return values.map((value, index) => {
    const isHighlighted = index === highlightedIndex;
    return (
      <MentionDropdownMenuItem
        key={value}
        isHighlighted={isHighlighted}
        data-highlighted={isHighlighted ? "" : undefined}
        onClick={() => onValueChange(value)}
        onMouseEnter={() => setHighlightedIndex(index)}
      >
        {value}
      </MentionDropdownMenuItem>
    );
  });
}

interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  isHighlighted: boolean;
}

function MentionDropdownMenuItem({
  isHighlighted,
  ...props
}: DropdownMenuItemProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHighlighted) return;

    const div = divRef.current;
    if (div === null) return;

    div.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [isHighlighted]);

  return <div {...props} ref={divRef}></div>;
}
