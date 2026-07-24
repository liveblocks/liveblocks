import type { SelectionRange } from "./live-text-formatting";

// Converts a DOM position (node + offset) into a character offset into the editor
export function getAbsoluteOffset(
  element: HTMLElement,
  node: Node,
  offsetInNode: number
): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offsetInNode);
  return range.toString().length;
}

// Reads the DOM selection as character offsets, preserving direction (anchor → focus)
export function getSelectionRange(
  element: HTMLElement
): SelectionRange | null {
  const domSelection = window.getSelection();
  if (
    !domSelection ||
    domSelection.anchorNode === null ||
    domSelection.focusNode === null ||
    !element.contains(domSelection.anchorNode) ||
    !element.contains(domSelection.focusNode)
  ) {
    return null;
  }

  return {
    anchor: getAbsoluteOffset(
      element,
      domSelection.anchorNode,
      domSelection.anchorOffset
    ),
    focus: getAbsoluteOffset(
      element,
      domSelection.focusNode,
      domSelection.focusOffset
    ),
  };
}

// Converts a character offset back into a DOM position inside the editor
export function resolveDomPoint(
  element: HTMLElement,
  offset: number
): { node: Node; offset: number } {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let lastTextNode: Text | null = null;

  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (remaining <= textNode.length) {
      return { node: textNode, offset: remaining };
    }
    remaining -= textNode.length;
    lastTextNode = textNode;
    node = walker.nextNode();
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.length };
  }
  return { node: element, offset: 0 };
}

// Applies character offsets as the DOM selection, preserving direction (anchor → focus)
export function setSelectionRange(
  element: HTMLElement,
  range: SelectionRange
): void {
  const domSelection = window.getSelection();
  if (!domSelection) {
    return;
  }

  const anchor = resolveDomPoint(element, range.anchor);
  const focus = resolveDomPoint(element, range.focus);
  domSelection.setBaseAndExtent(
    anchor.node,
    anchor.offset,
    focus.node,
    focus.offset
  );
}
