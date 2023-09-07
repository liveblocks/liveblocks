import { EllipseLayer } from "../types";
import { colorToCss } from "../utils";

type Props = {
  id: string;
  layer: EllipseLayer;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  selectionColor?: string;
};

export default function Ellipse(
  { layer, onPointerDown, id, selectionColor }: Props
) {
  return (
    <ellipse
      onPointerDown={(e) => onPointerDown(e, id)}
      style={{
        transform: `translate(${layer.x}px, ${layer.y}px)`,
      }}
      cx={layer.width / 2}
      cy={layer.height / 2}
      rx={layer.width / 2}
      ry={layer.height / 2}
      fill={layer.fill ? colorToCss(layer.fill) : "#CCC"}
      stroke={selectionColor || "transparent"}
      strokeWidth="1"
    />
  );
}
