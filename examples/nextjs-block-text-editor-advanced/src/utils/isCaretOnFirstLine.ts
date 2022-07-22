import getInnerTextCaretPosition from "./getInnerTextCaretPosition";

const THRESHOLD = 6;

const isCaretOnFirstLine = (element: HTMLElement) => {
  if (document.activeElement !== element) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection?.rangeCount === 0) {
    return false;
  }

  const caretPosition = getInnerTextCaretPosition(element, selection);
  if (caretPosition === 0) {
    return true;
  }

  const originalCaretRange = selection.getRangeAt(0);
  if (originalCaretRange.toString().length > 0) {
    return false;
  }

  const originalCaretRect = originalCaretRange.getBoundingClientRect();
  const blockRect = element.getBoundingClientRect();
  return Math.abs(blockRect.top - originalCaretRect.top) < THRESHOLD;
};

export default isCaretOnFirstLine;
