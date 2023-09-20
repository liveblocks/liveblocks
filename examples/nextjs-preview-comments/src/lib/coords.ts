import { AccurateCursorPositions, DragOffset } from "@/liveblocks.config";

export function getCoordsFromPointerEvent<El>(
  e: PointerEvent,
  dragOffset: DragOffset = { x: 0, y: 0 }
): AccurateCursorPositions | null {
  if (!e.target || !(e.target as any)?.getBoundingClientRect) {
    return null;
  }

  const target = e.target as HTMLElement;

  // === GET SELECTORS FOR CURRENT ELEMENT =======================================
  const pathArray: HTMLElement[] =
    (e as any)._savedComposedPath || e.composedPath() || (e as any).path;

  let nthChildFromLowestIdSelectors: string[] = [];
  let nthChildSelectors: string[] = [];
  let classNameSelectors: string[] = [];

  let reachedBody = false;
  let idFound = false;
  pathArray.forEach((el) => {
    if (reachedBody) {
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
      nthChildFromLowestIdSelectors.push(currentNthChild);
    }

    // Selector same as above, but stops at nearest id
    if (el?.id) {
      idFound = true;
      nthChildFromLowestIdSelectors = [`#${el.id}`];
    }

    // Selector with just class names
    // More performant than: [...el.classList].map(CSS.escape).join('.')
    const classes = Array.prototype.map
      .call(el.classList, CSS.escape)
      .join(".");
    classNameSelectors.push(el.nodeName + (classes ? "." + classes : ""));
  });

  // If no id found, selector not needed
  if (!idFound) {
    nthChildFromLowestIdSelectors = [];
  }

  // Create CSS selectors
  const classNamePath = classNameSelectors.reverse().join(">") || "";
  const nthChildPath = nthChildSelectors.reverse().join(">") || "";
  const nthChildPathFromLowestId =
    nthChildFromLowestIdSelectors.reverse().join(">") || "";

  // If last element has id or data-strapi-editable
  const lastElement = pathArray[pathArray.length - 1];
  const id = lastElement?.id || "";
  const strapiData = lastElement?.dataset?.["strapi-editable"] || "";

  // Get percentage across current element
  const { width, height } = target.getBoundingClientRect();
  const xPercent = (e.offsetX - dragOffset.x) / width;
  const yPercent = (e.offsetY - dragOffset.y) / height;

  return {
    cursorSelectors: [
      strapiData,
      id,
      nthChildPathFromLowestId,
      nthChildPath,
      classNamePath,
    ].filter((selector) => selector),
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

  // === GET SELECTORS FOR CURRENT ELEMENT =======================================
  const pathArray: Element[] = composedPathForElement(target);

  let nthChildFromLowestIdSelectors: string[] = [];
  let nthChildSelectors: string[] = [];
  let classNameSelectors: string[] = [];

  let reachedBody = false;
  let idFound = false;
  pathArray.forEach((el) => {
    if (reachedBody) {
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
    }

    // Selector same as above, but stops at nearest id
    if (el?.id && el?.parentNode?.children) {
      idFound = true;
      nthChildFromLowestIdSelectors = [`#${el.id}`];
      const nthIndex =
        Array.prototype.indexOf.call(el.parentNode.children, el) + 1;
      const currentNthChild = `${el.nodeName}:nth-child(${nthIndex})`;
      nthChildFromLowestIdSelectors.push(currentNthChild);
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

  // If no id found, selector not needed
  if (!idFound) {
    nthChildFromLowestIdSelectors = [];
  }

  // Create CSS selectors
  const classNamePath = classNameSelectors.reverse().join(">") || "";
  const nthChildPath = nthChildSelectors.reverse().join(">") || "";
  const nthChildPathFromLowestId =
    nthChildFromLowestIdSelectors.reverse().join(">") || "";

  // If last element has id or data-strapi-editable
  const lastElement = pathArray[pathArray.length - 1];
  const id = lastElement?.id || "";
  const strapiData = lastElement?.dataset?.["strapi-editable"] || "";

  // Get percentage across current element
  const rect = target.getBoundingClientRect();
  const xPercent = (clientX - rect.left - dragOffset.x) / rect.width;
  const yPercent = (clientY - rect.top - dragOffset.y) / rect.height;

  return {
    cursorSelectors: [
      strapiData,
      id,
      nthChildPathFromLowestId,
      nthChildPath,
      classNamePath,
    ].filter((selector) => selector),
    cursorX: xPercent,
    cursorY: yPercent,
  };
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

        if (el) {
          const { top, left, width, height } = el.getBoundingClientRect();
          return {
            x: left + width * cursorX + window.scrollX,
            y: top + height * cursorY + window.scrollY,
          };
        }
      } catch (err) {
        // ignore
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
