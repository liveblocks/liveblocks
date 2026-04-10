import type { ComponentProps } from "react";

import { Icon } from "../components/internal/Icon";

export function GlobeIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx={10} cy={10} r={7} />
      <path d="M3 10h14M10 3s-3 3-3 7 3 7 3 7M10 3s3 3 3 7-3 7-3 7" />
    </Icon>
  );
}
