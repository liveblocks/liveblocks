import { ClientRectObject } from "@floating-ui/react-dom";

export const getRectFromCoords = (coords: {
  top: number;
  left: number;
  right: number;
  bottom: number;
}): ClientRectObject => {
  return {
    ...coords,
    x: coords.left,
    y: coords.top,
    width: coords.right - coords.left,
    height: coords.bottom - coords.top,
  };
};
