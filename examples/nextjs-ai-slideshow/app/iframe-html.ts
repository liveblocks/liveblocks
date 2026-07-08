"use client";

import { makeCursorSpring } from "@liveblocks/react-ui/_private";

type TransformSnapshot = {
  tagName: string;
  transform: string;
  rect: DOMRect;
};

// Updates an already-loaded iframe's document in place instead of swapping
// `srcDoc`, which would trigger a full document reload (white flash, lost
// document-level event listeners). A synthetic "load" event is dispatched so
// consumers that re-attach on load (e.g. the visual editor) get notified.
export function patchIframeHtml(iframe: HTMLIFrameElement | null, html: string) {
  if (!iframe) {
    return;
  }

  const document = iframe.contentDocument;
  if (!document) {
    iframe.srcdoc = html;
    return;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const sourceElement = parsed.documentElement;
  const targetElement = document.documentElement;
  const transforms = captureTransformSnapshots(targetElement);

  copyAttributes(targetElement, sourceElement);
  targetElement.replaceChildren(
    ...Array.from(sourceElement.childNodes).map((node) =>
      document.importNode(node, true)
    )
  );
  interpolateTransformChanges(targetElement, transforms);
  iframe.dispatchEvent(new Event("load"));
}

function copyAttributes(target: Element, source: Element) {
  for (const attribute of Array.from(target.attributes)) {
    if (!source.hasAttribute(attribute.name)) {
      target.removeAttribute(attribute.name);
    }
  }

  for (const attribute of Array.from(source.attributes)) {
    target.setAttribute(attribute.name, attribute.value);
  }
}

function captureTransformSnapshots(root: Element) {
  const snapshots = new Map<string, TransformSnapshot>();

  walkElements(root, [], (element, path) => {
    snapshots.set(path.join("."), {
      tagName: element.tagName,
      transform: getInlineTransform(element),
      rect: element.getBoundingClientRect(),
    });
  });

  return snapshots;
}

function interpolateTransformChanges(
  root: Element,
  snapshots: Map<string, TransformSnapshot>
) {
  walkElements(root, [], (element, path) => {
    const snapshot = snapshots.get(path.join("."));
    if (!snapshot || snapshot.tagName !== element.tagName) {
      return;
    }

    const transform = getInlineTransform(element);
    if (!transform || transform === snapshot.transform) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const deltaX = snapshot.rect.left - rect.left;
    const deltaY = snapshot.rect.top - rect.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
      return;
    }

    interpolateTransform(element, deltaX, deltaY, transform);
  });
}

function walkElements(
  root: Element,
  path: number[],
  visit: (element: Element, path: number[]) => void
) {
  visit(root, path);

  const children = Array.from(root.children);
  children.forEach((child, index) => {
    walkElements(child, [...path, index], visit);
  });
}

function getInlineTransform(element: Element) {
  const view = element.ownerDocument.defaultView;
  if (!view || !(element instanceof view.HTMLElement)) {
    return "";
  }

  return element.style.transform;
}

function interpolateTransform(
  element: Element,
  deltaX: number,
  deltaY: number,
  transform: string
) {
  const view = element.ownerDocument.defaultView;
  if (!view || !(element instanceof view.HTMLElement)) {
    return;
  }

  const spring = makeCursorSpring();
  let animation: Animation | null = null;

  const cleanup = () => {
    animation?.cancel();
    unsubscribe();
    spring.dispose();
  };

  const unsubscribe = spring.subscribe((point) => {
    if (!point) {
      cleanup();
      return;
    }

    if (Math.abs(point.x) < 0.5 && Math.abs(point.y) < 0.5) {
      cleanup();
      return;
    }

    const interpolatedTransform = `translate(${formatPx(point.x)}, ${formatPx(
      point.y
    )}) ${transform}`;

    if (!animation) {
      animation = createTransformAnimation(element, interpolatedTransform);
      return;
    }

    const effect = animation.effect;
    if (
      typeof view.KeyframeEffect === "function" &&
      effect instanceof view.KeyframeEffect
    ) {
      effect.setKeyframes([
        { transform: interpolatedTransform },
        { transform: interpolatedTransform },
      ]);
      animation.currentTime = 1;
    } else {
      animation.cancel();
      animation = createTransformAnimation(element, interpolatedTransform);
    }
  });

  spring.set({ x: deltaX, y: deltaY });
  spring.set({ x: 0, y: 0 });
}

function createTransformAnimation(element: Element, transform: string) {
  const animation = element.animate(
    [{ transform }, { transform }],
    { duration: 1, fill: "forwards" }
  );
  animation.pause();
  animation.currentTime = 1;
  return animation;
}

function formatPx(value: number) {
  return `${Math.round(value * 100) / 100}px`;
}
