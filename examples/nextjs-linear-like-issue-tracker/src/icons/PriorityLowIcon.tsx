import { ComponentProps } from "react";

export function PriorityLowIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path fill="currentColor" d="M3 16h4v5H3"></path>
      <path fill="currentColor" d="M10 10h4v11h-4" opacity={0.3}></path>
      <path fill="currentColor" d="M17 1h4v20h-4" opacity={0.3}></path>
    </svg>
  );
}
