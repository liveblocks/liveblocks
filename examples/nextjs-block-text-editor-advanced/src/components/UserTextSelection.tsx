import { createElement, useEffect, useState, createRef } from "react";
import { BlockTopLevelNode, TextSelection } from "../types";
import convertBlockNodeToHtml from "../utils/convertBlockNodeToHtml";
import getElementTypeFromBlockTopLevelNode from "../utils/getElementTypeFromBlockTopLevelNode";
import styles from "../../styles/UserTextSelection.module.css";
import classNames from "classnames";
import insertHtmlAtPosition from "../utils/insertHtmlAtPosition";

type Props = {
  node: BlockTopLevelNode;
  name: string;
  textSelection: TextSelection;
  color: string;
};

export default function UserTextSelection({
  node,
  name,
  textSelection,
  color,
}: Props) {
  const ref = createRef<HTMLDivElement>();
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let newHtml = "";

    if (textSelection.caretPosition != null) {
      newHtml = insertHtmlAtPosition(
        textSelection.caretPosition,
        convertBlockNodeToHtml(node),
        `<span class="${styles.caret} caret" style="background-color: ${color}"><span class="${styles.caret_name}">${name}</span></span>`
      );
    } else {
      newHtml = convertBlockNodeToHtml(node);
    }

    setHtml(newHtml);
  }, [node, setHtml, name, textSelection, color]);

  return (
    <>
      {createElement("div", {
        ref,
        className: classNames(
          styles.text_selection,
          getElementTypeFromBlockTopLevelNode(node)
        ),
        spellCheck: false,
        contentEditable: false,
        dangerouslySetInnerHTML: { __html: html },
      })}
    </>
  );
}
