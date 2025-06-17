import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function RetryIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3.67 7a7 7 0 0 1 13.26 2M3.07 11a7 7 0 0 0 13.26 2" />
      <path d="M3.5 3.5V7H7m9.5 9.5V13H13" />
    </Icon>
  );
}
