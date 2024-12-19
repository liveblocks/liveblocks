import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function SearchIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12Zm7.5 1.5-3.25-3.25" />
    </Icon>
  );
}
