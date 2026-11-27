"use client";

import { useHistory } from "@liveblocks/react/suspense";
import { useShortcut } from "@ui-sdk/react/shortcuts";
import type { PlanActions } from "@/hooks/use-plan-actions";
import {
  dot,
  findWall,
  fitOpening,
  normalizeAngle,
  pointInPolygon,
} from "@/lib/geometry";
import type {
  Furniture,
  Opening,
  Point,
  Room,
  Selection,
  Tool,
} from "@/lib/plan";

type PlanShortcuts = {
  rooms: ReadonlyMap<string, Room>;
  openings: ReadonlyMap<string, Opening>;
  furniture: ReadonlyMap<string, Furniture>;
  actions: PlanActions;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
  onFit: () => void;
  // False while something is being dragged, when keys are left alone.
  idle: () => boolean;
};

export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

// ui-sdk skips shortcuts made of a single key while typing in a field, but
// not those with ⌘ or Ctrl: ⌘Z in a text field should undo the typing, not
// the plan.
function notTyping() {
  return !isTyping(document.activeElement);
}

// Arrow keys already mean something in a toolbar, a menu or a set of options.
function arrowsAreFree() {
  const focused = document.activeElement;
  return !(
    focused instanceof HTMLElement &&
    focused.closest(
      "[role='toolbar'], [role='radiogroup'], [role='menu'], [role='listbox']"
    )
  );
}

const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };

/**
 * The plan's keyboard shortcuts, registered with ui-sdk's `useShortcut`.
 * It matches keys whatever the keyboard layout, writes `mod` as ⌘ or Ctrl,
 * and stays out of the way of fields, menus and dialogs. The same key
 * strings label the tooltips of the buttons that do the same things.
 */
export function usePlanShortcuts({
  rooms,
  openings,
  furniture,
  actions,
  tool,
  onToolChange,
  selection,
  onSelect,
  onFit,
  idle,
}: PlanShortcuts) {
  const history = useHistory();

  const selectedFurniture =
    selection?.kind === "furniture" ? furniture.get(selection.id) : undefined;
  const selectedOpening =
    selection?.kind === "opening" ? openings.get(selection.id) : undefined;
  const selectedRoom =
    selection?.kind === "room" ? rooms.get(selection.id) : undefined;

  /* Tools */

  useShortcut("v", () => onToolChange("select"), { description: "Select" });
  useShortcut("r", () => onToolChange("room"), { description: "Draw a room" });
  useShortcut("d", () => onToolChange("door"), { description: "Add a door" });
  useShortcut("w", () => onToolChange("window"), {
    description: "Add a window",
  });
  useShortcut(
    "escape",
    () => {
      if (tool !== "select") {
        onToolChange("select");
      } else {
        onSelect(null);
      }
    },
    {
      description: "Back to selecting, or clear the selection",
      // Escape during a drag cancels the drag, and nothing else.
      when: () => idle() && (tool !== "select" || selection !== null),
    }
  );

  /* History and view */

  useShortcut("mod+z", () => history.undo(), {
    description: "Undo",
    when: notTyping,
  });
  useShortcut("mod+shift+z", () => history.redo(), {
    description: "Redo",
    when: notTyping,
  });
  useShortcut("mod+y", () => history.redo(), {
    description: "Redo",
    when: notTyping,
  });
  useShortcut("mod+0", onFit, {
    description: "Zoom to fit",
    when: notTyping,
  });

  /* The selection */

  function remove() {
    if (selection) {
      actions.remove(selection);
      onSelect(null);
    }
  }
  const canRemove = () => selection !== null && idle();
  useShortcut("delete", remove, { description: "Delete", when: canRemove });
  useShortcut("backspace", remove, { description: "Delete", when: canRemove });

  useShortcut(
    "mod+d",
    () => {
      const id = selectedFurniture
        ? actions.duplicateFurniture(selectedFurniture.id)
        : null;
      if (id) {
        onSelect({ kind: "furniture", id });
      }
    },
    {
      description: "Duplicate",
      when: () => selectedFurniture !== undefined && notTyping(),
    }
  );

  function turn(degrees: number) {
    if (selectedFurniture) {
      actions.updateFurniture(selectedFurniture.id, {
        rotation: normalizeAngle(selectedFurniture.rotation + degrees),
      });
    }
  }
  const canTurn = () => selectedFurniture !== undefined;
  useShortcut("q", () => turn(-90), {
    description: "Rotate left",
    when: canTurn,
  });
  useShortcut("e", () => turn(90), {
    description: "Rotate right",
    when: canTurn,
  });

  const canFlip = () => selectedOpening !== undefined;
  useShortcut(
    "f",
    () => {
      if (selectedOpening) {
        actions.updateOpening(selectedOpening.id, {
          hinge: selectedOpening.hinge === "start" ? "end" : "start",
        });
      }
    },
    { description: "Flip the hinge side", when: canFlip }
  );
  useShortcut(
    "shift+f",
    () => {
      if (selectedOpening) {
        actions.updateOpening(selectedOpening.id, {
          swing: selectedOpening.swing === "in" ? "out" : "in",
        });
      }
    },
    { description: "Flip the swing", when: canFlip }
  );

  // Arrows nudge the selection by a centimeter, or ten with Shift.
  function nudge(arrow: Point, step: number) {
    if (selectedFurniture) {
      actions.updateFurniture(selectedFurniture.id, {
        x: selectedFurniture.x + arrow.x * step,
        y: selectedFurniture.y + arrow.y * step,
      });
    } else if (selectedOpening) {
      const wall = findWall(
        rooms,
        selectedOpening.roomId,
        selectedOpening.wallId
      );
      if (wall) {
        // An opening slides along its wall, whichever way it runs.
        const along = dot(arrow, wall.dir) >= 0 ? 1 : -1;
        actions.updateOpening(selectedOpening.id, {
          offset: fitOpening(
            {
              ...selectedOpening,
              offset: selectedOpening.offset + along * step,
            },
            wall
          ).offset,
        });
      }
    } else if (selectedRoom) {
      // The furniture standing in the room comes along.
      actions.moveRoom(
        selectedRoom.id,
        selectedRoom.points.map((corner) => ({
          ...corner,
          x: corner.x + arrow.x * step,
          y: corner.y + arrow.y * step,
        })),
        [...furniture.values()]
          .filter((item) => pointInPolygon(item, selectedRoom.points))
          .map((item) => ({
            id: item.id,
            x: item.x + arrow.x * step,
            y: item.y + arrow.y * step,
          }))
      );
    }
  }
  const move = {
    description: "Nudge",
    repeat: true,
    when: () => selection !== null && idle() && arrowsAreFree(),
  };
  const moveMore = { ...move, description: "Nudge further" };
  useShortcut("arrowleft", () => nudge(LEFT, 1), move);
  useShortcut("arrowright", () => nudge(RIGHT, 1), move);
  useShortcut("arrowup", () => nudge(UP, 1), move);
  useShortcut("arrowdown", () => nudge(DOWN, 1), move);
  useShortcut("shift+arrowleft", () => nudge(LEFT, 10), moveMore);
  useShortcut("shift+arrowright", () => nudge(RIGHT, 10), moveMore);
  useShortcut("shift+arrowup", () => nudge(UP, 10), moveMore);
  useShortcut("shift+arrowdown", () => nudge(DOWN, 10), moveMore);
}
