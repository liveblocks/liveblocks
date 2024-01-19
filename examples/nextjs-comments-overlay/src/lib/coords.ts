import { AccurateCursorPositions, DragOffset } from "@/liveblocks.config";

export function getCoordsFromPointerEvent<El>(
  e: PointerEvent,
  dragOffset: DragOffset = { x: 0, y: 0 }
): AccurateCursorPositions | null {
  if (!e.target || !(e.target as any)?.getBoundingClientRect) {
    return null;
  }

  const target = e.target as HTMLElement;

  // Get all parent elements
  const pathArray: HTMLElement[] =
    (e as any)._savedComposedPath || e.composedPath() || (e as any).path;

  // Generate a set of CSS selectors using the path
  const cursorSelectors = generateSelectors(pathArray);

  // Don't show cursor
  if (!cursorSelectors) {
    return null;
  }

  // Get percentage across current element
  const { width, height } = target.getBoundingClientRect();
  const xPercent = (e.offsetX - dragOffset.x) / width;
  const yPercent = (e.offsetY - dragOffset.y) / height;

  return {
    cursorSelectors,
    cursorX: xPercent,
    cursorY: yPercent,
  };
}

export function getCoordsFromElement<El>(
  target: Element,
  clientX: number,
  clientY: number,
  dragOffset: DragOffset = { x: 0, y: 0 }
): AccurateCursorPositions | null {
  if (!(target instanceof Element)) {
    return null;
  }

  // Get all parent elements
  const pathArray: Element[] = composedPathForElement(target);

  // Generate a set of CSS selectors using the path
  const cursorSelectors = generateSelectors(pathArray);

  // Don't show cursor
  if (!cursorSelectors) {
    return null;
  }

  // Get percentage across current element
  const { top, left, width, height } = target.getBoundingClientRect();
  const xPercent = (clientX - left - dragOffset.x) / width;
  const yPercent = (clientY - top - dragOffset.y) / height;

  return {
    cursorSelectors,
    cursorX: xPercent,
    cursorY: yPercent,
  };
}

function generateSelectors(pathArray: Element[]): string[] | null {
  let nthChildFromLowestIdSelectors: string[] = [];
  let nthChildSelectors: string[] = [];
  let classNameSelectors: string[] = [];

  let dontShowCursors = false;
  let reachedBody = false;
  let lowestId: null | string = null;

  pathArray.forEach((el) => {
    if (reachedBody || dontShowCursors) {
      return;
    }

    if ((el as HTMLElement)?.dataset.hideCursors) {
      dontShowCursors = true;
      return;
    }

    if (el.nodeName?.toLowerCase() === "body") {
      reachedBody = true;
    }

    // Selector with nth child and HTML element types
    // More performant than: [...el.parentNode.children].indexOf(el) + 1
    if (el?.parentNode?.children) {
      const nthIndex =
        Array.prototype.indexOf.call(el.parentNode.children, el) + 1;
      const currentNthChild = `${el.nodeName}:nth-child(${nthIndex})`;
      nthChildSelectors.push(currentNthChild);
      if (!lowestId) {
        nthChildFromLowestIdSelectors.push(currentNthChild);
      }
    }

    // Selector same as above, but stops at nearest id
    if (!lowestId && el?.id && el?.parentNode?.children) {
      lowestId = el.id;
    }

    // Selector with just class names
    // More performant than: [...el.classList].map(CSS.escape).join('.')
    if (el.classList) {
      const classes = Array.prototype.map
        .call(el.classList, CSS.escape)
        .join(".");
      classNameSelectors.push(el.nodeName + (classes ? "." + classes : ""));
    } else {
      classNameSelectors.push(el.nodeName);
    }
  });

  if (dontShowCursors) {
    return null;
  }

  // If no id found, selector not needed
  if (!lowestId) {
    nthChildFromLowestIdSelectors = [];
  } else {
    nthChildFromLowestIdSelectors.pop();
    nthChildFromLowestIdSelectors.push(`#${lowestId}`);
  }

  // Create CSS selectors
  const classNamePath = classNameSelectors.reverse().join(">") || "";
  const nthChildPath = nthChildSelectors.reverse().join(">") || "";
  const nthChildPathFromLowestId =
    nthChildFromLowestIdSelectors.reverse().join(">") || "";

  // If last element has id
  const lastElement = pathArray[pathArray.length - 1];
  const id = lastElement?.id || "";

  return [id, nthChildPathFromLowestId, nthChildPath, classNamePath].filter(
    (selector) => selector
  );
}

export function getCoordsFromAccurateCursorPositions({
  cursorSelectors,
  cursorX,
  cursorY,
}: AccurateCursorPositions) {
  if (typeof window === "undefined") {
    return null;
  }

  for (const selector of cursorSelectors) {
    if (selector) {
      try {
        const el = document.querySelector(selector);

        // If element exists and is visible
        if (el && el.getClientRects().length) {
          const { top, left, width, height } = el.getBoundingClientRect();
          return {
            x: left + width * cursorX + window.scrollX,
            y: top + height * cursorY + window.scrollY,
          };
        }
      } catch (err) {
        // Ignore errors if selectors don't work, and don't render cursors
      }
    }
  }

  return null;
}

export function getElementBeneath(
  el: HTMLElement,
  clientX: number,
  clientY: number
): Element | null {
  const prevPointerEvents = el.style.pointerEvents;
  el.style.pointerEvents = "none";
  const beneathElement = document.elementFromPoint(clientX, clientY);
  el.style.pointerEvents = prevPointerEvents;
  return beneathElement;
}

export function composedPathForElement(
  element: Element | EventTarget
): Array<Element> {
  const path: Array<Element> = [];

  let currentElement: Element | null = element as Element;
  while (currentElement) {
    path.push(currentElement);
    currentElement = currentElement.parentElement;
  }

  return path;
}
