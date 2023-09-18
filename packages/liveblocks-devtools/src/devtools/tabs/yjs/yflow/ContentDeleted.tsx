import cx from "classnames";
import type { ComponentProps } from "react";
import type * as Y from "yjs";

import { CrossIcon } from "../../../icons/tree";

interface Props extends Omit<ComponentProps<"div">, "content"> {
  content: Y.ContentDeleted;
}

function ContentDeleted({ content, className, ...props }: Props) {
  return (
    <div className={cx(className, "flex flex-col gap-1.5")} {...props}>
      <div className="flex items-center">
        <CrossIcon className="text-orange-500 dark:text-orange-400 mr-1" />
        <span className="truncate font-mono text-[95%]">ContentDeleted</span>
      </div>
      <div className="truncate font-mono text-[95%] opacity-60">
        {content.len} deletion{content.len === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default ContentDeleted;
