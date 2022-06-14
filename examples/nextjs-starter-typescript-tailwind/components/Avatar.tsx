import React, { useMemo } from "react";
import Image from "next/image";
import classNames from "classnames";
import { getContrastingColor } from "../utils/getContrastingColor";

type BothProps = {
  variant?: "avatar" | "more";
  size?: number;
  outlineColor?: string;
  outlineWidth?: number;
  borderRadius?: number;
  className?: string;
  style?: Record<string, string>;
};

type PictureProps = BothProps & {
  variant?: "avatar";
  name?: string;
  picture?: string;
  color?: string;
  statusColor?: string;
  count?: never;
};

type MoreProps = BothProps & {
  variant: "more";
  count: number;
  picture?: never;
  name?: never;
  statusColor?: never;
  color?: never;
};

type AvatarProps = PictureProps | MoreProps;

export function Avatar({
  variant = "avatar",
  picture = "",
  name = "",
  color = "",
  size = 52,
  statusColor = "",
  outlineColor = "",
  outlineWidth = 4,
  borderRadius = 9999,
  className = "",
  style = {},
  count = 0
}: AvatarProps){
  const innerVariant = (variant === "avatar" && !picture) ? "letter" : variant;
  const realSize = size - (outlineWidth * 2);

  return (
    <div
      style={{
        height: realSize,
        width: realSize,
        outlineColor,
        outlineWidth,
        margin: outlineWidth,
        borderRadius,
        ...style,
      }}
      className={classNames(
        "flex place-content-center relative outline outline-4 outline-white",
        className
      )}
      data-tooltip={name}
    >
      {innerVariant === "more" ? (
        <MoreCircle
          count={count}
          borderRadius={borderRadius}
        />
      ) : null}

      {innerVariant === "avatar" ? (
        <PictureCircle
          name={name}
          picture={picture}
          size={realSize}
          borderRadius={borderRadius}
        />
      ) : null}

      {innerVariant === "letter" ? (
        <LetterCircle
          name={name}
          color={color}
          borderRadius={borderRadius}
        />
      ) : null}

      {statusColor ? (
        <span
          style={{ backgroundColor: statusColor }}
          className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white"
        />
      ) : null}
    </div>
  );
}

function LetterCircle({ name, color, borderRadius }:
  Pick<PictureProps, "name" | "color" | "borderRadius">
) {
  const textColor = useMemo(() => color ? getContrastingColor(color) : undefined, [color]);
  return (
    <div
      style={{
        backgroundColor: color,
        borderRadius,
      }}
      className="flex justify-center items-center absolute inset-0 rounded-full overflow-hidden isolate"
    >
      <div
        style={{
          maskImage: "linear-gradient(to bottom right, transparent, #fff)",
          WebkitMaskImage: "linear-gradient(to bottom right, transparent, #fff)",
          backgroundColor: color,
        }}
        className="-hue-rotate-60 absolute inset-0"
      />
      <div className="z-10 font-semibold text-white" style={{ color: textColor }}>
        {name ? name.charAt(0) : null}
      </div>
    </div>
  )
}

function PictureCircle({ name, picture = "", size, borderRadius }:
  Pick<PictureProps, "name" | "picture" | "size" | "borderRadius">
) {
  return (
    <Image
      alt={name}
      src={picture}
      height={size}
      width={size}
      style={{ borderRadius }}
    />
  )
}

function MoreCircle({ count, borderRadius }:
  Pick<MoreProps, "count" | "borderRadius">
) {
  return (
    <div
      style={{ borderRadius }}
      className="flex justify-center items-center pr-1 text-white text-sm font-medium absolute inset-0 bg-gray-600"
    >
      +{count}
    </div>
  )
}
