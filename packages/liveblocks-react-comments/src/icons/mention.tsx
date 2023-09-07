import type { ComponentProps } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

export function MentionIcon({ className, ...props }: ComponentProps<"svg">) {
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
      <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M13 7v3.7c0 1.105.855 2.1 1.9 2.1a2.12 2.12 0 0 0 2.1-2.1V10a7 7 0 1 0-2.8 5.6" />
    </svg>
  );
}
