import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function EmojiAddIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M11 3.07A7 7 0 1 0 16.93 9" />
      <path d="M7.5 11.5S8.25 13 10 13s2.5-1.5 2.5-1.5M8 8h0" />
      <path d="M12 8h0" />
      <path d="M13 5h4m-2-2v4" />
      <circle cx="8" cy="8" r=".25" />
      <circle cx="12" cy="8" r=".25" />
    </Icon>
  );
}
