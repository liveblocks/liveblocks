import type { ComponentProps } from "react";
import React from "react";

import { Icon } from "../components/internal/Icon";

export function MissingIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m11.4 4.602-.52-.967a1 1 0 0 0-1.76 0l-.52.967m-4.293 7.97-.513.954A1 1 0 0 0 4.674 15h.976m10.043-2.427.513.953a1 1 0 0 1-.88 1.474h-.976M5.93 9.56 7 7.57m7.07 1.988L13 7.571M9 15h2m-1-7.5v2m0 2.5h.007" />
      <circle cx={10} cy={12} r={0.25} />
    </Icon>
  );
}
