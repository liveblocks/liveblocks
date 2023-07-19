import type { ComponentProps } from "react";
import React from "react";

export function SendIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      role="presentation"
      {...props}
    >
      <path
        d="m4 16 12-6L4 4l2 6-2 6ZM6 10h10"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
