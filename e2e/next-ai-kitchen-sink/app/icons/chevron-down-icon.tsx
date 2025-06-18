import { SVGAttributes } from "react";

export function ChevronDownIcon(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      {...props}
    >
      <path d="M14.5 8.5 10 13 5.5 8.5" />
    </svg>
  );
}
