export const HTML_BOX_SHAPE_TYPE = "html-box" as const;

export type HtmlBoxMeta = {
  kind: "html-canvas-box";
  title: string;
  html: string;
  updatedAt: string;
};

export type HtmlBoxData = {
  title: string;
  html: string;
  updatedAt: string;
  w: number;
  h: number;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function createShapeIndex() {
  return `a${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

export function normalizeBoxTitle(rawTitle: string, fallback = "New Design") {
  const words = rawTitle
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (words.length === 0) {
    return fallback;
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function createRichText(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text
          ? [
              {
                type: "text",
                text,
              },
            ]
          : [],
      },
    ],
  };
}

export function htmlToPreviewText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

export function createHtmlBoxMeta(title: string, html: string): HtmlBoxMeta {
  return {
    kind: "html-canvas-box",
    title,
    html,
    updatedAt: new Date().toISOString(),
  };
}

export function getHtmlBoxMeta(value: unknown): HtmlBoxMeta | null {
  const meta = asObject(value);
  if (!meta) {
    return null;
  }
  if (
    meta.kind === "html-canvas-box" &&
    typeof meta.title === "string" &&
    typeof meta.html === "string"
  ) {
    return {
      kind: "html-canvas-box",
      title: meta.title,
      html: meta.html,
      updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : "",
    };
  }
  return null;
}

export function getHtmlBoxDataFromShapeLike(value: unknown): HtmlBoxData | null {
  const shape = asObject(value);
  if (!shape || shape.typeName !== "shape") {
    return null;
  }

  if (shape.type === HTML_BOX_SHAPE_TYPE) {
    const props = asObject(shape.props);
    if (!props) {
      return null;
    }
    if (typeof props.title !== "string" || typeof props.html !== "string") {
      return null;
    }
    return {
      title: props.title,
      html: props.html,
      updatedAt: typeof props.updatedAt === "string" ? props.updatedAt : "",
      w: typeof props.w === "number" ? props.w : 320,
      h: typeof props.h === "number" ? props.h : 180,
    };
  }

  // Read-only compatibility for pre-custom-shape demo records.
  if (shape.type === "geo") {
    const meta = getHtmlBoxMeta(shape.meta);
    if (!meta) {
      return null;
    }
    const props = asObject(shape.props);
    return {
      title: meta.title,
      html: meta.html,
      updatedAt: meta.updatedAt,
      w: props && typeof props.w === "number" ? props.w : 320,
      h: props && typeof props.h === "number" ? props.h : 180,
    };
  }

  return null;
}

export function getHtmlBoxDataFromStorageRecord(
  records: Record<string, unknown> | undefined,
  shapeId: string
): HtmlBoxData | null {
  if (!records) {
    return null;
  }

  const candidates = [shapeId, decodeURIComponent(shapeId)];
  for (const candidate of candidates) {
    const record = records[candidate];
    const data = getHtmlBoxDataFromShapeLike(record);
    if (data) {
      return data;
    }
  }

  return null;
}

export function createHtmlBoxShapeRecord(input: {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  html: string;
  updatedAt?: string;
  parentId?: string;
  index?: string;
  rotation?: number;
  isLocked?: boolean;
  opacity?: number;
  agentName?: string;
  agentStatus?: string;
}) {
  const title = normalizeBoxTitle(input.title, "New Design");
  const updatedAt = input.updatedAt ?? new Date().toISOString();

  return {
    id: input.id ?? `shape:${crypto.randomUUID()}`,
    typeName: "shape",
    type: HTML_BOX_SHAPE_TYPE,
    x: input.x,
    y: input.y,
    rotation: input.rotation ?? 0,
    isLocked: input.isLocked ?? false,
    opacity: input.opacity ?? 1,
    parentId: input.parentId ?? "page:page",
    index: input.index ?? createShapeIndex(),
    props: {
      w: input.w,
      h: input.h,
      title,
      html: input.html,
      updatedAt,
      agentName: input.agentName ?? "",
      agentStatus: input.agentStatus ?? "",
    },
    // Keep metadata for backwards compatibility with previous drawer/preview logic.
    meta: {
      kind: "html-canvas-box",
      title,
      html: input.html,
      updatedAt,
    },
  };
}

export function normalizeHtmlBoxShapeLikeRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  if (record.typeName !== "shape" || record.type !== HTML_BOX_SHAPE_TYPE) {
    return record;
  }

  const props = asObject(record.props);
  const data = getHtmlBoxDataFromShapeLike(record);
  const title = data?.title ?? "Generated UI";
  const html = data?.html ?? "";
  const updatedAt = data?.updatedAt || new Date().toISOString();
  const agentName =
    props && typeof props.agentName === "string" ? props.agentName : "";
  const agentStatus =
    props && typeof props.agentStatus === "string" ? props.agentStatus : "";

  return {
    ...record,
    props: {
      w: props && typeof props.w === "number" ? props.w : 320,
      h: props && typeof props.h === "number" ? props.h : 180,
      title,
      html,
      updatedAt,
      agentName,
      agentStatus,
    },
    meta: {
      kind: "html-canvas-box",
      title,
      html,
      updatedAt,
    },
  };
}

export function normalizeGeoShapeLikeRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  if (
    record.typeName !== "shape" ||
    record.type !== "geo" ||
    typeof record.props !== "object" ||
    record.props === null
  ) {
    return record;
  }

  const props = record.props as Record<string, unknown>;
  const meta = getHtmlBoxMeta(record.meta);
  const previewText = meta
    ? `${meta.title}\n${htmlToPreviewText(meta.html)}`
    : "";
  const richText =
    typeof props.richText === "object" && props.richText !== null
      ? props.richText
      : createRichText(previewText);

  return {
    ...record,
    props: {
      geo: typeof props.geo === "string" ? props.geo : "rectangle",
      dash: typeof props.dash === "string" ? props.dash : "draw",
      url: typeof props.url === "string" ? props.url : "",
      w: typeof props.w === "number" ? props.w : 320,
      h: typeof props.h === "number" ? props.h : 180,
      growY: typeof props.growY === "number" ? props.growY : 0,
      scale: typeof props.scale === "number" ? props.scale : 1,
      labelColor: typeof props.labelColor === "string" ? props.labelColor : "black",
      color: typeof props.color === "string" ? props.color : "black",
      fill: typeof props.fill === "string" ? props.fill : "none",
      size: typeof props.size === "string" ? props.size : "m",
      font: typeof props.font === "string" ? props.font : "draw",
      align: typeof props.align === "string" ? props.align : "middle",
      verticalAlign:
        typeof props.verticalAlign === "string" ? props.verticalAlign : "middle",
      richText,
    },
  };
}

export function normalizeShapeLikeRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  if (record.typeName !== "shape") {
    return record;
  }

  if (record.type === HTML_BOX_SHAPE_TYPE) {
    return normalizeHtmlBoxShapeLikeRecord(record);
  }

  if (record.type === "geo") {
    return normalizeGeoShapeLikeRecord(record);
  }

  return record;
}
