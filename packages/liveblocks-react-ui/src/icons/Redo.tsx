import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function RedoIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 8H7.5A3.5 3.5 0 0 0 4 11.5v0A3.5 3.5 0 0 0 7.5 15H9" />
      <path d="m13 5 3 3-3 3" />
    </Icon>
  );
}
