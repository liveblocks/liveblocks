import { ComponentProps } from "react";

export function SpellcheckIcon(props: ComponentProps<"svg">) {
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
      <path d="M6 16l6-12 6 12M8 12h8M16 20l2 2 4-4" />
    </svg>
  );
}
