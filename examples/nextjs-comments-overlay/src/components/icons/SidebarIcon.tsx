import { ComponentProps } from "react";

export function SidebarIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 12 12"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#212134"
        d="m2.4.1.1-.1h9.4l.1.1v2.2l-.1.1H2.5l-.1-.1V.1ZM0 4.9l.1-.1h9.4l.1.1v2.2l-.1.1H.1L0 7.1V4.9Zm2.5 4.7-.1.1v2.2l.1.1h9.4l.1-.1V9.7l-.1-.1H2.5Z"
      />
    </svg>
  );
}
