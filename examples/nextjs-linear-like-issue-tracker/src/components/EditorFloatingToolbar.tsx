"use client";

import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import classnames from "classnames";
import { Select } from "@/components/Select";
import { BoldIcon } from "@/icons/BoldIcon";
import { ItalicIcon } from "@/icons/ItalicIcon";
import { UnderlineIcon } from "@/icons/UnderlineIcon";
import { StrikethroughIcon } from "@/icons/StrikethroughIcon";
import { CodeIcon } from "@/icons/CodeIcon";

const BLOCK_ITEMS = [
  { id: "paragraph", label: <span>Regular text</span> },
  {
    id: "h1",
    label: <span className="text-[17.5px] font-bold">Heading 1</span>,
  },
  {
    id: "h2",
    label: <span className="text-[16px] font-bold">Heading 2</span>,
  },
  {
    id: "h3",
    label: <span className="text-[15px] font-bold">Heading 3</span>,
  },
  {
    id: "quote",
    label: (
      <span className="border-l-[3px] pl-2 border-gray-600">Blockquote</span>
    ),
  },
];

export function EditorFloatingToolbar() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      setIsVisible(false);
      return;
    }

    if (selection.isCollapsed()) {
      setIsVisible(false);
      return;
    }

    const nativeSelection = window.getSelection();
    const domRange =
      nativeSelection?.rangeCount !== undefined && nativeSelection.rangeCount > 0
        ? nativeSelection.getRangeAt(0)
        : null;

    if (domRange === null) {
      setIsVisible(false);
      return;
    }

    const rect = domRange.getBoundingClientRect();
    const toolbar = toolbarRef.current;
    const toolbarWidth = toolbar?.offsetWidth ?? 0;

    setPosition({
      top: rect.top + window.scrollY - 48,
      left: rect.left + window.scrollX + rect.width / 2 - toolbarWidth / 2,
    });
    setIsVisible(true);

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsCode(selection.hasFormat("code"));

    const anchorNode = selection.anchor.getNode();
    const heading = $findMatchingParent(anchorNode, $isHeadingNode);
    if ($isHeadingNode(heading)) {
      setBlockType(heading.getTag());
      return;
    }

    const quote = $findMatchingParent(anchorNode, $isQuoteNode);
    if ($isQuoteNode(quote)) {
      setBlockType("quote");
      return;
    }

    const code = $findMatchingParent(anchorNode, $isCodeNode);
    if ($isCodeNode(code)) {
      setBlockType("code");
      return;
    }

    setBlockType("paragraph");
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

  const formatCodeBlock = () => {
    if (blockType === "code") {
      formatParagraph();
      return;
    }

    editor.update(() => {
      $setBlocksType($getSelection(), () => $createCodeNode());
    });
  };

  const handleBlockChange = (value: string) => {
    switch (value) {
      case "paragraph":
        formatParagraph();
        break;
      case "h1":
        formatHeading("h1");
        break;
      case "h2":
        formatHeading("h2");
        break;
      case "h3":
        formatHeading("h3");
        break;
      case "quote":
        formatQuote();
        break;
      case "code":
        formatCodeBlock();
        break;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className="lb-root fixed z-50 flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Select
        id="block-type"
        value={blockType === "code" ? "paragraph" : blockType}
        items={BLOCK_ITEMS.map((item) => ({ id: item.id, jsx: item.label }))}
        onValueChange={handleBlockChange}
      />
      <div className="mx-1 h-5 w-px bg-neutral-200" />
      <ToolbarButton active={isBold} label="Bold" onClick={() => formatText("bold")}>
        <BoldIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        label="Italic"
        onClick={() => formatText("italic")}
      >
        <ItalicIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        label="Underline"
        onClick={() => formatText("underline")}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isStrikethrough}
        label="Strikethrough"
        onClick={() => formatText("strikethrough")}
      >
        <StrikethroughIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={isCode} label="Code" onClick={() => formatText("code")}>
        <CodeIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={classnames(
        "flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-neutral-200/60",
        active && "bg-neutral-200/60"
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
