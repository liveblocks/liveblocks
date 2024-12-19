import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ArrowDownIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 4v12m6-6-6 6-6-6" />
    </Icon>
  );
}
