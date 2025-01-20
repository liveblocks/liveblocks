import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ChevronDownIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M14.5 8.5 10 13 5.5 8.5" />
    </Icon>
  );
}
