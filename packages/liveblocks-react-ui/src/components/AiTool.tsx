import type { ComponentProps, ReactNode } from "react";
import {
  Children,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "../_private";
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  SpinnerIcon,
} from "../icons";
import * as CollapsiblePrimitive from "../primitives/internal/Collapsible";
import { classNames } from "../utils/class-names";
import { useAiToolDefinitionRenderContext } from "./internal/AiChatAssistantMessage";

export interface AiToolProps extends Omit<ComponentProps<"div">, "title"> {
  title?: string;
  icon?: ReactNode;
}

export type AiToolIconProps = ComponentProps<"div">;

export type AiToolInspectorProps = ComponentProps<"div">;

function CodeBlock({ title, code }: { title: ReactNode; code: string }) {
  const [isCopied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCopied) {
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isCopied]);

  return (
    <div className="lb-code-block">
      <div className="lb-code-block-header">
        <span className="lb-code-block-title">{title}</span>
        <div className="lb-code-block-header-actions">
          <Button
            className="lb-code-block-header-action"
            icon={isCopied ? <CheckIcon /> : <CopyIcon />}
            onClick={() => {
              setCopied(true);
              navigator.clipboard.writeText(code);
            }}
          />
        </div>
      </div>
      <pre className="lb-code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AiToolInspector({ className, ...props }: AiToolInspectorProps) {
  const { args, partialArgs, result } = useAiToolDefinitionRenderContext();

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
      const { status, toolName } = useAiToolDefinitionRenderContext();
      const [isOpen, setIsOpen] = useState(true);
      // TODO: If there are children but they render null?
      //       Could we do a 2 levels deep check where we look at `children` and if there are any we look at `children` of the children?
      const hasChildren = Children.count(children) > 0;
      const resolvedTitle = useMemo(() => {
        return title ?? prettifyString(toolName);
      }, [title, toolName]);

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
                {status === "executed" ? <CheckCircleIcon /> : <SpinnerIcon />}
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
    Inspector: AiToolInspector,
  }
);
