import create from "zustand";
import { createClient } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import React from "react";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

overrideApiKey();

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-whiteboard#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

export type Shape = { x: number; y: number; fill: string };

type Store = {
  shapes: { [id: string]: Shape };
  selectedShape: string | null;
  isDragging: boolean;
  insertRectangle: () => void;
  onShapePointerDown: (shapeId: string) => void;
  deleteShape: () => void;
  onCanvasPointerUp: () => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
};

type Presence = {
  selectedShape: string | null;
};

const useStore = create<WithLiveblocks<Store, Presence>>()(
  liveblocks(
    (set, get) => ({
      shapes: {},
      selectedShape: null,
      isDragging: false,

      insertRectangle: () => {
        const { shapes, liveblocks } = get();

        const shapeId = Date.now().toString();
        const shape = {
          x: getRandomInt(300),
          y: getRandomInt(300),
          fill: getRandomColor(),
        };

        liveblocks.room!.updatePresence(
          { selectedShape: shapeId },
          { addToHistory: true }
        );
        set({
          shapes: { ...shapes, [shapeId]: shape },
        });
      },
      onShapePointerDown: (shapeId) => {
        const room = get().liveblocks.room!;
        room.history.pause();
        room.updatePresence({ selectedShape: shapeId }, { addToHistory: true });
        set({ isDragging: true });
      },
      deleteShape: () => {
        const { shapes, selectedShape, liveblocks } = get();
        const { [selectedShape!]: shapeToDelete, ...newShapes } = shapes;
        liveblocks.room!.updatePresence(
          { selectedShape: null },
          { addToHistory: true }
        );
        set({
          shapes: newShapes,
        });
      },
      onCanvasPointerUp: () => {
        set({ isDragging: false });
        get().liveblocks.room!.history.resume();
      },
      onCanvasPointerMove: (e) => {
        e.preventDefault();

        const { isDragging, shapes, selectedShape } = get();

        const shape = shapes[selectedShape!];

        if (shape && isDragging) {
          set({
            shapes: {
              ...shapes,
              [selectedShape!]: {
                ...shape,
                x: e.clientX - 50,
                y: e.clientY - 50,
              },
            },
          });
        }
      },
    }),
    {
      client,
      presenceMapping: { selectedShape: true },
      storageMapping: { shapes: true },
    }
  )
);
export default useStore;

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideApiKey() {
  const query = new URLSearchParams(window?.location?.search);
  const apiKey = query.get("apiKey");

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }
}
