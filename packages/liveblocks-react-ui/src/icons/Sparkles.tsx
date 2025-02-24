import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function SparklesIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M8.333 7.833a.333.333 0 0 0-.666 0 3.833 3.833 0 0 1-3.834 3.834.333.333 0 1 0 0 .666 3.833 3.833 0 0 1 3.834 3.834.333.333 0 0 0 .666 0 3.833 3.833 0 0 1 3.834-3.834.333.333 0 1 0 0-.666 3.833 3.833 0 0 1-3.834-3.834ZM16 6.5A2.5 2.5 0 0 1 13.5 4 2.5 2.5 0 0 1 11 6.5 2.5 2.5 0 0 1 13.5 9 2.5 2.5 0 0 1 16 6.5Z" />
    </Icon>
  );
}
