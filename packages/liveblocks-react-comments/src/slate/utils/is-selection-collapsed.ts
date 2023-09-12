import type { Selection as SlateSelection } from "slate";
import { Range as SlateRange } from "slate";

export function isSelectionCollapsed(
  selection: SlateSelection
): selection is SlateRange {
  return selection !== null && SlateRange.isCollapsed(selection);
}
