import cx from "classnames";
import type { ComponentProps } from "react";
import type * as Y from "yjs";

import { EllipsisIcon } from "../../../icons/tree";

interface Props extends Omit<ComponentProps<"div">, "content"> {
  content: Y.ContentFormat;
}

function ContentFormat({ content, className, ...props }: Props) {
  return (
    <div className={cx(className, "flex flex-col gap-1.5")} {...props}>
      <div className="flex items-center">
        <EllipsisIcon className="text-blue-500 dark:text-blue-400 mr-1" />
        <span className="truncate font-mono text-[95%]">ContentFormat</span>
      </div>
      <div className="truncate font-mono text-[95%] opacity-60">
        {content.value?.toString()}
      </div>
    </div>
  );
}

export default ContentFormat;
