import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function DeleteIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4.5 6.5h11M14 6.5V14a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 14V6.5M7.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" />
    </Icon>
  );
}
