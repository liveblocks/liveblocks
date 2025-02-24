import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function ChevronUpIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M14.5 11.5 10 7l-4.5 4.5" />
    </Icon>
  );
}
