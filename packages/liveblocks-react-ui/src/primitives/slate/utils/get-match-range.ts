import type { Point as SlatePoint } from "slate";
import {
  Editor as SlateEditor,
  Path as SlatePath,
  Range as SlateRange,
} from "slate";

import { isWhitespaceCharacter } from "./is-whitespace-character";

interface Options {
  include?: boolean;
  direction?: "before" | "after" | "both";
  allowConsecutiveWhitespace?: boolean;
  ignoreTerminator?: (
    character: string,
    point: SlatePoint,
    direction: "before" | "after"
  ) => boolean;
}

const defaultOptions: Options = {
  direction: "before",
  allowConsecutiveWhitespace: true,
};

export function getMatchRange(
  editor: SlateEditor,
  at: SlateRange,
  terminators: string[] = [" "],
  options: Options = defaultOptions
): SlateRange | undefined {
  const { include, direction, ignoreTerminator, allowConsecutiveWhitespace } = {
    ...defaultOptions,
    ...options,
  };

  let [start, end] = SlateRange.edges(at);
  let point: SlatePoint = start;
  let previousCharacterWasWhitespace = false;

  function move(direction: "before" | "after"): boolean {
    const nextPoint =
      direction === "after"
        ? SlateEditor.after(editor, point, { unit: "character" })
        : SlateEditor.before(editor, point, { unit: "character" });

    // Stop if we reached the end of a block
    if (!nextPoint || SlatePath.compare(nextPoint.path, point.path) !== 0) {
      return false;
    }

    const nextCharacter =
      nextPoint &&
      SlateEditor.string(
        editor,
        direction === "after"
          ? { anchor: point, focus: nextPoint }
          : { anchor: nextPoint, focus: point }
      );
    const lastCharacter =
      nextCharacter &&
      nextCharacter[direction === "after" ? 0 : nextCharacter.length - 1];

    if (
      !allowConsecutiveWhitespace &&
      previousCharacterWasWhitespace &&
      isWhitespaceCharacter(lastCharacter)
    ) {
      return false;
    }

    if (
      nextPoint &&
      lastCharacter &&
      (!terminators.includes(lastCharacter) ||
        ignoreTerminator?.(lastCharacter, nextPoint, direction))
    ) {
      previousCharacterWasWhitespace = isWhitespaceCharacter(lastCharacter);
      point = nextPoint;

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
      anchor:
        direction === "before" || direction === "both"
          ? (SlateEditor.before(editor, start, { unit: "offset" }) ?? start)
          : start,
      focus:
        direction === "after" || direction === "both"
          ? (SlateEditor.after(editor, end, { unit: "offset" }) ?? end)
          : end,
    };
  }

  return { anchor: start, focus: end };
}
