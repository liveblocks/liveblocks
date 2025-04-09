import { ChatId, CopilotContext } from "@liveblocks/core";
import { useClient, useCopilotChatMessages } from "@liveblocks/react";
import { ChatComposer, ChatMessages } from "@liveblocks/react-ui";
import { useEffect } from "react";

export function InlineChat({
  chatId,
  context,
}: {
  chatId: ChatId;
  context: Record<string, CopilotContext>;
}) {
  const client = useClient();

  const {
    isLoading,
    messages,
    error,
    fetchMore,
    isFetchingMore,
    fetchMoreError,
    hasFetchedAll,
  } = useCopilotChatMessages(chatId);

  if (isLoading) {
    // TODO: Add suitable loading state
    return <></>;
  }

  if (error) {
    // TODO: Add suitable error state
    return <></>;
  }

  return (
    <div>
      {/* TODO: Support auto fetch more when user scrolls to the top of the chat window */}
      <ChatMessages messages={messages} />

      <ChatComposer chatId={chatId} />

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
    </div>
  );
}

function CopilotContextComp({
  chatId,
  contextKey,
  data,
}: {
  chatId: ChatId;
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
  }, [contextKey, data, value, description]);

  return null;
}
