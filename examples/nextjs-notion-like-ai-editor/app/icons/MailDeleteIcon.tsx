import { ComponentProps } from "react";

export function MailDeleteIcon(props: ComponentProps<"svg">) {
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
      <path d="M22 13V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12c0 1.1.9 2 2 2h9" />
      <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7M17 17l4 4M21 17l-4 4" />
    </svg>
  );
}
