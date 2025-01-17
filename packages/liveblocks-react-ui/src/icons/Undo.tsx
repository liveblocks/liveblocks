import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function UndoIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 8h8.5a3.5 3.5 0 0 1 3.5 3.5v0a3.5 3.5 0 0 1-3.5 3.5H11" />
      <path d="M7 5 4 8l3 3" />
    </Icon>
  );
}
