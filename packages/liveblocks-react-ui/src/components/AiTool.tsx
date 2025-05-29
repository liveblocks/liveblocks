import {
  type AiToolExecuteCallback,
  type AiToolTypePack,
  type JsonObject,
  kInternal,
  type NoInfr,
  type ToolResultData,
} from "@liveblocks/core";
import type { ComponentProps, ReactNode } from "react";
import { Children, forwardRef, useCallback, useMemo, useState } from "react";

import { Button } from "../_private";
import { CheckCircleFillIcon, ChevronRightIcon, SpinnerIcon } from "../icons";
import { useAiToolInvocationContext } from "../primitives/AiMessage/contexts";
import * as Collapsible from "../primitives/Collapsible";
import { classNames } from "../utils/class-names";
import { CodeBlock } from "./internal/CodeBlock";

export interface AiToolProps
  extends Omit<ComponentProps<"div">, "title" | "children"> {
  /**
   * The tool's title.
   *
   * By default, a human-readable version of the tool's name is used:
   * - `"showTodo"` → "Show todo"
   * - `"get_weather"` → "Get weather"
   */
  title?: string;

  /**
   * An optional icon displayed next to the title.
   */
  icon?: ReactNode;

  /**
   * The content shown in the tool.
   */
  children?: ReactNode;
}

export type AiToolIconProps = ComponentProps<"div">;

export type AiToolInspectorProps = ComponentProps<"div">;

// TODO: AiToolConfirmationProps might need a generic since we're outside of the
//       tool definition so things like inferred args and result types are not
//       available here for `confirm` and `cancel`

/**
 * @private This API will change, and is not considered stable. DO NOT RELY on it.
 *
 * This component can be used to build human-in-the-loop interfaces.
 */
export interface AiToolConfirmationProps<
  A extends JsonObject,
  R extends ToolResultData,
> extends ComponentProps<"div"> {
  $types?: NoInfr<AiToolTypePack<A, R>>;
  args?: A;
  confirm: AiToolExecuteCallback<A, R>;
  cancel: AiToolExecuteCallback<A, R>;
  variant?: "default" | "destructive";

  // TODO: Use existing overrides API to allow customizing the "Confirm" and "Cancel" labels
  // overrides?: Partial<GlobalOverrides & AiToolConfirmationOverrides>;
}

function AiToolIcon({ className, ...props }: AiToolIconProps) {
  return (
    <div className={classNames("lb-ai-tool-icon", className)} {...props} />
  );
}

function AiToolInspector({ className, ...props }: AiToolInspectorProps) {
  const { args, partialArgs, result } = useAiToolInvocationContext();

  return (
    <div className={classNames("lb-ai-tool-inspector", className)} {...props}>
      <CodeBlock
        title="Arguments"
        code={JSON.stringify(args ?? partialArgs, null, 2)}
      />
      {result !== undefined ? (
        <CodeBlock title="Result" code={JSON.stringify(result, null, 2)} />
      ) : null}
    </div>
  );
}

function AiToolConfirmation<
  TPack extends AiToolTypePack,
  A extends JsonObject = TPack["A"],
  R extends ToolResultData = TPack["R"],
>({
  children,
  variant = "default",
  confirm,
  cancel,
  className,
  ...props
}: AiToolConfirmationProps<A, R>) {
  const { status, args, respond, toolName, toolCallId } =
    useAiToolInvocationContext();

  const enabled = status === "executing";

  const context = useMemo(
    () => ({ toolName, toolCallId }),
    [toolName, toolCallId]
  );

  const onConfirmClick = useCallback(async () => {
    if (enabled) {
      respond(await confirm(args as A, context));
    }
  }, [enabled, args, confirm, respond, context]);

  const onCancelClick = useCallback(async () => {
    if (enabled) {
      respond(await cancel(args as A, context));
    }
  }, [enabled, args, cancel, respond, context]);

  if (status === "executed") {
    return null;
  }

  return (
    <div
      className={classNames("lb-ai-tool-confirmation", className)}
      {...props}
    >
      {children ? (
        <div className="lb-ai-tool-confirmation-content">{children}</div>
      ) : null}
      <div className="lb-ai-tool-confirmation-footer">
        <div className="lb-ai-tool-confirmation-actions">
          <Button
            disabled={!enabled}
            onClick={onConfirmClick}
            variant={variant === "destructive" ? "destructive" : "primary"}
          >
            Confirm
          </Button>
          <Button
            disabled={!enabled}
            onClick={onCancelClick}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
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
      .toLowerCase()
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

const noop = () => {};

export const AiTool = Object.assign(
  forwardRef<HTMLDivElement, AiToolProps>(
    ({ children, title, icon, className, ...props }, forwardedRef) => {
      const {
        status,
        toolName,
        [kInternal]: { execute },
      } = useAiToolInvocationContext();
      const [isOpen, setIsOpen] = useState(true);
      // TODO: This check won't work for cases like:
      //         <AiTool>
      //           <ComponentThatRendersNull />
      //           <ComponentThatAlsoRendersNull />
      //         </AiTool>
      //       One solution could be to check the DOM on every render with `useLayoutEffect`
      //       to see if there's any actual content.
      const hasContent = Children.count(children) > 0;
      const resolvedTitle = useMemo(() => {
        return title ?? prettifyString(toolName);
      }, [title, toolName]);

      return (
        <Collapsible.Root
          ref={forwardedRef}
          className={classNames("lb-collapsible lb-ai-tool", className)}
          {...props}
          open={hasContent ? isOpen : false}
          onOpenChange={hasContent ? setIsOpen : noop}
          disabled={!hasContent}
        >
          <Collapsible.Trigger className="lb-collapsible-trigger lb-ai-tool-header">
            {icon ? (
              <div className="lb-ai-tool-header-icon-container">{icon}</div>
            ) : null}
            <span className="lb-ai-tool-header-title">{resolvedTitle}</span>
            {hasContent ? (
              <span className="lb-collapsible-chevron lb-icon-container">
                <ChevronRightIcon />
              </span>
            ) : null}
            <div className="lb-ai-tool-header-status">
              {status === "executed" ? (
                <CheckCircleFillIcon />
              ) : execute !== undefined ? (
                // Only show a spinner if the tool has an `execute` method.
                <SpinnerIcon />
              ) : null}
            </div>
          </Collapsible.Trigger>

          {children ? (
            <Collapsible.Content className="lb-collapsible-content lb-ai-tool-content-container">
              <div className="lb-ai-tool-content">{children}</div>
            </Collapsible.Content>
          ) : null}
        </Collapsible.Root>
      );
    }
  ),
  {
    Icon: AiToolIcon,
    Inspector: AiToolInspector,
    Confirmation: AiToolConfirmation,
  }
);
