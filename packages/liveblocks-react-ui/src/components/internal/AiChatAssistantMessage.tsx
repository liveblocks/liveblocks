import type { UiAssistantMessage } from "@liveblocks/core";
import {
  type ComponentProps,
  forwardRef,
  memo,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AiMessage,
  type AiMessageContentReasoningPartProps,
  type AiMessageContentTextPartProps,
  Button,
} from "../../_private";
import {
  ComponentsProvider,
  type GlobalComponents,
  useComponents,
} from "../../components";
import { CheckIcon } from "../../icons/Check";
import { ChevronRightIcon } from "../../icons/ChevronRight";
import { CopyIcon } from "../../icons/Copy";
import { WarningIcon } from "../../icons/Warning";
import {
  type AiChatMessageOverrides,
  type GlobalOverrides,
  useOverrides,
} from "../../overrides";
import * as CollapsiblePrimitive from "../../primitives/internal/Collapsible";
import {
  Markdown,
  type MarkdownComponentsCodeBlockProps,
  type MarkdownComponentsLinkProps,
} from "../../primitives/Markdown";
import { classNames } from "../../utils/class-names";

/* -------------------------------------------------------------------------------------------------
 * AiChatAssistantMessage
 * -----------------------------------------------------------------------------------------------*/
export interface AiChatAssistantMessageProps extends ComponentProps<"div"> {
  /**
   * The message to display.
   */
  message: UiAssistantMessage;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & AiChatMessageOverrides>;

  /**
   * Override the component's components.
   */
  components?: Partial<GlobalComponents>;
}

export const AiChatAssistantMessage = memo(
  forwardRef<HTMLDivElement, AiChatAssistantMessageProps>(
    ({ message, className, overrides, components, ...props }, forwardedRef) => {
      const $ = useOverrides(overrides);

      let children: ReactNode = null;

      if (message.deletedAt !== undefined) {
        children = (
          <div className="lb-ai-chat-message-deleted">
            {$.AI_CHAT_MESSAGE_DELETED}
          </div>
        );
      } else if (
        message.status === "generating" ||
        message.status === "awaiting-tool"
      ) {
        if (message.contentSoFar.length === 0) {
          children = (
            <div className="lb-ai-chat-message-thinking lb-ai-chat-pending">
              {$.AI_CHAT_MESSAGE_THINKING}
            </div>
          );
        } else {
          children = <AssistantMessageContent message={message} />;
        }
      } else if (message.status === "completed") {
        children = <AssistantMessageContent message={message} />;
      } else if (message.status === "failed") {
        // Do not include the error message if the user aborted the request.
        if (message.errorReason === "Aborted by user") {
          children = <AssistantMessageContent message={message} />;
        } else {
          children = (
            <>
              <AssistantMessageContent message={message} />

              <div className="lb-ai-chat-message-error">
                <span className="lb-icon-container">
                  <WarningIcon />
                </span>
                {message.errorReason}
              </div>
            </>
          );
        }
      }

      return (
        <div
          className={classNames(
            "lb-ai-chat-message lb-ai-chat-assistant-message",
            className
          )}
          {...props}
          ref={forwardedRef}
        >
          <ComponentsProvider components={components}>
            {children}
          </ComponentsProvider>
        </div>
      );
    }
  )
);

function AssistantMessageContent({ message }: { message: UiAssistantMessage }) {
  return (
    <div className="lb-ai-chat-message-content">
      <AiMessage.Content
        message={message}
        components={{
          TextPart,
          ReasoningPart,
          ToolInvocationPart,
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * TextPart
 * -----------------------------------------------------------------------------------------------*/
function TextPart({ part }: AiMessageContentTextPartProps) {
  return (
    <Markdown
      content={part.text}
      components={{ Link, CodeBlock }}
      className="lb-ai-chat-message-text"
    />
  );
}

// TODO: Improve (better copy handling, tooltips, etc)
function CodeBlock({ language, code }: MarkdownComponentsCodeBlockProps) {
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
        <span className="lb-code-block-title">{language ?? "Plain text"}</span>
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

function Link({ href, title, children }: MarkdownComponentsLinkProps) {
  const { Anchor } = useComponents();

  return (
    <Anchor href={href} title={title}>
      {children}
    </Anchor>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ReasoningPart
 * -----------------------------------------------------------------------------------------------*/
function ReasoningPart({
  part,
  isStreaming,
}: AiMessageContentReasoningPartProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsiblePrimitive.Root
      className="lb-collapsible lb-ai-chat-message-reasoning"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsiblePrimitive.Trigger
        className={classNames(
          "lb-collapsible-trigger",
          isStreaming && "lb-ai-chat-pending"
        )}
      >
        {/* TODO: If `isStreaming` is true, show "Reasoning…"/"Thinking…", otherwise show "Reasoned/thought for x seconds"? */}
        Reasoning
        <span className="lb-collapsible-chevron lb-icon-container">
          <ChevronRightIcon />
        </span>
      </CollapsiblePrimitive.Trigger>

      <CollapsiblePrimitive.Content className="lb-collapsible-content">
        <Markdown
          content={part.text}
          components={{ Link, CodeBlock }}
          className="lb-ai-chat-message-text"
        />
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ToolInvocationPart
 * -----------------------------------------------------------------------------------------------*/
function ToolInvocationPart({ children }: PropsWithChildren) {
  return <div className="lb-ai-chat-message-tool-invocation">{children}</div>;
}
