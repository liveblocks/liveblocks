import {
  createElement,
  createRef,
  useState,
  KeyboardEvent,
  FocusEvent,
  useEffect,
} from "react";
import TextEditorToolbar from "./TextEditorToolbar";
import { BlockTopLevelNode, TextSelection } from "../types";
import getElementTypeFromBlockTopLevelNode from "../utils/getElementTypeFromBlockTopLevelNode";
import convertBlockNodeToHtml from "../utils/convertBlockNodeToHtml";
import convertHtmlToBlockTopLevelNode from "../utils/convertHtmlToBlockTopLevelNode";
import styles from "../../styles/TextEditor.module.css";
import applyFormatToSelection from "../utils/applyFormatToSelection";
import getInnerTextCaretPosition from "../utils/getInnerTextCaretPosition";

type Props = {
  node: BlockTopLevelNode;
  id: string;
  onTextSelectionChange?: (textSelection: TextSelection) => void;
  onChange?: (node: BlockTopLevelNode) => void;
  onBlur?: (e: FocusEvent, node: BlockTopLevelNode) => void;
  onFocus?: (e: FocusEvent, node: BlockTopLevelNode) => void;
  onKeyDown?: (e: KeyboardEvent, node: BlockTopLevelNode) => void;
  onKeyUp?: (e: KeyboardEvent, node: BlockTopLevelNode) => void;
};

export default function TextEditor({
  node,
  id,
  onTextSelectionChange,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
}: Props) {
  const ref = createRef<HTMLElement>();
  const [html, setHtml] = useState<string>(convertBlockNodeToHtml(node));
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(
    null
  );
  const [selection, setSelection] = useState<Selection | null>(null);

  // Only update content when the editor isn't focused.
  useEffect(() => {
    if (ref.current !== document.activeElement) {
      setHtml(convertBlockNodeToHtml(node));
    }
  }, [node, ref]);

  // Show the toolbar based on selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      setSelection(selection);

      if (
        !ref.current ||
        ref.current !== document.activeElement ||
        !selection
      ) {
        setToolbar(null);
        return;
      }

      if (onTextSelectionChange) {
        onTextSelectionChange({
          caretPosition: getInnerTextCaretPosition(ref.current, selection),
        });
      }

      if (Math.abs(selection.anchorOffset - selection.focusOffset) === 0) {
        setToolbar(null);
        return;
      }

      const boundsSelection = selection.getRangeAt(0).getBoundingClientRect();
      const boundsEditor = ref.current?.getBoundingClientRect();

      setToolbar({
        top: boundsSelection.top - boundsEditor.top,
        left: boundsSelection.left - boundsEditor.left,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [ref, onTextSelectionChange]);

  const handleOnInput = () => {
    if (!ref.current) {
      return;
    }

    if (onChange) {
      onChange(
        convertHtmlToBlockTopLevelNode(node.type, ref.current.innerHTML)
      );
    }
  };

  const handleOnKeyDown = (e: KeyboardEvent) => {
    if (!ref.current) {
      return;
    }

    switch (e.key) {
      case "b":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyFormatToSelection(selection, "bold");
        }
        break;

      case "i":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyFormatToSelection(selection, "italic");
        }
        break;

      case "s":
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          applyFormatToSelection(selection, "strikeThrough");
        }
        break;

      case "u":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          applyFormatToSelection(selection, "underline");
        }
        break;
    }

    if (onKeyDown) {
      onKeyDown(
        e,
        convertHtmlToBlockTopLevelNode(node.type, ref.current.innerHTML)
      );
    }
  };

  const handleOnKeyUp = (e: KeyboardEvent) => {
    if (!ref.current) {
      return;
    }

    if (onKeyUp) {
      onKeyUp(
        e,
        convertHtmlToBlockTopLevelNode(node.type, ref.current.innerHTML)
      );
    }
  };

  const handleOnFocus = (e: FocusEvent) => {
    if (!ref.current) {
      return;
    }

    if (onFocus) {
      onFocus(
        e,
        convertHtmlToBlockTopLevelNode(node.type, ref.current.innerHTML)
      );
    }
  };

  const handleOnBlur = (e: FocusEvent) => {
    if (!ref.current) {
      return;
    }

    if (onBlur) {
      onBlur(
        e,
        convertHtmlToBlockTopLevelNode(node.type, ref.current.innerHTML)
      );
    }

    if (ref.current !== document.activeElement) {
      setHtml(convertBlockNodeToHtml(node));
    }
  };

  const handleOnPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain");

    if (text) {
      document.execCommand("insertText", false, text);
    }
  };

  return (
    <>
      {createElement(getElementTypeFromBlockTopLevelNode(node), {
        ref,
        id,
        className: styles.editor,
        role: "textbox",
        onInput: handleOnInput,
        onKeyDown: handleOnKeyDown,
        onKeyUp: handleOnKeyUp,
        onFocus: handleOnFocus,
        onBlur: handleOnBlur,
        onPaste: handleOnPaste,
        spellCheck: false,
        contentEditable: true,
        dangerouslySetInnerHTML: { __html: html },
      })}
      {toolbar && (
        <TextEditorToolbar
          node={node}
          position={toolbar}
          selection={selection}
        />
      )}
    </>
  );
}
