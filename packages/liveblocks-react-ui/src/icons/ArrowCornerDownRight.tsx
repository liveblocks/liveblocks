import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ArrowCornerDownRightIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 12.5H7.5a3 3 0 0 1-3-3V4M16 12.5 12.5 16m3.5-3.5L12.5 9" />
    </Icon>
  );
}
