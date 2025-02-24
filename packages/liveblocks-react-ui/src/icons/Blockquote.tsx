import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function BlockquoteIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 14.25H9M16 10H9m7-4.25H4M4 10l2 2.13-2 2.12" />
    </Icon>
  );
}
