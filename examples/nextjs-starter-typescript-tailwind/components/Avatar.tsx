import React from "react";
import Image from "next/image";
import { getContrastingColor } from "../utils/getContrastingColor";

/**
 * This file shows how to add live avatars like you can see them at the top right of a Google Doc or a Figma file.
 * https://liveblocks.io/docs/examples/live-avatars
 *
 * The users picture and name are not set via the `useMyPresence` hook like the cursors.
 * They are set from the authentication endpoint.
 *
 * See pages/api/auth.ts and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
 */

type AvatarProps = {
  variant?: "avatar";
  name: string;
  picture?: string;
  color?: string;
  size?: number;
  statusColor?: string;
  count?: never;
}

type MoreProps = {
  variant: "more";
  count: number;
  size?: number;
  picture?: never;
  name?: never;
  statusColor?: never;
  color?: never;
}

export function Avatar({ variant = "avatar", picture = "", name = "", color = "", size = 42, statusColor = "", count = 0 }: AvatarProps | MoreProps) {
  const innerVariant = (variant === "avatar" && !picture) ? "letter" : variant;

  return (
    <div
      style={{
        height: size,
        width: size,
      }}
      className="flex place-content-center relative outline outline-4 outline-white rounded-full -ml-1.5"
      data-tooltip={name}
    >
      {innerVariant === "more" ? (
        <MoreCircle count={count} />
      ) : null}

      {innerVariant === "avatar" ? (
        <PictureCircle
          name={name}
          picture={picture}
          size={size}
        />
      ) : null}

      {innerVariant === "letter" ? (
        <LetterCircle name={name} color={color} />
      ) : null}
    </div>
  );
}

function LetterCircle({ name, color }: { name: string, color?: string }) {
  return (
    <div
      className="flex justify-center items-center text-white text-sm font-bold absolute inset-0 rounded-full"
      style={{ backgroundColor: color, color: color ? getContrastingColor(color) : undefined }}
    >
      {name.charAt(0)}
    </div>
  )
}

function PictureCircle({ name, picture, size }: { name: string, picture: string, size: number }) {
  return (
    <Image
      alt={name}
      src={picture}
      height={size}
      width={size}
      className="rounded-full"
    />
  )
}

function MoreCircle({ count }: { count: number }) {
  return (
    <div className="flex justify-center items-center pr-1 text-white text-sm font-medium absolute inset-0 rounded-full bg-gray-600">
      +{count}
    </div>
  )
}
