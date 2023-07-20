import type { ComponentProps } from "react";
import React from "react";

export function CrossIcon(props: ComponentProps<"svg">) {
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
      {...props}
    >
      <path d="M15 5L5 15" />
      <path d="M5 5L15 15" />
    </svg>
  );
}
