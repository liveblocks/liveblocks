import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRoom } from "@liveblocks/react";
import {
  useCreateTextMention,
  useDeleteTextMention,
  useLayoutEffect,
  useMentionSuggestions,
} from "@liveblocks/react/_private";
import type { EditorState, NodeKey, NodeMutation, TextNode } from "lexical";
import {
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
} from "lexical";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Avatar } from "./avatar";
import {
  $createMentionNode,
  $isMentionNode,
  MentionNode,
} from "./mention-node";
import * as Suggestions from "./suggestions";
import {
  OnResetMatchCallbackContext,
  OnValueSelectCallbackContext,
  SuggestionsContext,
} from "./suggestions";
import { User } from "./user";

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
  if (endOffset === null) return null;

  const range = document.createRange();

  try {
    range.setStart(anchor, offsetWithWhitespaces);
    range.setEnd(anchor, endOffset);
    return range;
  } catch (error) {
    return null;
  }
}

export function MentionPlugin() {
  const [editor] = useLexicalComposerContext();
  const room = useRoom();

  const [match, setMatch] = useState<RegExpExecArray | null>(null); // Represents the current match of the mention regex. A `null` value means there is no match.
  const matchingString = match?.[3];

  const suggestions = useMentionSuggestions(room.id, matchingString);
  const createTextMention = useCreateTextMention();
  const deleteTextMention = useDeleteTextMention();

  useEffect(() => {
    function $handleMutation(
      mutations: Map<NodeKey, NodeMutation>,
      {
        prevEditorState,
      }: {
        prevEditorState: EditorState;
      }
    ) {
      for (const [key, mutation] of mutations) {
        if (mutation === "created") {
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(key);
            if (node === null) return;

            if (!$isMentionNode(node)) return;
            createTextMention(node.getUserId(), node.getId());
          });
        } else if (mutation === "destroyed") {
          prevEditorState.read(() => {
            const node = $getNodeByKey(key);
            if (node === null) return;

            if (!$isMentionNode(node)) return;
            deleteTextMention(node.getId());
          });
        }
      }
    }

    return editor.registerMutationListener(
      MentionNode,
      (mutations, payload) => {
        // Ignore mutations to MentionNode (creation/updates/deletions) that are caused by collaboration (remote users) or history merge.
        if (
          payload.updateTags.has("collaboration") ||
          payload.updateTags.has("history-merge")
        ) {
          return;
        }

        $handleMutation(mutations, payload);
      }
    );
  }, [editor, createTextMention, deleteTextMention]);

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
      const selection = $getSelection();

      if (selection === null) return false;

      // If the selection is a node selection and the only node selected is a mention node, then we replace the mention node with a text node containing "@" and set the selection at the end of the text node.
      if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes();
        if (nodes.length !== 1) return false;

        const node = nodes[0];
        if (!$isMentionNode(node)) return false;

        const text = $createTextNode("@");
        node.replace(text);

        const newSelection = $createRangeSelection();
        newSelection.setTextNodeRange(text, 1, text, 1);
        $setSelection(newSelection);

        event.preventDefault();
        return true;
      } else if ($isRangeSelection(selection)) {
        if (!selection.isCollapsed()) return false;

        const anchor = selection.anchor.getNode();
        const prevSibling = anchor.getPreviousSibling();
        if (selection.anchor.offset === 0 && $isMentionNode(prevSibling)) {
          const text = $createTextNode("@");
          prevSibling.replace(text);

          const newSelection = $createRangeSelection();
          newSelection.setTextNodeRange(text, 1, text, 1);
          $setSelection(newSelection);

          event.preventDefault();
          return true;
        } else if ($isElementNode(anchor)) {
          const child = anchor.getChildAtIndex(selection.anchor.offset - 1);
          if (!$isMentionNode(child)) return false;

          const text = $createTextNode("@");
          child.replace(text);

          const newSelection = $createRangeSelection();
          newSelection.setTextNodeRange(text, 1, text, 1);
          $setSelection(newSelection);

          event.preventDefault();
          return true;
        }

        return false;
      }

      return false;
    }

    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      $handleBackspace,
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  const handleValueSelect = useCallback(
    (userId: string) => {
      function $onValueSelect() {
        if (match === null) return;

        setMatch(null);

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

        const mentionNode = $createMentionNode(userId);

        // Split the anchor (text) node and create a new text node only containing matched text.
        if (startOffset === 0) {
          const [node] = anchorNode.splitText(selectionOffset);
          node.replace(mentionNode);
        } else {
          const [, node] = anchorNode.splitText(startOffset, selectionOffset);
          node.replace(mentionNode);
        }
      }

      editor.update($onValueSelect);
    },
    [editor, match]
  );

  if (match === null || matchingString === undefined) return null;

  if (suggestions === undefined || suggestions.length === 0) return null;

  const range = editor.getEditorState().read(() => $getRangeAtMatch(match));

  if (range === null) return null;

  return createPortal(
    <SuggestionsContext.Provider value={suggestions}>
      <OnValueSelectCallbackContext.Provider value={handleValueSelect}>
        <OnResetMatchCallbackContext.Provider value={() => setMatch(null)}>
          <SuggestionsPortal
            range={range}
            container={document.body}
            key={matchingString}
          >
            <Suggestions.List className="lb-lexical-suggestions-list lb-lexical-mention-suggestions-list">
              {suggestions.map((userId) => (
                <Suggestions.Item
                  key={userId}
                  value={userId}
                  className="lb-lexical-suggestions-list-item lb-lexical-mention-suggestion"
                >
                  <Avatar
                    userId={userId}
                    className="lb-lexical-mention-suggestion-avatar"
                  />
                  <User
                    userId={userId}
                    className="lb-lexical-mention-suggestion-user"
                  />
                </Suggestions.Item>
              ))}
            </Suggestions.List>
          </SuggestionsPortal>
        </OnResetMatchCallbackContext.Provider>
      </OnValueSelectCallbackContext.Provider>
    </SuggestionsContext.Provider>,
    document.body
  );
}

export const SUGGESTIONS_COLLISION_PADDING = 10;

function SuggestionsPortal({
  children,
  range,
  container,
}: {
  children: ReactNode;
  range: Range;
  container: Element;
}) {
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "top-start",
    middleware: [
      flip({ padding: SUGGESTIONS_COLLISION_PADDING, crossAxis: false }),
      offset(10),
      hide({ padding: SUGGESTIONS_COLLISION_PADDING }),
      shift({ padding: SUGGESTIONS_COLLISION_PADDING, limiter: limitShift() }),
      size({ padding: SUGGESTIONS_COLLISION_PADDING }),
    ],
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        animationFrame: true,
      });
    },
  });

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => range.getBoundingClientRect(),
    });
  }, [setReference, range]);

  return createPortal(
    <div
      ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
      className="lb-root lb-portal lb-elevation lb-lexical-suggestions lb-lexical-mention-suggestions"
    >
      {children}
    </div>,
    container
  );
}
