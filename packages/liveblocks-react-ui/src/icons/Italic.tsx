import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ItalicIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M15 4.25H8m4 11.5H5m6.75-11.5-3.5 11.5" />
    </Icon>
  );
}
