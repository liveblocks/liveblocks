import type { LiveFile, ToJson } from "@liveblocks/client";
import { useFileUrl } from "@liveblocks/react";
import type { ImageLayer as ImageLayerType } from "../types";
import styles from "./ImageLayer.module.css";

type Props = {
  id: string;
  layer: ToJson<ImageLayerType>;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  selectionColor?: string;
};

type ImageFileProps = {
  file: ToJson<LiveFile>;
  height: number;
  width: number;
};

export function ImageLayer({
  layer,
  onPointerDown,
  id,
  selectionColor,
}: Props) {
  const { x, y, width, height, file } = layer;

  return (
    <g
      onPointerDown={(e) => onPointerDown(e, id)}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <rect
        className={styles.image_loading_background}
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#000"
        opacity={0.1}
      />
      {file ? <ImageFile file={file} width={width} height={height} /> : null}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        strokeWidth={1}
        stroke={selectionColor || "transparent"}
        pointerEvents="none"
      />
    </g>
  );
}

function ImageFile({ file, width, height }: ImageFileProps) {
  const { url } = useFileUrl(file);

  if (!url) {
    return null;
  }

  return (
    <image
      href={url}
      x={0}
      y={0}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid slice"
    />
  );
}
