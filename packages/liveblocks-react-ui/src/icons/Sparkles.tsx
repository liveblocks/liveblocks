import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function SparklesIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M12.333 3.833a.333.333 0 1 0-.666 0 3.833 3.833 0 0 1-3.834 3.834.333.333 0 0 0 0 .666 3.833 3.833 0 0 1 3.834 3.834.333.333 0 1 0 .666 0 3.833 3.833 0 0 1 3.834-3.834.333.333 0 0 0 0-.666 3.833 3.833 0 0 1-3.834-3.834ZM9 13.5A2.5 2.5 0 0 1 6.5 11 2.5 2.5 0 0 1 4 13.5 2.5 2.5 0 0 1 6.5 16 2.5 2.5 0 0 1 9 13.5Z" />
    </Icon>
  );
}
