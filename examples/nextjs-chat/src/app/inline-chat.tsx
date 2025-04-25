import { ClientToolDefinition, CopilotContext } from "@liveblocks/core";
import { useChatMessages, useClient } from "@liveblocks/react";
import { ChatComposer } from "@liveblocks/react-ui";
import { useEffect } from "react";

export function InlineChat({
  chatId,
  context,
  tools,
}: {
  chatId: string;
  context: Record<string, CopilotContext>;
  tools: Record<string, ClientToolDefinition>;
}) {
  const client = useClient();

  const {
    isLoading,
    messages,
    error,
    // fetchMore,
    // isFetchingMore,
    // fetchMoreError,
    // hasFetchedAll,
  } = useChatMessages();

  if (isLoading) {
    // TODO: Add suitable loading state
    return <></>;
  }

  if (error) {
    // TODO: Add suitable error state
    return <></>;
  }

  return (
    <>
      {/* TODO: Support auto fetch more when user scrolls to the top of the chat window */}

      <div style={{ padding: "0 1rem 1rem" }}>
        <ChatComposer
          chatId={chatId}
          onComposerSubmit={async (message, event) => {
            const result = await client.ai.addUserMessage(
              chatId,
              null,
              message.text
            );
            await client.ai.ask(chatId, result.message.id, { stream: true });

            event.preventDefault(); // Avoid double-creation
          }}
          style={{
            position: "relative",
            borderRadius: "0.75rem",
            overflow: "hidden",
            width: "100%",
            boxShadow:
              "0 0 0 1px rgb(0 0 0 / 4%),\n    0 2px 6px rgb(0 0 0 / 4%),\n    0 8px 26px rgb(0 0 0 / 6%)",
            maxWidth: "896px",
            margin: "0 auto",
          }}
        />
      </div>

      {Object.entries(context).map(([key, value]) => {
        return (
          <CopilotContextComp
            key={key}
            chatId={chatId}
            contextKey={key}
            data={value}
          />
        );
      })}

      {Object.entries(tools).map(([keys, value]) => {
        return (
          <CopilotToolComp
            key={keys}
            chatId={chatId}
            toolKey={keys}
            tool={value}
          />
        );
      })}
    </>
  );
}

function CopilotContextComp({
  chatId,
  contextKey,
  data,
}: {
  chatId: string;
  contextKey: string;
  data: CopilotContext;
}) {
  const client = useClient();
  const value = data.value;
  const description = data.description;

  useEffect(() => {
    client.ai.registerChatContext(chatId, contextKey, { value, description });
    return () => {
      client.ai.unregisterChatContext(chatId, contextKey);
    };
  }, [contextKey, value, description]);

  return null;
}

function CopilotToolComp({
  chatId,
  toolKey,
  tool,
}: {
  chatId: string;
  toolKey: string;
  tool: ClientToolDefinition;
}) {
  const client = useClient();

  useEffect(() => {
    client.ai.registerChatTool(chatId, toolKey, tool);
    return () => {
      client.ai.unregisterChatContext(chatId, toolKey);
    };
  }, [toolKey, tool]);

  return null;
}
