import { ComponentProps } from "react";

export function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      viewBox="0 0 20 20"
      height="16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m6.095 7 .735 8.09a1 1 0 0 0 .996.91h4.348a1 1 0 0 0 .995-.91L13.905 7h-7.81Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M6 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h3a1 1 0 1 1 0 2h-1.087l-.752 8.272A3 3 0 0 1 12.174 18H7.826a3 3 0 0 1-2.987-2.728L4.087 7H3a1 1 0 0 1 0-2h3V4Zm2 1h4V4H8v1ZM6.095 7l.736 8.09a1 1 0 0 0 .995.91h4.348a1 1 0 0 0 .995-.91L13.905 7H6.095"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}