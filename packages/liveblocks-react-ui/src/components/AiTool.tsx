import type {
  AiToolExecuteCallback,
  AiToolTypePack,
  JsonObject,
  NoInfr,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import type { ComponentProps, ReactNode } from "react";
import { Children, forwardRef, useCallback, useMemo } from "react";

import { Button } from "../_private";
import {
  CheckCircleFillIcon,
  ChevronRightIcon,
  CrossCircleFillIcon,
  MinusCircleIcon,
  SpinnerIcon,
} from "../icons";
import {
  type AiToolConfirmationOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../overrides";
import { useAiToolInvocationContext } from "../primitives/AiMessage/contexts";
import * as Collapsible from "../primitives/Collapsible";
import { cn } from "../utils/cn";
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
   * The visual appearance of the tool.
   */
  variant?: "block" | "minimal";

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

  /**
   * Whether the content can be collapsed/expanded.
   * If set to `false`, clicking on it will have no effect.
   * If there's no content, this prop has no effect.
   */
  collapsible?: boolean;
}

export type AiToolIconProps = ComponentProps<"div">;

export type AiToolInspectorProps = ComponentProps<"div">;

export interface AiToolConfirmationProps<
  A extends JsonObject,
  R extends JsonObject,
> extends ComponentProps<"div"> {
  /**
   * The callback invoked when the user clicks the confirm button.
   */
  confirm: AiToolExecuteCallback<A, R>;

  /**
   * The callback invoked when the user clicks the cancel button.
   */
  cancel?: AiToolExecuteCallback<A, R>;

  /**
   * The visual appearance.
   */
  variant?: "default" | "destructive";

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & AiToolConfirmationOverrides>;

  /**
   * The tool's result type, to be used with the `types` prop in the `render` method.
   *
   * @example
   * defineAiTool<{ value: number }>()({
   *   // ...
   *   render: ({ types }) => (
   *     <AiTool.Confirmation
   *       types={types}
   *       confirm={() => {
   *         return {
   *           // Using `types` makes the result type-safe
   *           // based on the tool's definition
   *           data: { value: 123 },
   *         };
   *       }}
   *     />
   *   ),
   * })
   */
  types?: NoInfr<AiToolTypePack<A, R>>;
}

function AiToolIcon({ className, ...props }: AiToolIconProps) {
  return <div className={cn("lb-ai-tool-icon", className)} {...props} />;
}

function AiToolInspector({ className, ...props }: AiToolInspectorProps) {
  const { args, partialArgs, result } = useAiToolInvocationContext();

  return (
    <div className={cn("lb-ai-tool-inspector", className)} {...props}>
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
  R extends JsonObject = TPack["R"],
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
      const result = await confirm(args as A, context);
      respond(result ?? undefined);
    }
  }, [enabled, args, confirm, respond, context]);

  const onCancelClick = useCallback(async () => {
    if (enabled) {
      if (cancel === undefined) {
        respond({ cancel: true });
      } else {
        const result = await cancel(args as A, context);
        respond(result ?? undefined);
      }
    }
  }, [enabled, args, cancel, respond, context]);

  // If there's no content and the tool has been executed (so there's no
  // confirmation UI displayed either), don't render anything.
  if (stage === "executed" && !children) {
    return null;
  }

  return (
    <div className={cn("lb-ai-tool-confirmation", className)} {...props}>
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

/**
 * A pre-built component which displays a tool call.
 *
 * By default, a human-readable version of the tool's name is used as a title:
 * - `"showTodo"` → "Show todo"
 * - `"get_weather"` → "Get weather"
 *
 * @example
 * defineAiTool()({
 *   // ...
 *   render: () => (
 *     <AiTool />
 *   ),
 * })
 *
 * It can be customized in various ways:
 * - adding an icon
 * - customizing the title (even dynamically)
 * - adding custom content inside it
 * - collapsing it conditionally
 * - etc.
 *
 * @example
 * defineAiTool()({
 *   // ...
 *   render: ({ stage, result }) => (
 *     <AiTool
 *       icon="🔍"
 *
 *       // Override the default title based on the tool's stage
 *       title={stage === "executing" ? "Searching…" : "Search results"}
 *
 *       // Start open and automatically collapse after it is executed
 *       // The user can still expand/collapse it manually at any time
 *       collapsed={stage === "executed"}
 *     >
 *       <SearchResults data={result.data} />
 *     </AiTool>
 *   ),
 * })
 *
 * It also comes with a few built-in sub-components:
 * - `AiTool.Confirmation` to display a human-in-the-loop confirmation step
 *   which can be accepted or cancelled by the user.
 * - `AiTool.Inspector` to display the tool's arguments and result which can
 *   be useful during development.
 *
 * @example
 * defineAiTool()({
 *   // ...
 *   render: () => (
 *     <AiTool>
 *       <AiTool.Confirmation
 *         // Use a destructive visual appearance
 *         variant="destructive"
 *
 *         // The tool's arguments can be directly accessed like in `execute`
 *         confirm={({ pageIds }) => {
 *           const deletedPageTitles = pages
 *             .filter((p) => pageIds.includes(p.id))
 *             .map((page) => page.title);
 *
 *           deletePages(pageIds);
 *
 *           // This result will be available as `result` in the tool's `render` props
 *           return { data: { deletedPageTitles } };
 *         }}
 *
 *         // If needed, `cancel={() => ...}` would work similarly
 *       >
 *         Do you want to delete these pages?
 *         <PagesPreviews />
 *       </AiTool.Confirmation>
 *     </AiTool>
 *   ),
 * })
 *
 * @example
 * defineAiTool()({
 *   // ...
 *   render: () => (
 *     <AiTool>
 *       <AiTool.Inspector />
 *     </AiTool>
 *   ),
 * })
 */
export const AiTool = Object.assign(
  forwardRef<HTMLDivElement, AiToolProps>(
    (
      {
        children,
        title,
        icon,
        collapsible,
        collapsed,
        onCollapsedChange,
        variant = "block",
        className,
        ...props
      },
      forwardedRef
    ) => {
      const {
        stage,
        result,
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
      // If there's no content, the tool is never collapsible.
      const isCollapsible = hasContent ? (collapsible ?? true) : false;
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
          className={cn(
            "lb-collapsible lb-ai-tool",
            `lb-ai-tool:variant-${variant}`,
            className
          )}
          {...props}
          // Regardless of `semiControlledCollapsed`, the collapsible is closed if there's no content.
          open={hasContent ? !semiControlledCollapsed : false}
          onOpenChange={handleCollapsibleOpenChange}
          disabled={!isCollapsible}
          data-result={result?.type}
          data-stage={stage}
        >
          <Collapsible.Trigger
            className={cn(
              "lb-collapsible-trigger lb-ai-tool-header",
              // The minimal variant uses a shimmer instead of a spinner.
              // (Similar to the spinner, it's only shown if the tool has an `execute` method)
              variant === "minimal" &&
                stage !== "executed" &&
                execute !== undefined &&
                "lb-ai-chat-pending"
            )}
          >
            {icon ? (
              <div className="lb-ai-tool-header-icon-container">{icon}</div>
            ) : null}
            <span className="lb-ai-tool-header-title">{resolvedTitle}</span>
            {isCollapsible ? (
              <span className="lb-collapsible-chevron lb-icon-container">
                <ChevronRightIcon />
              </span>
            ) : null}
            {variant !== "minimal" ? (
              <div className="lb-ai-tool-header-status">
                {stage === "executed" ? (
                  result.type === "success" ? (
                    <CheckCircleFillIcon />
                  ) : result.type === "error" ? (
                    <CrossCircleFillIcon />
                  ) : result.type === "cancelled" ? (
                    <MinusCircleIcon />
                  ) : null
                ) : execute !== undefined ? (
                  // Only show a spinner if the tool has an `execute` method.
                  <SpinnerIcon />
                ) : null}
              </div>
            ) : null}
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
    /**
     * Display an icon in a container.
     *
     * @example
     * <AiTool
     *   icon={
     *     <AiTool.Icon>🔍</AiTool.Icon>
     *   }
     * />
     */
    Icon: AiToolIcon,

    /**
     * Display the tool's arguments and result, which can be useful during
     * development.
     *
     * @example
     * <AiTool>
     *   <AiTool.Inspector />
     * </AiTool>
     */
    Inspector: AiToolInspector,

    /**
     * Display a human-in-the-loop confirmation step which can be accepted
     * or cancelled by the user.
     *
     * The `confirm` and `cancel` callbacks work like `execute` in tool definitions: they can
     * perform side-effects, be async if needed, and return a result. The tool call will stay
     * pending until either `confirm` or `cancel` is called.
     *
     * @example
     * <AiTool>
     *   <AiTool.Confirmation
     *     // Use a destructive visual appearance
     *     variant="destructive"
     *
     *     // The tool's arguments can be directly accessed like in `execute`
     *     confirm={({ pageIds }) => {
     *       const deletedPageTitles = pages
     *         .filter((p) => pageIds.includes(p.id))
     *         .map((page) => page.title);
     *
     *       deletePages(pageIds);
     *
     *       // This result will be available as `result` in the tool's `render` props
     *       return { data: { deletedPageTitles } };
     *     }}
     *
     *     // If needed, `cancel={() => ...}` would work similarly
     *   >
     *     Do you want to delete these pages?
     *     <PagesPreviews />
     *   </AiTool.Confirmation>
     * </AiTool>
     */
    Confirmation: AiToolConfirmation,
  }
);
