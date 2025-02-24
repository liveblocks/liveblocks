import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function TextIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M5 6V4.75h10V6m-6.5 9.25h3M10 4.75v10.5" />
    </Icon>
  );
}
