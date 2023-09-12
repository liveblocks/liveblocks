import type { ComponentProps } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

export function EmojiIcon({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      className={classNames("lb-icon", className)}
      {...props}
    >
      <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
      <path d="M7.5 11.5S8.25 13 10 13s2.5-1.5 2.5-1.5M8 8h.007" />
      <path d="M12 8h.007" />
      <circle cx={8} cy={8} r={0.25} />
      <circle cx={12} cy={8} r={0.25} />
    </svg>
  );
}
