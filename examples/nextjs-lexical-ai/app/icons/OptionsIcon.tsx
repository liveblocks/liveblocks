import { ComponentProps } from "react";

export function OptionsIcon(props: ComponentProps<"svg">) {
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
      <path d="M4 12L20 12" />
      <path d="M4 6L20 6" />
      <path d="M4 18L20 18" />
    </svg>
  );
}
