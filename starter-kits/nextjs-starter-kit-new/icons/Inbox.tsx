import { ComponentProps } from "react";

export function InboxIcon(props: ComponentProps<"svg">) {
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
        d="m2.05 8.85 1.5-4.48A2 2 0 0 1 5.44 3h5.1a2 2 0 0 1 1.9 1.37l1.5 4.48c.03.1.05.2.05.31V11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.16a1 1 0 0 1 .05-.31Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M2 9h3.09a1 1 0 0 1 .7.3l.42.4a1 1 0 0 0 .7.3H9.1a1 1 0 0 0 .7-.3l.42-.4a1 1 0 0 1 .7-.3H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
