"use client";

import "tldraw/tldraw.css";
import { useRoom, useUploadFile } from "@liveblocks/react/suspense";
import { useEffect, useMemo, useRef } from "react";
import { Box, type Editor, Tldraw } from "tldraw";
import { createLiveblocksAssetStore } from "@/components/tldraw/liveblocks-asset-store";
import { registerPdfFile } from "@/components/tldraw/pdf";
import { getPdfPageShapeId } from "@/components/tldraw/pdf-layout";
import { PdfPageShapeUtil } from "@/components/tldraw/pdf-page-shape";
import { useStorageStore } from "@/components/tldraw/use-storage-store";
import type { DocumentInfo } from "@/liveblocks.config";
import type { SnapshotProducer } from "./document-view";

/**
 * IMPORTANT: LICENSE REQUIRED
 * To remove the tldraw watermark, you must first purchase a license.
 * Learn more: https://tldraw.dev/community/license
 */

const SHAPE_UTILS = [PdfPageShapeUtil];

// A tldraw canvas synced through Liveblocks Storage. PDF documents are the
// same canvas with the PDF's pages laid out as locked background shapes.
export function WhiteboardDoc({
  doc,
  registerProducer,
}: {
  doc: DocumentInfo;
  registerProducer: (producer: SnapshotProducer | null) => void;
}) {
  const room = useRoom();
  const uploadFile = useUploadFile();
  const editorRef = useRef<Editor | null>(null);

  const assets = useMemo(
    () => createLiveblocksAssetStore(room, uploadFile),
    [room, uploadFile]
  );
  const store = useStorageStore({
    docId: doc.id,
    assets,
    shapeUtils: SHAPE_UTILS,
  });

  // Let the page shapes find the PDF file (URLs are signed and expire)
  const pdfId = doc.pdf?.id;
  useEffect(() => {
    if (!pdfId) return;
    return registerPdfFile(pdfId, () => room.getFileUrl(pdfId));
  }, [pdfId, room]);

  useEffect(() => {
    registerProducer(async ({ page }) => {
      const editor = editorRef.current;
      if (!editor) {
        throw new Error("The canvas isn't ready yet");
      }

      let bounds: Box;
      if (doc.type === "pdf" && page) {
        const pageBounds = editor.getShapePageBounds(getPdfPageShapeId(page));
        if (!pageBounds) {
          throw new Error(`Page ${page} isn't on the canvas`);
        }
        bounds = pageBounds;
      } else {
        bounds = editor.getViewportPageBounds();
      }

      const shapeIds = [...editor.getCurrentPageShapeIds()];
      if (shapeIds.length === 0) {
        throw new Error("There's nothing on the canvas yet");
      }

      const { blob, width, height } = await editor.toImage(shapeIds, {
        bounds,
        padding: 0,
        background: true,
        format: "png",
        pixelRatio: 2,
      });
      return { kind: "image", blob, width, height, page };
    });
    return () => registerProducer(null);
  }, [doc.type, registerProducer]);

  return (
    <div className="absolute inset-0">
      <Tldraw
        store={store}
        shapeUtils={SHAPE_UTILS}
        onMount={(editor) => {
          editorRef.current = editor;
          if (doc.type === "pdf") {
            editor.setCameraOptions({
              // Pages are read top to bottom, like a document
              wheelBehavior: "pan",
            });
            const first = editor.getShapePageBounds(getPdfPageShapeId(1));
            if (first) {
              editor.zoomToBounds(first, { inset: 24 });
            }
          }
        }}
        autoFocus
      />
    </div>
  );
}
