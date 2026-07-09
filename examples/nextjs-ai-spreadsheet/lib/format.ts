import type { CSSProperties } from "react";
import type { CellFormat, NumberFormat } from "@/liveblocks.config";

// Parses the numeric part of a cell value, ignoring currency/percent symbols
// and thousands separators. Returns null when the value isn't a number.
function toNumber(value: string): number | null {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (cleaned === "") {
    return null;
  }
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

// Turns a raw cell value into what's shown in the grid, applying the number
// format (Excel-style: "currency" → $1,234.00, "percent" → 50%).
export function formatDisplayValue(
  value: string,
  numberFormat?: NumberFormat
): string {
  if (!numberFormat || numberFormat === "general") {
    return value;
  }

  const num = toNumber(value);
  if (num === null) {
    return value;
  }

  if (numberFormat === "currency") {
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  // percent
  return `${(num * 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

// Inline style for the value element, derived from a cell's format.
export function valueStyleFromFormat(format?: CellFormat): CSSProperties {
  if (!format) {
    return {};
  }

  const decorations: string[] = [];
  if (format.underline) {
    decorations.push("underline");
  }
  if (format.strike) {
    decorations.push("line-through");
  }

  return {
    fontWeight: format.bold ? 600 : undefined,
    fontStyle: format.italic ? "italic" : undefined,
    textDecoration: decorations.length ? decorations.join(" ") : undefined,
    color: format.color,
    textAlign: format.align,
    justifyContent:
      format.align === "center"
        ? "center"
        : format.align === "right"
          ? "flex-end"
          : undefined,
  };
}

export function isFormatEmpty(format?: CellFormat): boolean {
  if (!format) {
    return true;
  }
  return Object.values(format).every(
    (value) => value === undefined || value === false
  );
}

// Merges a format patch into an existing format, dropping any keys that become
// falsy/empty so Storage stays clean. Returns undefined when nothing is left.
// Shared by the toolbar (client) and the AI tools (server).
export function mergeFormat(
  existing: CellFormat | undefined,
  patch: Partial<CellFormat>
): CellFormat | undefined {
  const merged: CellFormat = { ...existing, ...patch };
  for (const key of Object.keys(merged) as (keyof CellFormat)[]) {
    const value = merged[key];
    if (value === undefined || value === false || value === "") {
      delete merged[key];
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}
