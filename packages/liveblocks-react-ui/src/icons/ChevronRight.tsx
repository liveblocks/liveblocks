import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ChevronRightIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M8.5 5.5 13 10l-4.5 4.5" />
    </Icon>
  );
}
