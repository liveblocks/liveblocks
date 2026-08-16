"use client";

import { ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import BlockQuoteIcon from "./icons/blockquote-icon";
import BoldIcon from "./icons/bold-icon";
import HeadingOneIcon from "./icons/heading-one-icon";
import HeadingThreeIcon from "./icons/heading-three-icon";
import HeadingTwoIcon from "./icons/heading-two-icon";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));

    const anchorNode = selection.anchor.getNode();
    const heading = $findMatchingParent(anchorNode, $isHeadingNode);
    if ($isHeadingNode(heading)) {
      setBlockType(heading.getTag());
      return;
    }

    const list = $getNearestNodeOfType(anchorNode, ListNode);
    if (list !== null) {
      setBlockType(list.getListType());
      return;
    }

    const quote = $findMatchingParent(anchorNode, $isQuoteNode);
    if ($isQuoteNode(quote)) {
      setBlockType("quote");
      return;
    }

    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
    setBlockType(element.getType());
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerEditableListener(() => {
        editor.getEditorState().read(updateToolbar);
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatParagraph = () => {
    editor.update(() => {
      $setBlocksType($getSelection(), () => $createParagraphNode());
    });
  };

  const formatHeading = (tag: HeadingTagType) => {
    if (blockType === tag) {
      formatParagraph();
      return;
    }

    editor.update(() => {
      $setBlocksType($getSelection(), () => $createHeadingNode(tag));
    });
  };

  const formatQuote = () => {
    if (blockType === "quote") {
      formatParagraph();
      return;
    }

    editor.update(() => {
      $setBlocksType($getSelection(), () => $createQuoteNode());
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2">
      <ToolbarButton
        label="Undo"
        active={false}
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        active={false}
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <RedoIcon />
      </ToolbarButton>

      <span className="mx-2 h-6 w-px bg-border/80" aria-hidden />

      <ToolbarButton
        label="Paragraph"
        active={blockType === "paragraph"}
        onClick={formatParagraph}
      >
        <ParagraphIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 1"
        active={blockType === "h1"}
        onClick={() => formatHeading("h1")}
      >
        <HeadingOneIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={blockType === "h2"}
        onClick={() => formatHeading("h2")}
      >
        <HeadingTwoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={blockType === "h3"}
        onClick={() => formatHeading("h3")}
      >
        <HeadingThreeIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={blockType === "quote"}
        onClick={formatQuote}
      >
        <BlockQuoteIcon />
      </ToolbarButton>

      <span className="mx-2 h-6 w-px bg-border/80" aria-hidden />

      <ToolbarButton
        label="Bold"
        active={isBold}
        onClick={() => formatText("bold")}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={isItalic}
        onClick={() => formatText("italic")}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={isUnderline}
        onClick={() => formatText("underline")}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={isStrikethrough}
        onClick={() => formatText("strikethrough")}
      >
        <StrikethroughIcon />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function UndoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}

function ParagraphIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 4v16" />
      <path d="M17 4v16" />
      <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="19" x2="10" y1="4" y2="4" />
      <line x1="14" x2="5" y1="20" y2="20" />
      <line x1="15" x2="9" y1="4" y2="20" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" x2="20" y1="20" y2="20" />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" x2="20" y1="12" y2="12" />
    </svg>
  );
}
