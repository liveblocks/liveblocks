import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function QuestionMarkIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-3h.007" />
      <path d="M8 7.5C8 7 8.5 6 10 6s2 1 2 2c0 1.5-2 2-2 3.5" />
      <circle cx={10} cy={14} r={0.25} />
    </Icon>
  );
}
