import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function CheckIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M16 6L8 14L4 10" />
    </Icon>
  );
}
