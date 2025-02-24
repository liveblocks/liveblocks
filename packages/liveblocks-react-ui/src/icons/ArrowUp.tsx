import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ArrowUpIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 16V4m-6 6 6-6 6 6" />
    </Icon>
  );
}
