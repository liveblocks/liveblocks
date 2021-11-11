import * as React from "react";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../utils";

export interface LineProps {
  points: number[][];
  isComplete: boolean;
  color: string;
}

export const Line = React.memo(function Line({
  points,
  isComplete,
  color,
}: LineProps) {
  const pathData = getSvgPathFromStroke(
    getStroke(points, {
      size: 12,
      thinning: 0.5,
      streamline: 0.6,
      smoothing: 0.7,
      last: isComplete,
    })
  );

  return (
    <g fill={color}>
      <path
        className="canvas-line"
        d={pathData}
        fill={isComplete ? "black" : color}
      />
    </g>
  );
});
