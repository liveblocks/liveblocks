"use client";

import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $wrapSelectionInMarkNode } from "@lexical/mark";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $insertNodeToNearestRoot,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useState } from "react";

import { $createImageNode } from "./nodes/ImageNode";
import { $createMentionNode } from "./nodes/MentionNode";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
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
    const parent = anchorNode.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(anchorNode));

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

    const code = $findMatchingParent(anchorNode, $isCodeNode);
    if ($isCodeNode(code)) {
      setBlockType("code");
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

  const formatLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }

    const url = window.prompt("Enter URL", "https://");
    if (url === null || url.trim() === "") {
      return;
    }

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
  };

  const insertHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: "3",
      rows: "3",
      includeHeaders: { rows: true, columns: false },
    });
  };

  const insertImage = () => {
    editor.update(() => {
      $insertNodeToNearestRoot(
        $createImageNode({
          src: "https://placehold.co/600x320/png?text=Image",
          altText: "Image",
        })
      );
    });
  };

  const insertMention = () => {
    const name = window.prompt("Mention name", "alice");
    if (name === null || name.trim() === "") {
      return;
    }

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      const mention = $createMentionNode(name.trim());
      selection.insertNodes([mention, $createTextNode(" ")]);
    });
  };

  const formatMark = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        return;
      }

      $wrapSelectionInMarkNode(selection, selection.isBackward(), "mark");
    });
  };

  return (
    <div className="flex flex-wrap gap-2 p-2">
      <ToolbarButton
        label="Paragraph"
        active={blockType === "paragraph"}
        onClick={formatParagraph}
      />
      <ToolbarButton
        label="H1"
        active={blockType === "h1"}
        onClick={() => formatHeading("h1")}
      />
      <ToolbarButton
        label="H2"
        active={blockType === "h2"}
        onClick={() => formatHeading("h2")}
      />
      <ToolbarButton
        label="H3"
        active={blockType === "h3"}
        onClick={() => formatHeading("h3")}
      />
      <ToolbarButton
        label="Bullet"
        active={blockType === "bullet"}
        onClick={formatBulletList}
      />
      <ToolbarButton
        label="Numbered"
        active={blockType === "number"}
        onClick={formatNumberedList}
      />
      <ToolbarButton
        label="Quote"
        active={blockType === "quote"}
        onClick={formatQuote}
      />
      <ToolbarButton
        label="Code"
        active={blockType === "code"}
        onClick={formatCode}
      />
      <ToolbarButton label="HR" active={false} onClick={insertHorizontalRule} />
      <ToolbarButton label="Table" active={false} onClick={insertTable} />
      <ToolbarButton label="Image" active={false} onClick={insertImage} />

      <span className="mx-1">|</span>

      <ToolbarButton
        label="Bold"
        active={isBold}
        onClick={() => formatText("bold")}
      />
      <ToolbarButton
        label="Italic"
        active={isItalic}
        onClick={() => formatText("italic")}
      />
      <ToolbarButton
        label="Underline"
        active={isUnderline}
        onClick={() => formatText("underline")}
      />
      <ToolbarButton label="Link" active={isLink} onClick={formatLink} />
      <ToolbarButton label="Mark" active={false} onClick={formatMark} />
      <ToolbarButton label="Mention" active={false} onClick={insertMention} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "underline" : undefined}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
