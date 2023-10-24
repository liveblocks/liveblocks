import { ComponentProps } from "react";

export function TimeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14ZM8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z" />
      <path d="M10.295 11 7.5 8.205V3.5h1v4.29l2.5 2.505-.705.705Z" />
    </svg>
  );
}
