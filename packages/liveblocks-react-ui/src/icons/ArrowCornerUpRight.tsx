import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ArrowCornerUpRightIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 7.5H7.5a3 3 0 0 0-3 3V16M16 7.5 12.5 4M16 7.5 12.5 11" />
    </Icon>
  );
}
