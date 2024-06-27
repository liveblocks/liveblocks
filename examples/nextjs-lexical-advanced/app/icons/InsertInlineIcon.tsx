import { ComponentProps } from "react";

export function InsertInlineIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width={7} height={13} x={3} y={8} rx={1} />
      <path d="M15 2l-3 3-3-3" />
      <rect width={7} height={13} x={14} y={8} rx={1} />
    </svg>
  );
}
