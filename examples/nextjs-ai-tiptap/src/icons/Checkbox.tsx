import { ComponentProps } from "react";

export function CheckboxIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 10.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h12.5" />
      <path d="M9 11l3 3L22 4" />
    </svg>
  );
}
