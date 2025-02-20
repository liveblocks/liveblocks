import type { Point as SlatePoint } from "slate";
import {
  Editor as SlateEditor,
  Path as SlatePath,
  Range as SlateRange,
} from "slate";

interface Options {
  include?: boolean;
  direction?: "before" | "after" | "both";
  ignoreTerminator?: (
    character: string,
    point: SlatePoint,
    direction: "before" | "after"
  ) => boolean;
}

const defaultOptions: Options = {
  direction: "before",
};

export function getMatchRange(
  editor: SlateEditor,
  at: SlateRange,
  terminators: string[] = [" "],
  options: Options = defaultOptions
): SlateRange | undefined {
  const { include, direction, ignoreTerminator } = {
    ...defaultOptions,
    ...options,
  };
  let [start, end] = SlateRange.edges(at);
  let point: SlatePoint = start;

  function move(direction: "before" | "after"): boolean {
    const next =
      direction === "after"
        ? SlateEditor.after(editor, point, {
            unit: "character",
          })
        : SlateEditor.before(editor, point, { unit: "character" });

    // Matching should stop at the end of a block
    if (!next || SlatePath.compare(next.path, point.path) !== 0) {
      return false;
    }

    const nextWord =
      next &&
      SlateEditor.string(
        editor,
        direction === "after"
          ? { anchor: point, focus: next }
          : { anchor: next, focus: point }
      );
    const lastWord =
      nextWord && nextWord[direction === "after" ? 0 : nextWord.length - 1];

    if (
      next &&
      lastWord &&
      (!terminators.includes(lastWord) ||
        ignoreTerminator?.(lastWord, next, direction))
    ) {
      point = next;

      if (point.offset === 0) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  }

  if (direction !== "before") {
    point = end;

    while (move("after"));

    end = point;
  }

  if (direction !== "after") {
    point = start;

    while (move("before"));

    start = point;
  }

  if (include) {
    return {
      anchor: SlateEditor.before(editor, start, { unit: "offset" }) ?? start,
      focus: SlateEditor.after(editor, end, { unit: "offset" }) ?? end,
    };
  }

  return { anchor: start, focus: end };
}
