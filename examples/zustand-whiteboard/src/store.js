import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

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

        liveblocks.room.updatePresence(
          { selectedShape: shapeId },
          { addToHistory: true }
        );
        set({
          shapes: { ...shapes, [shapeId]: shape },
        });
      },
      onShapePointerDown: (shapeId) => {
        const room = get().liveblocks.room;
        room.history.pause();
        room.updatePresence({ selectedShape: shapeId }, { addToHistory: true });
        set({ isDragging: true });
      },
      deleteShape: () => {
        const { shapes, selectedShape, liveblocks } = get();
        const { [selectedShape]: shapeToDelete, ...newShapes } = shapes;
        liveblocks.room.updatePresence(
          { selectedShape: null },
          { addToHistory: true }
        );
        set({
          shapes: newShapes,
        });
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
    }),
    {
      client,
      presenceMapping: { selectedShape: true },
      storageMapping: { shapes: true },
    }
  )
);
export default useStore;
