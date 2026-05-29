"use client";

import {
  HTMLContainer,
  Rectangle2d,
  RecordProps,
  ShapeUtil,
  T,
  type TLResizeInfo,
  type TLShape,
  resizeBox,
} from "tldraw";
import { HTML_BOX_SHAPE_TYPE } from "@/lib/htmlBox";

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [HTML_BOX_SHAPE_TYPE]: {
      w: number;
      h: number;
      title: string;
      html: string;
      updatedAt: string;
    };
  }
}

export type HtmlBoxShape = TLShape<typeof HTML_BOX_SHAPE_TYPE>;

function iframeDocument(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body { margin: 0; padding: 0; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

export class HtmlBoxShapeUtil extends ShapeUtil<HtmlBoxShape> {
  static override type = HTML_BOX_SHAPE_TYPE;
  static override props: RecordProps<HtmlBoxShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    html: T.string,
    updatedAt: T.string,
  };

  getDefaultProps(): HtmlBoxShape["props"] {
    return {
      w: 420,
      h: 300,
      title: "Generated UI",
      html: "<section><p>Start generating...</p></section>",
      updatedAt: new Date().toISOString(),
    };
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  getGeometry(shape: HtmlBoxShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: HtmlBoxShape, info: TLResizeInfo<HtmlBoxShape>) {
    return resizeBox(shape, info);
  }

  component(shape: HtmlBoxShape) {
    return (
      <HTMLContainer
        className="overflow-hidden border border-neutral-300 bg-white shadow-sm"
        style={{ width: shape.props.w, height: shape.props.h }}
      >
        <iframe
          title={shape.props.title}
          sandbox="allow-same-origin allow-scripts"
          srcDoc={iframeDocument(shape.props.html)}
          className="h-full w-full border-0 pointer-events-none"
        />
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: HtmlBoxShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}

export const htmlBoxShapeUtils = [HtmlBoxShapeUtil];
