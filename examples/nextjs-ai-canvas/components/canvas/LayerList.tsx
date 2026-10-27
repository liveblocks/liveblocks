"use client";

import { useMemo } from "react";
import { useValue, type Editor, type TLShape } from "tldraw";
import { getHtmlBoxDataFromShapeLike } from "@/lib/htmlBox";

function geoTypeLabel(shape: TLShape) {
  if (shape.type !== "geo" || !("geo" in shape.props)) {
    return null;
  }
  const geo = shape.props.geo;
  switch (geo) {
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Circle";
    case "triangle":
      return "Triangle";
    case "diamond":
      return "Diamond";
    case "cloud":
      return "Cloud";
    default:
      return "Shape";
  }
}

function getShapeLabel(shape: TLShape, index: number) {
  const htmlBoxData = getHtmlBoxDataFromShapeLike(shape);
  if (htmlBoxData) {
    return htmlBoxData.title || `HTML Box ${index + 1}`;
  }

  if (shape.type === "text") {
    const textValue =
      "text" in shape.props ? shape.props.text : "richText" in shape.props ? shape.props.richText : null;
    if (typeof textValue === "string" && textValue.trim().length > 0) {
      return textValue;
    }
    return `Text ${index + 1}`;
  }

  const geoLabel = geoTypeLabel(shape);
  if (geoLabel) {
    return `${geoLabel} ${index + 1}`;
  }

  const type = shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
  return `${type} ${index + 1}`;
}

function getShapeType(shape: TLShape) {
  const geoLabel = geoTypeLabel(shape);
  if (geoLabel) {
    return geoLabel;
  }
  return shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
}

export function LayerList({ editor }: { editor: Editor | null }) {
  const shapes = useValue(
    "layer-list-shapes",
    () => editor?.getCurrentPageShapesSorted() ?? [],
    [editor]
  );

  const rows = useMemo(
    () =>
      shapes.map((shape, index) => ({
        id: shape.id,
        label: getShapeLabel(shape, index),
        type: getShapeType(shape),
      })),
    [shapes]
  );

  if (!editor) {
    return <p className="text-sm text-neutral-500">Canvas not ready yet.</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">No components yet.</p>;
  }

  return (
    <div className="h-full overflow-y-auto agent-scrollbar">
      <ul className="flex flex-col gap-1 pr-1">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => {
                editor.select(row.id);
                editor.zoomToSelection();
              }}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-left hover:border-neutral-300"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {row.type}
              </p>
              <p className="truncate text-sm text-neutral-900">{row.label}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
