import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

// Replace this key with your public key provided at https://liveblocks.io/dashboard/apikeys
const PUBLIC_KEY = "pk_xxxxxxx";

if (PUBLIC_KEY.startsWith("pk_xxxxxxx")) {
  throw new Error(
    "Replace the constant PUBLIC_KEY in store.js with your own Liveblocks public key."
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

const useStore = create(
  middleware(
    (set, get) => ({
      shapes: {
        ["id"]: {
          x: 100,
          y: 100,
          fill: "gray",
        },
      },
      isDragging: false,
      selectedShape: null,

      onShapePointerDown: (shapeId) => {
        get().liveblocks.room.history.pause();

        set({ selectedShape: shapeId, isDragging: true });
      },

      onCanvasPointerUp: () => {
        set({ isDragging: false });
        get().liveblocks.room.history.resume();
      },

      onCanvasPointerMove: (e) => {
        e.preventDefault();

        const { isDragging, shapes, selectedShape } = get();

        const shape = shapes[selectedShape];

        if (shape && isDragging) {
          set({
            shapes: {
              ...shapes,
              [selectedShape]: {
                ...shape,
                x: e.clientX - 50,
                y: e.clientY - 50,
              },
            },
          });
        }
      },
      onAddRectangle: () => {
        const { shapes } = get();

        const shapeId = Date.now();
        const shape = {
          x: getRandomInt(300),
          y: getRandomInt(300),
          fill: getRandomColor(),
        };

        set({
          selectedShape: shapeId,
          shapes: { ...shapes, [shapeId]: shape },
        });
      },
      onDeleteRectangle: () => {
        const { shapes, selectedShape } = get();
        const { [selectedShape]: value, ...newShapes } = shapes;
        set({
          shapes: newShapes,
          selectedShape: null,
        });
      },
      onUndo: () => {
        const { liveblocks } = get();
        liveblocks.room.history.undo();
      },
      onRedo: () => {
        const { liveblocks } = get();
        liveblocks.room.history.redo();
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
