import type { ComponentProps, ReactNode } from "react";
import { Children, forwardRef, useMemo, useState } from "react";

import { ChevronRightIcon, SpinnerIcon } from "../icons";
import * as CollapsiblePrimitive from "../primitives/internal/Collapsible";
import { classNames } from "../utils/class-names";

// TODO: Context with AiToolDefinitionRenderProps

export interface AiToolProps extends Omit<ComponentProps<"div">, "title"> {
  title?: string;
  icon?: ReactNode;
}

export type AiToolIconProps = ComponentProps<"div">;

function AiToolIcon({ className, ...props }: AiToolIconProps) {
  return (
    <div className={classNames("lb-ai-tool-icon", className)} {...props} />
  );
}

function prettifyString(string: string) {
  return (
    string
      // Convert camelCase to spaces
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Convert snake_case and kebab-case to spaces
      .replace(/[_-]+/g, " ")
      // Collapse multiple following spaces
      .replace(/\s+/g, " ")
      // Trim leading and trailing spaces
      .trim()
      // Capitalize first word
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

const noop = () => {};

export const AiTool = Object.assign(
  forwardRef<HTMLDivElement, AiToolProps>(
    ({ children, title, icon, className, ...props }, forwardedRef) => {
      const [isOpen, setIsOpen] = useState(false);
      // TODO: If there are children but they render null
      const hasChildren = Children.count(children) > 0;
      console.log(
        children,
        Children.toArray(children),
        Children.count(children)
      );
      const resolvedTitle = useMemo(() => {
        // TODO: Access toolName
        return title ?? prettifyString("toolName");
      }, [title]);

      return (
        <CollapsiblePrimitive.Root
          ref={forwardedRef}
          className={classNames("lb-collapsible lb-ai-tool", className)}
          {...props}
          open={hasChildren ? isOpen : false}
          onOpenChange={hasChildren ? setIsOpen : noop}
          disabled={!hasChildren}
        >
          {/* TODO: <button> vs <div> with attributes */}
          <CollapsiblePrimitive.Trigger asChild>
            <div
              className={classNames("lb-collapsible-trigger lb-ai-tool-header")}
            >
              {icon ? (
                <div className="lb-ai-tool-header-icon-container">{icon}</div>
              ) : null}
              <span className="lb-ai-tool-header-title">{resolvedTitle}</span>
              {hasChildren ? (
                <span className="lb-collapsible-chevron lb-icon-container">
                  <ChevronRightIcon />
                </span>
              ) : null}
              <div className="lb-ai-tool-header-status">
                {/* TODO: Access status */}
                <SpinnerIcon />
              </div>
            </div>
          </CollapsiblePrimitive.Trigger>

          {children ? (
            <CollapsiblePrimitive.Content className="lb-collapsible-content lb-ai-tool-content-container">
              <div className="lb-ai-tool-content">{children}</div>
            </CollapsiblePrimitive.Content>
          ) : null}
        </CollapsiblePrimitive.Root>
      );
    }
  ),
  {
    Icon: AiToolIcon,
  }
);
