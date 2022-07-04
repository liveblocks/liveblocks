type Props = {
  color: string;
  x: number;
  y: number;
};

export default function Cursor({ color, x, y }: Props) {
  return (
    <path
      style={{
        transition: "transform 120ms linear",
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
      d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
      fill={color}
    />
  );
}
