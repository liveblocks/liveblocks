import { parse, type DefaultTreeAdapterTypes } from "parse5";

export type ElementSourceRange = {
  start: number;
  end: number;
};

function isElementNode(
  node: DefaultTreeAdapterTypes.ChildNode
): node is DefaultTreeAdapterTypes.Element {
  return "tagName" in node;
}

function findElementChild(
  parent: DefaultTreeAdapterTypes.ParentNode,
  index: number
): DefaultTreeAdapterTypes.Element | null {
  let elementIndex = 0;

  for (const child of parent.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }

    if (elementIndex === index) {
      return child;
    }
    elementIndex++;
  }

  return null;
}

function findElementByTagName(
  parent: DefaultTreeAdapterTypes.ParentNode,
  tagName: string
): DefaultTreeAdapterTypes.Element | null {
  for (const child of parent.childNodes) {
    if (isElementNode(child) && child.tagName === tagName) {
      return child;
    }
  }

  return null;
}

export function findElementSourceRange(
  html: string,
  path: number[]
): ElementSourceRange | null {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const htmlElement = findElementByTagName(document, "html");
  if (!htmlElement) {
    return null;
  }

  let element = findElementByTagName(htmlElement, "body");
  if (!element) {
    return null;
  }

  for (const index of path) {
    if (!Number.isInteger(index) || index < 0 || element.tagName === "template") {
      return null;
    }

    element = findElementChild(element, index);
    if (!element) {
      return null;
    }
  }

  const location = element.sourceCodeLocation;
  if (!location) {
    return null;
  }

  return {
    start: location.startOffset,
    end: location.endOffset,
  };
}

export function getElementPath(element: Element, root: Element): number[] | null {
  if (element === root) {
    return [];
  }

  if (!root.contains(element)) {
    return null;
  }

  const path: number[] = [];
  let current: Element | null = element;

  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      return null;
    }

    let index = 0;
    for (
      let sibling = current.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      index++;
    }

    path.unshift(index);
    current = parent;
  }

  return current === root ? path : null;
}

export function getElementByPath(root: Element, path: number[]): Element | null {
  let element: Element = root;

  for (const index of path) {
    const child = element.children.item(index);
    if (!child) {
      return null;
    }
    element = child;
  }

  return element === root ? null : element;
}
