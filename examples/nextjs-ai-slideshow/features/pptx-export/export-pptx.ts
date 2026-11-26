import type * as Y from "yjs";
import {
  getSlideIds,
  getSlideText,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  STARTER_SLIDE_HTML,
} from "@/features/deck";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function createOffscreenIframe(html: string) {
  return new Promise<HTMLIFrameElement>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.addEventListener("load", () => resolve(iframe), { once: true });
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.width = String(SLIDE_WIDTH);
    iframe.height = String(SLIDE_HEIGHT);
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${SLIDE_WIDTH}px`;
    iframe.style.height = `${SLIDE_HEIGHT}px`;
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}

export async function exportDeckToPptx(ydoc: Y.Doc) {
  const [{ toPng }, { default: PptxGenJS }] = await Promise.all([
    import("html-to-image"),
    import("pptxgenjs"),
  ]);

  const exportedSlideIds = getSlideIds(ydoc);
  if (exportedSlideIds.length === 0) {
    throw new Error("No slides are ready to export yet.");
  }

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LIVEBLOCKS_16_9", width: 10, height: 5.625 });
  pptx.layout = "LIVEBLOCKS_16_9";

  for (const id of exportedSlideIds) {
    const html = getSlideText(ydoc, id).toString() || STARTER_SLIDE_HTML;
    const iframe = await createOffscreenIframe(html);

    try {
      await waitForPaint();
      const document = iframe.contentDocument;
      const element = document?.body ?? document?.documentElement;
      if (!element) {
        throw new Error("Slide preview is not ready yet.");
      }

      const dataUrl = await toPng(element, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        pixelRatio: 10,
        cacheBust: true,
        style: {
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          margin: "0",
        },
      });

      const slide = pptx.addSlide();
      slide.addImage({ data: dataUrl, x: 0, y: 0, w: 10, h: 5.625 });
    } finally {
      iframe.remove();
    }
  }

  await pptx.writeFile({ fileName: "slides.pptx" });
}
