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
import { agentStatusLabel, colorFromName } from "@/lib/agentName";

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [HTML_BOX_SHAPE_TYPE]: {
      w: number;
      h: number;
      title: string;
      html: string;
      updatedAt: string;
      agentName: string;
      agentStatus: string;
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
    agentName: T.string,
    agentStatus: T.string,
  };

  getDefaultProps(): HtmlBoxShape["props"] {
    return {
      w: 420,
      h: 300,
      title: "Generated UI",
      html: "<section><p>Start generating...</p></section>",
      updatedAt: new Date().toISOString(),
      agentName: "",
      agentStatus: "",
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
    const { agentName, agentStatus } = shape.props;
    const agentColor = agentName ? colorFromName(agentName) : "";
    const statusLabel = agentStatusLabel(agentStatus);

    return (
      <HTMLContainer
        className="relative overflow-hidden border border-neutral-300 bg-white shadow-sm"
        style={{ width: shape.props.w, height: shape.props.h }}
      >
        <iframe
          title={shape.props.title}
          sandbox="allow-same-origin allow-scripts"
          srcDoc={iframeDocument(shape.props.html)}
          className="h-full w-full border-0 pointer-events-none"
        />
        {agentName ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
            style={{ color: agentColor }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
              }}
            >
              <path d="M5.5 3.2l13.3 7.6c.7.4.6 1.5-.2 1.7l-5.5 1.5-2.7 5.2c-.4.7-1.5.6-1.7-.2L5.1 4.2c-.2-.8.6-1.4 1.3-1z" />
            </svg>
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none text-white"
              style={{ background: agentColor }}
            >
              {statusLabel ? `${agentName} · ${statusLabel}` : agentName}
            </span>
          </div>
        ) : null}
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
