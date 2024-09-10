import { ComponentProps } from "react";

export function PriorityHighIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M3 16h4v5H3zm7-6h4v11h-4zm7-9h4v20h-4z"
      ></path>
    </svg>
  );
}
