// Loaded on demand from the sidebar (pulls in pdf.js and tldraw helpers).
import { getPdfPageSizes, MAX_PDF_PAGES, openPdf } from "@/components/tldraw/pdf";
import { createPdfPageShapes } from "@/components/tldraw/pdf-layout";

export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export function validatePdf(file: File) {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Please choose a PDF file");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDFs up to 50 MB are supported");
  }
}

// Reads the PDF locally to lay out its pages as tldraw shapes referencing
// the uploaded file. Pages are rendered lazily later, so this stays fast
// even for very long documents.
export async function preparePdf(file: File, fileId: string) {
  const pdf = await openPdf(await file.arrayBuffer());
  try {
    const sizes = await getPdfPageSizes(pdf);
    return {
      pageCount: sizes.length,
      truncated: pdf.numPages > MAX_PDF_PAGES,
      records: createPdfPageShapes(fileId, sizes),
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
