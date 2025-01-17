import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ShortenIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M15.5 8.5H13m2.5-3h-4m-5 9v-9m0 0 3 3m-3-3-3 3" />
    </Icon>
  );
}
