import { nanoid } from "nanoid";
import { Layer } from "./types";

export const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export const initialLayers: Record<string, Layer> = {
  [nanoid()]: {
    type: "rectangle",
    x: 150,
    y: 350,
    width: 100,
    height: 100,
    color: COLORS[2],
  },
  [nanoid()]: {
    type: "ellipse",
    x: 250,
    y: 100,
    width: 100,
    height: 100,
    color: COLORS[3],
  },
  [nanoid()]: {
    type: "rectangle",
    x: 400,
    y: 250,
    width: 100,
    height: 100,
    color: COLORS[4],
  },
};

export function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

export function createRandomRectangle(): Layer {
  return {
    x: getRandomInt(300),
    y: getRandomInt(300),
    type: "rectangle",
    height: 100,
    width: 100,
    color: getRandomColor(),
  };
}

export function createRandomEllipse(): Layer {
  return {
    x: getRandomInt(300),
    y: getRandomInt(300),
    type: "ellipse",
    height: 100,
    width: 100,
    color: getRandomColor(),
  };
}
