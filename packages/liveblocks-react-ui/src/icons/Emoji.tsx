import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function EmojiIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
      <path d="M7.5 11.5S8.25 13 10 13s2.5-1.5 2.5-1.5M8 8h.007" />
      <path d="M12 8h.007" />
      <circle cx={8} cy={8} r={0.25} />
      <circle cx={12} cy={8} r={0.25} />
    </Icon>
  );
}
