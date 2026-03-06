import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 10h12M10 4v12" />
    </Icon>
  );
}
