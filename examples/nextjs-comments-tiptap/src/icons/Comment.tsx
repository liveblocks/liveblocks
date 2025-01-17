import { ComponentProps } from "react";

export function CommentIcon(props: ComponentProps<"svg">) {
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
      {...props}
    >
      <path d="M10 16a6 6 0 10-5.552-3.72c.094.229.12.482.052.719l-.753 2.636a.5.5 0 00.618.618l2.636-.753a1.1 1.1 0 01.719.052A6.002 6.002 0 0010 16z" />
    </svg>
  );
}
