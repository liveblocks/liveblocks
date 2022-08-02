import { RefObject } from "react";

export const TABLE_ID = "table";

export function canUseShortcuts() {
  return (
    document.activeElement === document.body ||
    document.activeElement === document.getElementById(TABLE_ID)
  );
}

export function canUseEditingShortcuts(input: RefObject<HTMLInputElement>) {
  return document.activeElement === input.current;
}
