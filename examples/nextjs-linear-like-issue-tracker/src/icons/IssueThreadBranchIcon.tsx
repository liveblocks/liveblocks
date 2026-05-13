import { ComponentProps } from "react";

/** L-shaped thread connector (Linear-style nested reference). */
export function IssueThreadBranchIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="14"
      height="18"
      viewBox="0 0 14 18"
      aria-hidden
      className="text-neutral-300"
      {...props}
    >
      <path
        d="M2 1.5v9c0 2.5 1.5 4 4 4h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
