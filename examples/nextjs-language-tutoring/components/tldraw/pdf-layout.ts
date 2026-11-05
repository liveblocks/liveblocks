import { createShapeId, getIndices, type TLShapeId } from "tldraw";
import type { PdfPageShape } from "./pdf-page-shape";

export const PDF_PAGE_GAP = 32;

export function getPdfPageShapeId(page: number): TLShapeId {
  return createShapeId(`pdf-page-${page}`);
}

// Builds the locked page shapes for a PDF, stacked vertically. These are
// plain records written straight into Storage when the PDF is uploaded, so
// everyone opening the document sees the same layout.
export function createPdfPageShapes(
  fileId: string,
  sizes: { width: number; height: number }[]
): PdfPageShape[] {
  const indices = getIndices(sizes.length);
  let y = 0;
  return sizes.map((size, i) => {
    const shape: PdfPageShape = {
      id: getPdfPageShapeId(i + 1),
      typeName: "shape",
      type: "pdf-page",
      x: 0,
      y,
      rotation: 0,
      index: indices[i],
      parentId: "page:page" as PdfPageShape["parentId"],
      isLocked: true,
      opacity: 1,
      props: { w: size.width, h: size.height, fileId, page: i + 1 },
      meta: {},
    };
    y += size.height + PDF_PAGE_GAP;
    return shape;
  });
}
