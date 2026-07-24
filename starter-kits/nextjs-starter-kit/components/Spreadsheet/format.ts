import type { CSSProperties } from "react";
import type { CellFormat, NumberFormat } from "@/liveblocks.config";

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (cleaned === "") {
    return null;
  }

  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

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

  return `${(num * 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

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

export function mergeFormat(
  existing: CellFormat | undefined,
  patch: Partial<CellFormat>
): CellFormat | undefined {
  const merged: CellFormat = { ...existing, ...patch };

  const keys: (keyof CellFormat)[] = [
    "bold",
    "italic",
    "underline",
    "strike",
    "align",
    "color",
    "background",
    "numberFormat",
  ];

  for (const key of keys) {
    const value = merged[key];
    if (value === undefined || value === false || value === "") {
      delete merged[key];
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
