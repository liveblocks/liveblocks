import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CrossIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M15 5L5 15" />
      <path d="M5 5L15 15" />
    </Icon>
  );
}
