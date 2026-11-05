import { LiveMap, LiveObject, type JsonObject } from "@liveblocks/node";
import {
  arrowShapeProps,
  compressLegacySegments,
  createShapeId,
  createUserId,
  drawShapeProps,
  geoShapeProps,
  InstancePresenceRecordType,
  textShapeProps,
  toRichText,
  type TLArrowShape,
  type TLDrawShape,
  type TLGeoShape,
  type TLPageId,
  type TLParentId,
  type TLShape,
  type TLShapeId,
  type TLTextShape,
} from "@tldraw/tlschema";
import { getIndexAbove, ZERO_INDEX_KEY, type IndexKey } from "@tldraw/utils";
import { z } from "zod";
import { AI_USER } from "@/app/database";
import { liveblocks } from "@/lib/liveblocks-server";
import { showAiPresence } from "./presence";

// Whiteboards and PDFs are tldraw canvases whose records live in the room's
// Storage under `whiteboards[docId]` (see `components/tldraw`). The assistant
// draws by writing complete tldraw shape records there. PDF pages are locked
// `pdf-page` shapes stacked vertically, so "draw on page 2" means offsetting
// by that page shape's position.

const PAGE_ID = "page:page" as TLPageId;
const PARENT_ID = PAGE_ID as TLParentId;

// Pause between shapes, so people can watch the assistant draw
const SHAPE_DELAY_MS = 250;

// ---------------------------------------------------------------------------
// What the model can draw
// ---------------------------------------------------------------------------

const color = z
  .enum([
    "black",
    "grey",
    "light-violet",
    "violet",
    "blue",
    "light-blue",
    "yellow",
    "orange",
    "green",
    "light-green",
    "light-red",
    "red",
    "white",
  ])
  .optional()
  .describe("Stroke colour. Defaults to violet, the assistant's colour.");

const point = z.object({ x: z.number(), y: z.number() });

export const aiShapeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z
      .enum([
        "rectangle",
        "ellipse",
        "triangle",
        "diamond",
        "star",
        "cloud",
        "hexagon",
        "x-box",
        "check-box",
      ])
      .describe("Use `ellipse` to circle something."),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    text: z.string().optional().describe("Label shown inside the shape"),
    color,
    fill: z.enum(["none", "semi", "solid"]).optional(),
    dash: z.enum(["draw", "solid", "dashed", "dotted"]).optional(),
  }),
  z.object({
    kind: z.literal("text"),
    x: z.number(),
    y: z.number(),
    text: z.string().min(1),
    color,
    size: z.enum(["s", "m", "l", "xl"]).optional(),
  }),
  z.object({
    kind: z.literal("arrow"),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    text: z.string().optional().describe("Label along the arrow"),
    color,
  }),
  z.object({
    kind: z.literal("draw").describe("A freehand stroke through the points"),
    points: z.array(point).min(2),
    color,
    closed: z.boolean().optional(),
  }),
  z.object({
    kind: z
      .literal("highlight")
      .describe("A translucent highlighter box, e.g. over a line of text"),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    color,
  }),
]);

export type AiShape = z.infer<typeof aiShapeSchema>;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

type CanvasPage = { page: number; x: number; y: number; w: number; h: number };
type CanvasShape = {
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
};

export type CanvasContents = {
  pages: CanvasPage[];
  shapes: CanvasShape[];
};

export async function readCanvas(
  roomId: string,
  docId: string
): Promise<CanvasContents> {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  const whiteboards = isRecord(storage) ? storage.whiteboards : undefined;
  const records = isRecord(whiteboards) ? whiteboards[docId] : undefined;

  const pages: CanvasPage[] = [];
  const shapes: CanvasShape[] = [];
  for (const record of Object.values(isRecord(records) ? records : {})) {
    if (!isRecord(record) || record.typeName !== "shape") continue;
    const props = isRecord(record.props) ? record.props : {};
    const x = numberOr(record.x, 0);
    const y = numberOr(record.y, 0);
    if (record.type === "pdf-page") {
      pages.push({
        page: numberOr(props.page, pages.length + 1),
        x,
        y,
        w: numberOr(props.w, 0),
        h: numberOr(props.h, 0),
      });
      continue;
    }
    const shape: CanvasShape = { type: String(record.type), x, y };
    if (typeof props.w === "number") shape.w = props.w;
    if (typeof props.h === "number") shape.h = props.h;
    const text = richTextToString(props.richText);
    if (text) shape.text = text;
    shapes.push(shape);
  }
  pages.sort((a, b) => a.page - b.page);
  return { pages, shapes };
}

export function describeCanvas(contents: CanvasContents) {
  const lines: string[] = [];
  if (contents.pages.length > 0) {
    lines.push(
      "PDF pages (coordinates for drawing on a page are relative to its top-left corner):"
    );
    for (const page of contents.pages) {
      lines.push(`- page ${page.page}: ${page.w} × ${page.h}`);
    }
  } else {
    lines.push("Blank whiteboard (infinite canvas, origin at the top-left).");
  }
  if (contents.shapes.length === 0) {
    lines.push("No drawings yet.");
  } else {
    lines.push(`Existing drawings (${contents.shapes.length}):`);
    for (const shape of contents.shapes.slice(0, 60)) {
      const size =
        shape.w !== undefined && shape.h !== undefined
          ? ` ${shape.w}×${shape.h}`
          : "";
      const text = shape.text ? ` "${shape.text}"` : "";
      lines.push(
        `- ${shape.type} at (${Math.round(shape.x)}, ${Math.round(shape.y)})${size}${text}`
      );
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

export async function drawOnCanvas(
  roomId: string,
  docId: string,
  shapes: AiShape[],
  page?: number
): Promise<{ drawnShapes: number }> {
  const selected: TLShapeId[] = [];

  for (const [i, aiShape] of shapes.entries()) {
    let cursor = { x: 0, y: 0 };
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      let whiteboards = root.get("whiteboards");
      if (!whiteboards) {
        whiteboards = new LiveMap();
        root.set("whiteboards", whiteboards);
      }
      let records = whiteboards.get(docId);
      if (!records) {
        records = new LiveMap();
        whiteboards.set(docId, records);
      }

      const offset = page ? getPageOffset(records, page) : { x: 0, y: 0 };
      const index = getIndexAbove(getTopIndex(records));
      const shape = toTldrawShape(aiShape, offset, index);
      records.set(shape.id, LiveObject.from(toJsonObject(shape)));

      selected.push(shape.id);
      cursor = { x: shape.x, y: shape.y };
    });

    await showAiPresence(roomId, {
      docId,
      tldraw: cursorPresence(cursor, selected),
    });
    if (i < shapes.length - 1) {
      await sleep(SHAPE_DELAY_MS);
    }
  }

  return { drawnShapes: shapes.length };
}

// The record map of one canvas, as declared in `liveblocks.config.ts`
type Records = NonNullable<
  ReturnType<Liveblocks["Storage"]["whiteboards"]["get"]>
>;

function getPageOffset(records: Records, page: number) {
  const record = records.get(createShapeId(`pdf-page-${page}`));
  const json = record instanceof LiveObject ? record.toJSON() : record;
  if (!json) {
    throw new Error(`This document has no page ${page}`);
  }
  return { x: numberOr(json.x, 0), y: numberOr(json.y, 0) };
}

// Fractional index above every existing shape, so new drawings land on top
function getTopIndex(records: Records): IndexKey {
  let top: IndexKey = ZERO_INDEX_KEY;
  for (const record of records.values()) {
    const json = record instanceof LiveObject ? record.toJSON() : record;
    if (
      json.typeName === "shape" &&
      typeof json.index === "string" &&
      json.index > top
    ) {
      // Indices come back from Storage as plain strings, but tldraw wrote
      // them as `IndexKey`s, and they sort lexicographically
      top = json.index as IndexKey;
    }
  }
  return top;
}

// Runs tldraw's own validators over the props we build, so a bad value
// (an unknown colour, say) fails here instead of breaking everyone's canvas
function validated<Shape extends TLShape>(
  shape: Shape,
  validators: Record<string, { validate(value: unknown): unknown }>
): Shape {
  const props = new Map(Object.entries(shape.props));
  for (const [key, validator] of Object.entries(validators)) {
    validator.validate(props.get(key));
  }
  return shape;
}

function toTldrawShape(
  shape: AiShape,
  offset: { x: number; y: number },
  index: IndexKey
): TLShape {
  const strokeColor = shape.color ?? "violet";
  const base = {
    typeName: "shape" as const,
    rotation: 0,
    index,
    parentId: PARENT_ID,
    isLocked: false,
    opacity: 1,
    meta: {},
  };

  switch (shape.kind) {
    case "text": {
      const record: TLTextShape = {
        ...base,
        id: createShapeId(),
        type: "text",
        x: offset.x + shape.x,
        y: offset.y + shape.y,
        props: {
          color: strokeColor,
          size: shape.size ?? "m",
          w: 8,
          font: "draw",
          textAlign: "start",
          autoSize: true,
          scale: 1,
          richText: toRichText(shape.text),
        },
      };
      return validated(record, textShapeProps);
    }
    case "arrow": {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      const record: TLArrowShape = {
        ...base,
        id: createShapeId(),
        type: "arrow",
        x: offset.x + x,
        y: offset.y + y,
        props: {
          kind: "arc",
          elbowMidPoint: 0.5,
          dash: "draw",
          size: "m",
          fill: "none",
          color: strokeColor,
          labelColor: "black",
          bend: 0,
          start: { x: shape.x1 - x, y: shape.y1 - y },
          end: { x: shape.x2 - x, y: shape.y2 - y },
          arrowheadStart: "none",
          arrowheadEnd: "arrow",
          richText: toRichText(shape.text ?? ""),
          labelPosition: 0.5,
          font: "draw",
          scale: 1,
        },
      };
      return validated(record, arrowShapeProps);
    }
    case "draw": {
      const x = Math.min(...shape.points.map((p) => p.x));
      const y = Math.min(...shape.points.map((p) => p.y));
      const points = shape.points.map((p) => ({
        x: p.x - x,
        y: p.y - y,
        z: 0.5,
      }));
      if (shape.closed) {
        points.push({ ...points[0] });
      }
      const record: TLDrawShape = {
        ...base,
        id: createShapeId(),
        type: "draw",
        x: offset.x + x,
        y: offset.y + y,
        props: {
          segments: compressLegacySegments([{ type: "free", points }]),
          color: strokeColor,
          fill: "none",
          dash: "draw",
          size: "m",
          isComplete: true,
          isClosed: shape.closed ?? false,
          isPen: false,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
        },
      };
      return validated(record, drawShapeProps);
    }
    case "highlight": {
      const record: TLGeoShape = {
        ...base,
        opacity: 0.4,
        id: createShapeId(),
        type: "geo",
        x: offset.x + shape.x,
        y: offset.y + shape.y,
        props: {
          ...geoDefaults(shape.color ?? "yellow"),
          geo: "rectangle",
          w: shape.w,
          h: shape.h,
          fill: "solid",
          dash: "solid",
        },
      };
      return validated(record, geoShapeProps);
    }
    default: {
      const record: TLGeoShape = {
        ...base,
        id: createShapeId(),
        type: "geo",
        x: offset.x + shape.x,
        y: offset.y + shape.y,
        props: {
          ...geoDefaults(strokeColor),
          geo: shape.kind,
          w: shape.w,
          h: shape.h,
          fill: shape.fill ?? "none",
          dash: shape.dash ?? "draw",
          richText: toRichText(shape.text ?? ""),
        },
      };
      return validated(record, geoShapeProps);
    }
  }
}

function geoDefaults(color: TLGeoShape["props"]["color"]): TLGeoShape["props"] {
  return {
    w: 100,
    h: 100,
    geo: "rectangle",
    dash: "draw",
    growY: 0,
    url: "",
    scale: 1,
    flipX: false,
    flipY: false,
    color,
    labelColor: "black",
    fill: "none",
    size: "m",
    font: "draw",
    align: "middle",
    verticalAlign: "middle",
    richText: toRichText(""),
  };
}

// The assistant's tldraw cursor, plus a selection box around what it drew
function cursorPresence(
  cursor: { x: number; y: number },
  selected: TLShapeId[]
) {
  const record = InstancePresenceRecordType.create({
    id: InstancePresenceRecordType.createId(AI_USER.id),
    userId: createUserId(AI_USER.id),
    userName: AI_USER.info.name,
    color: AI_USER.info.color,
    currentPageId: PAGE_ID,
    cursor: { x: cursor.x, y: cursor.y, type: "default", rotation: 0 },
    selectedShapeIds: selected,
    lastActivityTimestamp: Date.now(),
  });
  return toJsonObject(record);
}

// tldraw records are plain JSON, but their types use branded ids and no
// index signature, so TypeScript can't see them as `JsonObject` on its own.
function toJsonObject(record: object): JsonObject {
  return record as JsonObject;
}

function richTextToString(value: unknown): string {
  if (!isRecord(value)) return "";
  if (value.type === "text" && typeof value.text === "string")
    return value.text;
  if (!Array.isArray(value.content)) return "";
  return value.content
    .map(richTextToString)
    .join(value.type === "doc" ? "\n" : "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
