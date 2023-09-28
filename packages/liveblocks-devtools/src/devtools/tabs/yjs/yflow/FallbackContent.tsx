import cx from "classnames";
import type { ComponentProps } from "react";

import { EllipsisIcon } from "../../../icons/tree";

interface Props extends Omit<ComponentProps<"div">, "content"> {
  content: unknown;
}

function FallbackContent({ content, className, ...props }: Props) {
  return (
    <div className={cx(className, "flex flex-col gap-1.5")} {...props}>
      <div className="flex items-center">
        <EllipsisIcon className="text-blue-500 dark:text-blue-400 mr-1" />
        <span className="truncate font-mono text-[95%]">
          {content.constructor.name}
        </span>
      </div>
    </div>
  );
}

export default FallbackContent;
