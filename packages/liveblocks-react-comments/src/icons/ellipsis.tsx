import type { ComponentProps } from "react";
import React from "react";

export function EllipsisIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.5}
      role="presentation"
      {...props}
    >
      <circle cx={5} cy={10} r={0.75} />
      <circle cx={10} cy={10} r={0.75} />
      <circle cx={15} cy={10} r={0.75} />
    </svg>
  );
}
