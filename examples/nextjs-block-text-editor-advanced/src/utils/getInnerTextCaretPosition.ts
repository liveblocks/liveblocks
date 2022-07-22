import parseHtml from "./parseHtml";

const getInnerTextCaretPosition = (
  element: HTMLElement,
  selection: Selection
): number | null => {
  if (selection.rangeCount === 0) {
    return null;
  }

  const originalRange = selection.getRangeAt(0);

  if (!originalRange || !originalRange.collapse) {
    return null;
  }

  const range = originalRange.cloneRange();
  const temporaryNode = document.createTextNode("\u0001");
  range.insertNode(temporaryNode);
  const caretPosition = parseHtml(element.innerText).indexOf("\u0001");
  temporaryNode.parentNode?.removeChild(temporaryNode);
  return caretPosition;
};
export default getInnerTextCaretPosition;
