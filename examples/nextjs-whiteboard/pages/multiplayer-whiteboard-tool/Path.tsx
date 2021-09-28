import { PathLayer } from "./types";
import { colorToCss, getSvgPathFromStroke } from "./utils";
import getStroke from "perfect-freehand";

type Props = {
  id: string;
  layer: PathLayer;
  isAnimated: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  selectionColor?: string;
};

export default function Path({
  layer,
  isAnimated,
  onPointerDown,
  id,
  selectionColor,
}: Props) {
  return (
    <path
      key={id}
      onPointerDown={(e) => onPointerDown(e, id)}
      d={getSvgPathFromStroke(
        getStroke(layer.points, {
          size: 16,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
      )}
      style={{
        transition: isAnimated ? "all 0.1s ease" : "",
        transform: `translate(${layer.x}px, ${layer.y}px)`,
      }}
      x={0}
      y={0}
      fill={layer.fill ? colorToCss(layer.fill) : "#CCC"}
      stroke={selectionColor}
      strokeWidth={1}
    />
  );
}
