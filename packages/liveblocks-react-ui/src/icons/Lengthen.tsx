import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function LengthenIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M15.5 11.5H13m2.5 3h-4m4-6H10m5.5-3H10m-3.5 0v9m0 0 3-3m-3 3-3-3" />
    </Icon>
  );
}
