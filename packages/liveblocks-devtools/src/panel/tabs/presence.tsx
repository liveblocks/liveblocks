import type {
  BaseUserMeta,
  Json,
  JsonObject,
  PrimitiveTreeNode,
  User,
  UserTreeNode,
} from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { Tree } from "../components/Tree";
import { useMe, useOthers } from "../contexts/CurrentRoom";

const defaultPresenceValues: Partial<
  Record<keyof User<JsonObject, BaseUserMeta>, Json>
> = {
  id: null,
  info: null,
};

function filterPresenceTree(tree: readonly UserTreeNode[]): UserTreeNode[] {
  return tree.map((user) => {
    const fields = user.fields.map((field) => {
      const isVisibleElsewhere =
        field.key === "connectionId" || field.key === "isReadOnly";
      const isDefaultValue =
        field.type === "Json"
          ? defaultPresenceValues[field.key] === field.value
          : false;
      const isHidden = isVisibleElsewhere || isDefaultValue;

      return !isHidden ? field : undefined;
    });

    return {
      ...user,
      fields: fields.filter(Boolean) as PrimitiveTreeNode<
        keyof User<JsonObject, BaseUserMeta>
      >[],
    };
  });
}

export function Presence({ className, ...props }: ComponentProps<"div">) {
  const me = useMe();
  const others = useOthers();
  const tree = useMemo(() => (me ? [me, ...others] : others), [me, others]);
  const filteredTree = useMemo(() => filterPresenceTree(tree), [tree]);

  return (
    <div
      className={cx(className, "absolute inset-0 flex h-full flex-col")}
      {...props}
    >
      <Tree data={filteredTree} openByDefault={false} />
    </div>
  );
}
