"use client";

import { $createCodeNode, $isCodeNode } from "@lexical/code";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag());
    } else if ($isQuoteNode(element)) {
      setBlockType("quote");
    } else if ($isListNode(element)) {
      setBlockType(element.getListType());
    } else if ($isCodeNode(element)) {
      setBlockType("code");
    } else {
      setBlockType(element.getType());
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerEditableListener(() => {
        editor.getEditorState().read(updateToolbar);
      })
    );
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatParagraph = () => {
    if (blockType === "bullet" || blockType === "number") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      return;
    }

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

  const formatBulletList = () => {
    if (blockType === "bullet") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      return;
    }

    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    if (blockType === "number") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      return;
    }

    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const formatCode = () => {
    if (blockType === "code") {
      formatParagraph();
      return;
    }

    editor.update(() => {
      $setBlocksType($getSelection(), () => $createCodeNode());
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 p-4 dark:border-neutral-800">
      <ToolbarButton
        label="Paragraph"
        active={blockType === "paragraph"}
        onClick={formatParagraph}
      >
        <TextIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 1"
        active={blockType === "h1"}
        onClick={() => formatHeading("h1")}
      >
        <span className="text-xs font-semibold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={blockType === "h2"}
        onClick={() => formatHeading("h2")}
      >
        <span className="text-xs font-semibold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={blockType === "h3"}
        onClick={() => formatHeading("h3")}
      >
        <span className="text-xs font-semibold">H3</span>
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={blockType === "bullet"}
        onClick={formatBulletList}
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={blockType === "number"}
        onClick={formatNumberedList}
      >
        <NumberedListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={blockType === "quote"}
        onClick={formatQuote}
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={blockType === "code"}
        onClick={formatCode}
      >
        <CodeIcon />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

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
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="px-1 py-0.5 text-sm text-neutral-500 hover:text-neutral-900 data-active:font-semibold data-active:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 dark:data-active:text-neutral-50"
      aria-label={label}
      title={label}
      data-active={active || undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M18.25 25H9V7H17.5C18.5022 7.00006 19.4834 7.28695 20.3277 7.82679C21.172 8.36662 21.8442 9.13684 22.2649 10.0465C22.6855 10.9561 22.837 11.9671 22.7015 12.96C22.5659 13.953 22.149 14.8864 21.5 15.65C22.3477 16.328 22.9645 17.252 23.2653 18.295C23.5662 19.3379 23.5364 20.4485 23.18 21.4738C22.8236 22.4991 22.1581 23.3887 21.2753 24.0202C20.3924 24.6517 19.3355 24.994 18.25 25ZM12 22H18.23C18.5255 22 18.8181 21.9418 19.091 21.8287C19.364 21.7157 19.6121 21.5499 19.821 21.341C20.0299 21.1321 20.1957 20.884 20.3087 20.611C20.4218 20.3381 20.48 20.0455 20.48 19.75C20.48 19.4545 20.4218 19.1619 20.3087 18.889C20.1957 18.616 20.0299 18.3679 19.821 18.159C19.6121 17.9501 19.364 17.7843 19.091 17.6713C18.8181 17.5582 18.5255 17.5 18.23 17.5H12V22ZM12 14.5H17.5C17.7955 14.5 18.0881 14.4418 18.361 14.3287C18.634 14.2157 18.8821 14.0499 19.091 13.841C19.2999 13.6321 19.4657 13.384 19.5787 13.111C19.6918 12.8381 19.75 12.5455 19.75 12.25C19.75 11.9545 19.6918 11.6619 19.5787 11.389C19.4657 11.116 19.2999 10.8679 19.091 10.659C18.8821 10.4501 18.634 10.2843 18.361 10.1713C18.0881 10.0582 17.7955 10 17.5 10H12V14.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M25 9V7H12V9H17.14L12.77 23H7V25H20V23H14.86L19.23 9H25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M4 26H28V28H4V26ZM16 23C14.1435 23 12.363 22.2625 11.0503 20.9497C9.7375 19.637 9 17.8565 9 16V5H11V16C11 17.3261 11.5268 18.5979 12.4645 19.5355C13.4021 20.4732 14.6739 21 16 21C17.3261 21 18.5979 20.4732 19.5355 19.5355C20.4732 18.5979 21 17.3261 21 16V5H23V16C23 17.8565 22.2625 19.637 20.9497 20.9497C19.637 22.2625 17.8565 23 16 23Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7V5h16v2M9 19h6M12 5v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 6H3M21 12H8M21 18H8M3 12v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m16 18 6-6-6-6M8 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
