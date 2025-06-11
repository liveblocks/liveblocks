import {
  type AiToolExecuteCallback,
  type AiToolTypePack,
  type JsonObject,
  kInternal,
  type NoInfr,
  type ToolResultData,
} from "@liveblocks/core";
import type { ComponentProps, ReactNode } from "react";
import { Children, forwardRef, useCallback, useMemo } from "react";

import { Button } from "../_private";
import { CheckCircleFillIcon, ChevronRightIcon, SpinnerIcon } from "../icons";
import {
  type AiToolConfirmationOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../overrides";
import { useAiToolInvocationContext } from "../primitives/AiMessage/contexts";
import * as Collapsible from "../primitives/Collapsible";
import { classNames } from "../utils/class-names";
import { useSemiControllableState } from "../utils/use-controllable-state";
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

  /**
   * Whether the content is currently collapsed.
   * It is not a traditional controlled value, as in if you set it to `true` it would only stay expanded.
   * Instead, it is "semi-controlled", meaning that setting it to `true` will expand it, but it
   * can still be collapsed/expanded by clicking on it.
   */
  collapsed?: boolean;

  /**
   * The event handler called when the content is collapsed or expanded by clicking on it.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
}

export type AiToolIconProps = ComponentProps<"div">;

export type AiToolInspectorProps = ComponentProps<"div">;

/**
 * @private This API will change, and is not considered stable. DO NOT RELY on it.
 *
 * This component can be used to build human-in-the-loop interfaces.
 */
export interface AiToolConfirmationProps<
  A extends JsonObject,
  R extends ToolResultData,
> extends ComponentProps<"div"> {
  types?: NoInfr<AiToolTypePack<A, R>>;
  args?: A;
  confirm: AiToolExecuteCallback<A, R>;
  cancel: AiToolExecuteCallback<A, R>;
  variant?: "default" | "destructive";
  overrides?: Partial<GlobalOverrides & AiToolConfirmationOverrides>;
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
  overrides,
  className,
  ...props
}: AiToolConfirmationProps<A, R>) {
  const { stage, args, respond, name, invocationId } =
    useAiToolInvocationContext();
  const $ = useOverrides(overrides);

  const enabled = stage === "executing";

  const context = useMemo(() => ({ name, invocationId }), [name, invocationId]);

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

  // If there's no content and the tool has been executed (so there's no
  // confirmation UI displayed either), don't render anything.
  if (stage === "executed" && !children) {
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
      {stage !== "executed" && (
        <div className="lb-ai-tool-confirmation-footer">
          <div className="lb-ai-tool-confirmation-actions">
            <Button
              disabled={!enabled}
              onClick={onCancelClick}
              variant="secondary"
            >
              {$.AI_TOOL_CONFIRMATION_CANCEL}
            </Button>
            <Button
              disabled={!enabled}
              onClick={onConfirmClick}
              variant={variant === "destructive" ? "destructive" : "primary"}
            >
              {$.AI_TOOL_CONFIRMATION_CONFIRM}
            </Button>
          </div>
        </div>
      )}
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

export const AiTool = Object.assign(
  forwardRef<HTMLDivElement, AiToolProps>(
    (
      {
        children,
        title,
        icon,
        collapsed,
        onCollapsedChange,
        className,
        ...props
      },
      forwardedRef
    ) => {
      const {
        stage,
        name,
        [kInternal]: { execute },
      } = useAiToolInvocationContext();
      const [semiControlledCollapsed, onSemiControlledCollapsed] =
        useSemiControllableState(collapsed ?? false, onCollapsedChange);
      // TODO: This check won't work for cases like:
      //         <AiTool>
      //           <ComponentThatRendersNull />
      //           <ComponentThatAlsoRendersNull />
      //         </AiTool>
      //       One solution could be to check the DOM on every render with `useLayoutEffect`
      //       to see if there's any actual content.
      //       For now we're limiting the visual issues caused by the above by using CSS's
      //       `:empty` pseudo-class to make the content 0px high if it's actually empty.
      const hasContent = Children.count(children) > 0;
      const resolvedTitle = useMemo(() => {
        return title ?? prettifyString(name);
      }, [title, name]);

      // `AiTool` uses "collapsed" instead of "open" (like the `Composer` component) because "open"
      // makes sense next to something called "Collapsible" but less so for something called "AiTool".
      const handleCollapsibleOpenChange = useCallback(
        (open: boolean) => {
          onSemiControlledCollapsed(!open);
        },
        [onSemiControlledCollapsed]
      );

      return (
        <Collapsible.Root
          ref={forwardedRef}
          className={classNames("lb-collapsible lb-ai-tool", className)}
          {...props}
          // Regardless of `semiControlledCollapsed`, the collapsible is closed if there's no content.
          open={hasContent ? !semiControlledCollapsed : false}
          onOpenChange={handleCollapsibleOpenChange}
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
              {stage === "executed" ? (
                <CheckCircleFillIcon />
              ) : execute !== undefined ? (
                // Only show a spinner if the tool has an `execute` method.
                <SpinnerIcon />
              ) : null}
            </div>
          </Collapsible.Trigger>

          {hasContent ? (
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
