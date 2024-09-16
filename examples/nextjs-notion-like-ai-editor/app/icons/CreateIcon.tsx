import { ComponentProps } from "react";

export function CreateIcon(props: ComponentProps<"svg">) {
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
      <path d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.375 2.625a1 1 0 013 3l-9.013 9.014a2 2 0 01-.853.505l-2.873.84a.5.5 0 01-.62-.62l.84-2.873a2 2 0 01.506-.852z" />
    </svg>
  );
}
