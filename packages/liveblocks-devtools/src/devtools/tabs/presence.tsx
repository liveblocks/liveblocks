import cx from "classnames";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { EmptyState } from "../components/EmptyState";
import { PresenceTree } from "../components/Tree";
import { useMe, useOthers } from "../contexts/CurrentRoom";

export function Presence({ className, ...props }: ComponentProps<"div">) {
  const me = useMe();
  const others = useOthers();
  const presence = useMemo(() => (me ? [me, ...others] : others), [me, others]);

  return presence.length > 0 ? (
    <div
      className={cx(className, "absolute inset-0 flex h-full flex-col")}
      {...props}
    >
      <PresenceTree data={presence} />
    </div>
  ) : (
    <EmptyState
      title={<>No presence found</>}
      description={<>There seems to be no users present in this&nbsp;room.</>}
    />
  );
}
