"use client";

import { useEffect, useRef, useState } from "react";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type RecordProps,
  type SvgExportContext,
  T,
  type TLShape,
  useEditor,
  useValue,
} from "tldraw";
import { renderPdfPage } from "./pdf";

// A page of a PDF, placed on the canvas as a locked background shape that
// everyone draws on top of. Rendering happens lazily, see `pdf.ts`.
//
// tldraw wants custom shapes registered in its global props map, so that
// `TLShape` (and therefore `TLRecord`) includes them.
declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    "pdf-page": { w: number; h: number; fileId: string; page: number };
  }
}

export type PdfPageShape = Extract<TLShape, { type: "pdf-page" }>;

const MAX_RENDER_WIDTH = 2560;

export class PdfPageShapeUtil extends BaseBoxShapeUtil<PdfPageShape> {
  static override type = "pdf-page" as const;
  static override props: RecordProps<PdfPageShape> = {
    w: T.number,
    h: T.number,
    fileId: T.string,
    page: T.number,
  };

  override getDefaultProps(): PdfPageShape["props"] {
    return { w: 612, h: 792, fileId: "", page: 1 };
  }

  override canEdit() {
    return false;
  }
  override canResize() {
    return false;
  }
  override hideRotateHandle() {
    return true;
  }
  override isAspectRatioLocked() {
    return true;
  }
  override canBeLaidOut() {
    return false;
  }

  override component(shape: PdfPageShape) {
    return (
      <HTMLContainer
        style={{
          pointerEvents: "none",
          background: "white",
          boxShadow: "0 1px 3px rgb(0 0 0 / 0.12), 0 0 0 1px rgb(0 0 0 / 0.06)",
        }}
      >
        <PdfPageCanvas shape={shape} />
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: PdfPageShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  // Used when exporting images, e.g. when sending a page to the chat
  override async toSvg(shape: PdfPageShape, _ctx: SvgExportContext) {
    const { w, h, fileId, page } = shape.props;
    const canvas = await renderPdfPage(
      fileId,
      page,
      Math.min(w * 2, MAX_RENDER_WIDTH)
    );
    return (
      <image
        href={canvas.toDataURL("image/jpeg", 0.9)}
        width={w}
        height={h}
        preserveAspectRatio="none"
      />
    );
  }
}

function PdfPageCanvas({ shape }: { shape: PdfPageShape }) {
  const { w, h, fileId, page } = shape.props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const editor = useEditor();
  // Re-render in coarse zoom steps only, so zooming doesn't thrash the cache
  const zoom = useValue(
    "zoom",
    () => {
      const z = editor.getZoomLevel();
      return Math.min(4, Math.max(0.25, Math.pow(2, Math.round(Math.log2(z)))));
    },
    [editor]
  );

  useEffect(() => {
    let cancelled = false;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const pixelWidth = Math.min(w * zoom * dpr, MAX_RENDER_WIDTH);

    renderPdfPage(fileId, page, pixelWidth)
      .then((rendered) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")?.drawImage(rendered, 0, 0);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, page, w, zoom]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: w, height: h, display: "block" }}
        aria-label={`PDF page ${page}`}
      />
      <span
        style={{
          position: "absolute",
          right: 8,
          bottom: 6,
          fontSize: Math.max(10, Math.min(14, w / 50)),
          color: "rgb(0 0 0 / 0.35)",
          fontFamily: "var(--font-sans, sans-serif)",
        }}
      >
        {error ? "Couldn't load page" : page}
      </span>
    </>
  );
}
