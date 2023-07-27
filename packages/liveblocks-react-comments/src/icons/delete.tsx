import type { ComponentProps } from "react";
import React from "react";

import { classNames } from "../utils/class-names";

export function DeleteIcon({ className, ...props }: ComponentProps<"svg">) {
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
      <path d="M4.5 6.5h11M14 6.5V14a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 14V6.5M7.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" />
    </svg>
  );
}
