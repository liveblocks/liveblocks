import type { AiAssistantContentPart } from "@liveblocks/core";
import { useClient } from "@liveblocks/react";
import { useSignal } from "@liveblocks/react/_private";
import { Lexer } from "marked";
import {
  type ComponentType,
  createContext,
  forwardRef,
  type HTMLAttributes,
  memo,
  useContext,
  useMemo,
} from "react";

import { classNames } from "../../../utils/class-names";
import type { BlockToken } from "./Markdown";
import { BlockTokenComp as BlockTokenCompPrimitive } from "./Markdown";

/* -------------------------------------------------------------------------------------------------
 * AssistantChatMessage
 * -----------------------------------------------------------------------------------------------*/
const MessageContentContext = createContext<{ chatId: string } | null>(null);

export type AssistantMessageContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "content"
> & {
  content: AiAssistantContentPart[];
  chatId: string;
  components?: Partial<{
    TextPart: ComponentType<AssistantMessageTextPartProps>;
    ReasoningPart: ComponentType<AssistantMessageReasoningPartProps>;
  }>;
};
export const AssistantMessageContent = forwardRef<
  HTMLDivElement,
  AssistantMessageContentProps
>(({ components, content, chatId, ...props }, forwardedRef) => {
  return (
    <div ref={forwardedRef} {...props}>
      <MessageContentContext.Provider value={{ chatId }}>
        {content.map((part, index) => {
          switch (part.type) {
            case "text": {
              const TextPart =
                components?.TextPart ?? DefaultAssistantMessageTextPart;
              return <TextPart key={index} text={part.text} />;
            }
            case "tool-call": {
              return (
                <ToolCallPart
                  key={index}
                  name={part.toolName}
                  args={part.args}
                />
              );
            }
            case "reasoning": {
              const ReasoningPart =
                components?.ReasoningPart ??
                DefaultAssistantMessageReasoningPart;
              return <ReasoningPart key={index} text={part.text} />;
            }
            default: {
              return null;
            }
          }
        })}
      </MessageContentContext.Provider>
    </div>
  );
});

export type AssistantMessageTextPartProps = HTMLAttributes<HTMLDivElement> & {
  text: string;
};

export const DefaultAssistantMessageTextPart = forwardRef<
  HTMLDivElement,
  AssistantMessageTextPartProps
>(({ text, ...props }, forwardedRef) => {
  const tokens = useMemo(() => {
    return new Lexer().lex(text);
  }, [text]);

  return (
    <div ref={forwardedRef} {...props}>
      {tokens.map((token, index) => {
        return (
          <MemoizedBlockTokenComp token={token as BlockToken} key={index} />
        );
      })}
    </div>
  );
});

const MemoizedBlockTokenComp = memo(
  function BlockTokenComp({ token }: { token: BlockToken }) {
    return <BlockTokenCompPrimitive token={token} />;
  },
  (prevProps, nextProps) => {
    const prevToken = prevProps.token;
    const nextToken = nextProps.token;
    if (prevToken.raw.length !== nextToken.raw.length) {
      return false;
    }
    if (prevToken.type !== nextToken.type) {
      return false;
    }
    return prevToken.raw === nextToken.raw;
  }
);

function ToolCallPart({ name, args }: { name: string; args: any }) {
  const client = useClient();
  const context = useContext(MessageContentContext);
  if (context === null) {
    throw new Error(
      "ToolCallPart must be a descendant of AssistantChatMessage"
    );
  }
  const chatId = context.chatId;

  const tool = useSignal(client.ai.signals.getToolDefinitionΣ(chatId, name));
  if (tool === undefined || tool.render === undefined) return null;

  return <tool.render args={args as unknown} />;
}

export type AssistantMessageReasoningPartProps =
  HTMLAttributes<HTMLDivElement> & {
    text: string;
  };

export const DefaultAssistantMessageReasoningPart = forwardRef<
  HTMLDivElement,
  AssistantMessageTextPartProps
>(({ text, className }, forwardedRef) => {
  return (
    <div ref={forwardedRef} className={classNames("", className)}>
      {text}
    </div>
  );
});
