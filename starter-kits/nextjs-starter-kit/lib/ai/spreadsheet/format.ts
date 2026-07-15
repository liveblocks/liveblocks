import type { CellFormat } from "@/liveblocks.config";

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
