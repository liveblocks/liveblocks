import cx from "classnames";
import type { ComponentProps } from "react";
import type * as Y from "yjs";

import { StringIcon } from "../../../icons/tree";

interface Props extends Omit<ComponentProps<"div">, "content"> {
  content: Y.ContentString;
}

function ContentString({ content, className, ...props }: Props) {
  return (
    <div className={cx(className, "flex flex-col gap-1.5")} {...props}>
      <div className="flex items-center">
        <StringIcon className="text-blue-500 dark:text-blue-400 mr-1" />
        <span className="truncate font-mono text-[95%]">ContentString</span>
      </div>
      <div className="truncate font-mono text-[95%] opacity-60">
        {content.str}
      </div>
    </div>
  );
}

export default ContentString;
