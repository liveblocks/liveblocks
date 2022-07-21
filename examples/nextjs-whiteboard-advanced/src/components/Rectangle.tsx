import { RectangleLayer } from "../types";
import { colorToCss } from "../utils";

type Props = {
  id: string;
  layer: RectangleLayer;
  isAnimated: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  selectionColor?: string;
};

export default function Rectangle({
  layer,
  isAnimated,
  onPointerDown,
  id,
  selectionColor,
}: Props) {
  const { x, y, width, height, fill } = layer;

  return (
    <rect
      onPointerDown={(e) => onPointerDown(e, id)}
      style={{
        transition: isAnimated ? "all 120ms linear" : "",
        transform: `translate(${x}px, ${y}px)`,
      }}
      x={0}
      y={0}
      width={width}
      height={height}
      fill={fill ? colorToCss(fill) : "#CCC"}
      strokeWidth={1}
      stroke={selectionColor || "transparent"}
    />
  );
}
