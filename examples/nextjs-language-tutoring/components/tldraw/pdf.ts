// PDF rendering with pdf.js. PDFs can be hundreds of pages long, so nothing is
// pre-rendered: the uploaded file is stored once in Liveblocks, each page is a
// locked tldraw shape, and pages are rasterised on demand when they are
// visible (tldraw only mounts shapes inside the viewport).

import type { PDFDocumentProxy } from "pdfjs-dist";

export const MAX_PDF_PAGES = 500;

type PdfJs = typeof import("pdfjs-dist");

let pdfjs$: Promise<PdfJs> | undefined;

async function loadPdfJs(): Promise<PdfJs> {
  pdfjs$ ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return pdfjs;
  });
  return pdfjs$;
}

export async function openPdf(source: string | ArrayBuffer) {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument(
    typeof source === "string" ? { url: source } : { data: source }
  ).promise;
}

// Page sizes in PDF points, used to lay the pages out before any rendering
export async function getPdfPageSizes(pdf: PDFDocumentProxy) {
  const count = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const sizes: { width: number; height: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const { width, height } = page.getViewport({ scale: 1 });
    sizes.push({ width, height });
  }
  return sizes;
}

// ---------------------------------------------------------------------------
// Document + page cache
//
// Files are identified by their Liveblocks file id. The URL to download them
// is signed and short-lived, so the PDF document component registers a
// resolver that the shape util can call whenever it needs the file.
// ---------------------------------------------------------------------------

type UrlResolver = () => Promise<string>;

const resolvers = new Map<string, UrlResolver>();
const documents = new Map<string, Promise<PDFDocumentProxy>>();

export function registerPdfFile(fileId: string, resolve: UrlResolver) {
  resolvers.set(fileId, resolve);
  return () => {
    resolvers.delete(fileId);
  };
}

export function getPdfDocument(fileId: string): Promise<PDFDocumentProxy> {
  let document$ = documents.get(fileId);
  if (!document$) {
    const resolve = resolvers.get(fileId);
    if (!resolve) {
      return Promise.reject(new Error(`Unknown PDF file ${fileId}`));
    }
    document$ = resolve()
      .then((url) => openPdf(url))
      .catch((error: unknown) => {
        documents.delete(fileId);
        throw error;
      });
    documents.set(fileId, document$);
  }
  return document$;
}

const MAX_CACHED_PAGES = 48;
const renderedPages = new Map<string, Promise<HTMLCanvasElement>>();

// Rasterise one page at the given pixel width. Results are cached (LRU-ish)
// so scrolling back and forth doesn't re-render.
export function renderPdfPage(
  fileId: string,
  pageNumber: number,
  pixelWidth: number
): Promise<HTMLCanvasElement> {
  const bucket = Math.ceil(pixelWidth / 256) * 256;
  const key = `${fileId}:${pageNumber}:${bucket}`;
  const cached = renderedPages.get(key);
  if (cached) {
    renderedPages.delete(key);
    renderedPages.set(key, cached);
    return cached;
  }

  const canvas$ = (async () => {
    const pdf = await getPdfDocument(fileId);
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: bucket / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas;
  })();

  canvas$.catch(() => renderedPages.delete(key));
  renderedPages.set(key, canvas$);
  while (renderedPages.size > MAX_CACHED_PAGES) {
    const oldest = renderedPages.keys().next().value;
    if (oldest === undefined) break;
    renderedPages.delete(oldest);
  }
  return canvas$;
}
