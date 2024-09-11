import { ComponentProps } from "react";

export function InsertParagraphIcon(props: ComponentProps<"svg">) {
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
      <rect width={13} height={7} x={8} y={3} rx={1} />
      <path d="M2 9l3 3-3 3" />
      <rect width={13} height={7} x={8} y={14} rx={1} />
    </svg>
  );
}
