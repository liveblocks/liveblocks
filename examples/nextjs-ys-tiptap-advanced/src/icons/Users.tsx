import { ComponentProps } from "react";

export function UsersIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10 13v-1a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1M14 13v-1c0-.912-.345-1.53-1-1.816M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM11 3.268a2 2 0 0 1 0 3.464"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
