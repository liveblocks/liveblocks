"use client";

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
  copyAttributes(targetElement, sourceElement);
  targetElement.replaceChildren(
    ...Array.from(sourceElement.childNodes).map((node) =>
      document.importNode(node, true)
    )
  );
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
