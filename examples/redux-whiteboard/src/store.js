import { createClient } from "@liveblocks/client";
import { enhancer } from "@liveblocks/redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

export const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

const initialState = {
  shapes: {},
  selectedShape: null,
  isDragging: false,
};

const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    insertRectangle: (state) => {
      const shapeId = Date.now().toString();
      const shape = {
        x: getRandomInt(300),
        y: getRandomInt(300),
        fill: getRandomColor(),
      };
      state.shapes[shapeId] = shape;
      state.selectedShape = shapeId;
    },
    onShapePointerDown: (state, action) => {
      state.selectedShape = action.payload;
      state.isDragging = true;
    },
    deleteShape: (state) => {
      if (state.selectedShape) {
        delete state.shapes[state.selectedShape];
        state.selectedShape = null;
      }
    },
    onCanvasPointerUp: (state) => {
      state.isDragging = false;
    },
    onCanvasPointerMove: (state, action) => {
      if (state.isDragging && state.selectedShape) {
        state.shapes[state.selectedShape].x = action.payload.x - 50;
        state.shapes[state.selectedShape].y = action.payload.y - 50;
      }
    },
  },
});

export const {
  insertRectangle,
  onShapePointerDown,
  deleteShape,
  onCanvasPointerUp,
  onCanvasPointerMove,
} = slice.actions;

export function makeStore() {
  return configureStore({
    reducer: slice.reducer,
    enhancers: [
      enhancer({
        client,
        presenceMapping: { selectedShape: true },
        storageMapping: { shapes: true },
      }),
    ],
  });
}

const store = makeStore();

export default store;
