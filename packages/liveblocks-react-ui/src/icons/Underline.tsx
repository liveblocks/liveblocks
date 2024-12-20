import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function UnderlineIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M6.5 4.5V9a3.5 3.5 0 0 0 3.5 3.5v0A3.5 3.5 0 0 0 13.5 9V4.5M15 16H5" />
    </Icon>
  );
}
