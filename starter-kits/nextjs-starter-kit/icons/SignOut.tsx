import { ComponentProps } from "react";

export function SignOutIcon(props: ComponentProps<"svg">) {
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
        d="M6 13H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1M10 11l3-3-3-3M12.5 8H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
