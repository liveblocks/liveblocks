import getInnerTextCaretPosition from "./getInnerTextCaretPosition";

const THRESHOLD = 6;

const isCaretOnLastLine = (element: HTMLElement) => {
  if (document.activeElement !== element) {
    return false;
  }

  let selection = window.getSelection();
  if (!selection || selection?.rangeCount === 0) {
    return false;
  }

  let originalCaretRange = selection.getRangeAt(0);
  if (originalCaretRange.toString().length > 0) {
    return false;
  }

  const caretPosition = getInnerTextCaretPosition(element, selection);
  if (caretPosition === element.innerText.length) {
    return true;
  }

  let originalCaretRect = originalCaretRange.getBoundingClientRect();
  const blockRect = element.getBoundingClientRect();

  return Math.abs(blockRect.bottom - originalCaretRect.bottom) < THRESHOLD;
};

export default isCaretOnLastLine;
