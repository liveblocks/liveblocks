"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import { useMemo } from "react";
import { distance } from "@/lib/geometry";
import type {
  Corner,
  Furniture,
  Opening,
  Point,
  Room,
  Selection,
} from "@/lib/plan";

/**
 * Every way the plan can change. Each action is a Storage mutation: it's
 * applied locally right away, synced to everyone on the plan, and lands on
 * this person's undo stack. A mutation that changes several things (moving a
 * room with its furniture, removing a corner and re-attaching its doors) is
 * sent as one batch, so nobody ever sees it half-applied.
 */
export function usePlanActions() {
  const addRoom = useMutation(({ storage }, outline: Point[]) => {
    const rooms = storage.get("rooms");
    const id = nanoid(8);
    rooms.set(
      id,
      new LiveObject({
        id,
        name: `Room ${rooms.size + 1}`,
        floor: "none" as const,
        points: outline.map((point) => ({ id: nanoid(8), ...point })),
      })
    );
    return id;
  }, []);

  const updateRoom = useMutation(
    ({ storage }, id: string, patch: Partial<Pick<Room, "name" | "floor">>) => {
      storage.get("rooms").get(id)?.update(patch);
    },
    []
  );

  const setRoomPoints = useMutation(
    ({ storage }, id: string, points: Corner[]) => {
      storage.get("rooms").get(id)?.set("points", points);
    },
    []
  );

  // Moves a room together with the furniture standing in it. Doors and
  // windows follow on their own: they're positioned relative to their wall.
  const moveRoom = useMutation(
    (
      { storage },
      id: string,
      points: Corner[],
      furniture: { id: string; x: number; y: number }[]
    ) => {
      storage.get("rooms").get(id)?.set("points", points);
      const items = storage.get("furniture");
      for (const { id: itemId, x, y } of furniture) {
        items.get(itemId)?.update({ x, y });
      }
    },
    []
  );

  // Splits a wall in two by adding a corner on it. Openings past the new
  // corner move to the new wall, keeping their place.
  const insertCorner = useMutation(
    ({ storage }, roomId: string, wallId: string, point: Point) => {
      const room = storage.get("rooms").get(roomId);
      if (!room) {
        return null;
      }
      const points = room.get("points");
      const index = points.findIndex((corner) => corner.id === wallId);
      if (index === -1) {
        return null;
      }
      const corner: Corner = { id: nanoid(8), ...point };
      const split = distance(points[index], point);
      room.set("points", [
        ...points.slice(0, index + 1),
        corner,
        ...points.slice(index + 1),
      ]);
      storage.get("openings").forEach((opening) => {
        if (
          opening.get("roomId") === roomId &&
          opening.get("wallId") === wallId &&
          opening.get("offset") > split
        ) {
          opening.update({
            wallId: corner.id,
            offset: opening.get("offset") - split,
          });
        }
      });
      return corner.id;
    },
    []
  );

  // Removes a corner, merging its two walls into one. Openings on the wall
  // that started at this corner move onto the merged wall.
  const removeCorner = useMutation(
    ({ storage }, roomId: string, cornerId: string) => {
      const room = storage.get("rooms").get(roomId);
      if (!room) {
        return;
      }
      const points = room.get("points");
      const index = points.findIndex((corner) => corner.id === cornerId);
      if (index === -1 || points.length <= 3) {
        return;
      }
      const previous = points[(index - 1 + points.length) % points.length];
      const before = distance(previous, points[index]);
      room.set(
        "points",
        points.filter((corner) => corner.id !== cornerId)
      );
      storage.get("openings").forEach((opening) => {
        if (
          opening.get("roomId") === roomId &&
          opening.get("wallId") === cornerId
        ) {
          opening.update({
            wallId: previous.id,
            offset: opening.get("offset") + before,
          });
        }
      });
    },
    []
  );

  const addOpening = useMutation(
    ({ storage }, opening: Omit<Opening, "id">) => {
      const id = nanoid(8);
      storage.get("openings").set(id, new LiveObject({ ...opening, id }));
      return id;
    },
    []
  );

  const updateOpening = useMutation(
    ({ storage }, id: string, patch: Partial<Omit<Opening, "id">>) => {
      storage.get("openings").get(id)?.update(patch);
    },
    []
  );

  const addFurniture = useMutation(
    ({ storage }, item: Omit<Furniture, "id" | "z">) => {
      const furniture = storage.get("furniture");
      let top = 0;
      furniture.forEach((other) => {
        top = Math.max(top, other.get("z"));
      });
      const id = nanoid(8);
      furniture.set(id, new LiveObject({ ...item, id, z: top + 1 }));
      return id;
    },
    []
  );

  const updateFurniture = useMutation(
    ({ storage }, id: string, patch: Partial<Omit<Furniture, "id">>) => {
      storage.get("furniture").get(id)?.update(patch);
    },
    []
  );

  const duplicateFurniture = useMutation(({ storage }, id: string) => {
    const furniture = storage.get("furniture");
    const source = furniture.get(id);
    if (!source) {
      return null;
    }
    let top = 0;
    furniture.forEach((other) => {
      top = Math.max(top, other.get("z"));
    });
    const copy = source.toJSON();
    const copyId = nanoid(8);
    furniture.set(
      copyId,
      new LiveObject({
        ...copy,
        id: copyId,
        x: copy.x + 20,
        y: copy.y + 20,
        z: top + 1,
      })
    );
    return copyId;
  }, []);

  // Brings a piece above every other piece, or sends it below them.
  const reorderFurniture = useMutation(
    ({ storage }, id: string, to: "front" | "back") => {
      const furniture = storage.get("furniture");
      let top = -Infinity;
      let bottom = Infinity;
      furniture.forEach((other) => {
        top = Math.max(top, other.get("z"));
        bottom = Math.min(bottom, other.get("z"));
      });
      furniture.get(id)?.set("z", to === "front" ? top + 1 : bottom - 1);
    },
    []
  );

  // Removes a room (with its doors and windows), an opening, or a piece of
  // furniture.
  const remove = useMutation(({ storage }, selection: Selection) => {
    if (selection.kind === "furniture") {
      storage.get("furniture").delete(selection.id);
    } else if (selection.kind === "opening") {
      storage.get("openings").delete(selection.id);
    } else {
      storage.get("rooms").delete(selection.id);
      const openings = storage.get("openings");
      for (const [id, opening] of [...openings.entries()]) {
        if (opening.get("roomId") === selection.id) {
          openings.delete(id);
        }
      }
    }
  }, []);

  return useMemo(
    () => ({
      addRoom,
      updateRoom,
      setRoomPoints,
      moveRoom,
      insertCorner,
      removeCorner,
      addOpening,
      updateOpening,
      addFurniture,
      updateFurniture,
      duplicateFurniture,
      reorderFurniture,
      remove,
    }),
    [
      addRoom,
      updateRoom,
      setRoomPoints,
      moveRoom,
      insertCorner,
      removeCorner,
      addOpening,
      updateOpening,
      addFurniture,
      updateFurniture,
      duplicateFurniture,
      reorderFurniture,
      remove,
    ]
  );
}

export type PlanActions = ReturnType<typeof usePlanActions>;
