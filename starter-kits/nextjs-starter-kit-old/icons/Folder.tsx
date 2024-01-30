import { ComponentProps } from "react";

export function FolderIcon(props: ComponentProps<"svg">) {
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
        d="M4 13h8a2 2 0 0 0 2-2V6.997a2 2 0 0 0-1.997-2l-3.178-.004a2 2 0 0 1-1.41-.583l-.83-.827A2 2 0 0 0 5.174 3H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
