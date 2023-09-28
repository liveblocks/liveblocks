import cx from "classnames";
import type { ComponentProps } from "react";
import type * as Y from "yjs";

import { ObjectIcon } from "../../../icons/tree";

interface Props extends Omit<ComponentProps<"div">, "content"> {
  content: Y.ContentJSON;
}

function ContentJSON({ content, className, ...props }: Props) {
  return (
    <div className={cx(className, "flex flex-col gap-1.5")} {...props}>
      <div className="flex items-center">
        <ObjectIcon className="text-blue-500 dark:text-blue-400 mr-1" />
        <span className="truncate font-mono text-[95%]">ContentJSON</span>
      </div>
      <div className="truncate font-mono text-[95%] opacity-60">
        {content.arr?.toString()}
      </div>
    </div>
  );
}

export default ContentJSON;
