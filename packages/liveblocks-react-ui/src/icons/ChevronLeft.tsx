import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ChevronLeftIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M11.5 5.5 7 10l4.5 4.5" />
    </Icon>
  );
}
