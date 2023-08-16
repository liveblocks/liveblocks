import { ComponentProps } from "react";

export function DeleteIcon(props: ComponentProps<"svg">) {
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
        d="M4 5h8l-.672 7.14a1.5 1.5 0 0 1-1.493 1.36h-3.67a1.5 1.5 0 0 1-1.493-1.36L4 5ZM5.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V5h-5V3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M2.5 5h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
