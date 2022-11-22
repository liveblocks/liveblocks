import cx from "classnames";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { Tree } from "../components/Tree";
import { useMe, useOthers } from "../contexts/CurrentRoom";

export function Presence({ className, ...props }: ComponentProps<"div">) {
  const me = useMe();
  const others = useOthers();
  const data = useMemo(() => (me ? [me, ...others] : others), [me, others]);

  return (
    <div
      className={cx(className, "absolute inset-0 flex h-full flex-col")}
      {...props}
    >
      {data !== null ? <Tree data={data} openByDefault={false} /> : null}
    </div>
  );
}
