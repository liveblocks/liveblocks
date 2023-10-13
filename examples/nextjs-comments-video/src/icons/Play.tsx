import { ComponentProps } from "react";

export function PlayIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3.5 14a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .741-.438l10 5.5a.5.5 0 0 1 0 .876l-10 5.5A.5.5 0 0 1 3.5 14ZM4 3.345v9.31L12.462 8 4 3.345Z" />
    </svg>
  );
}
