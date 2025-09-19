"use client";

import { AiChat } from "@liveblocks/react-ui";
import {
  LiveblocksProvider,
  useCreateAiChat,
  useDeleteAiChat,
  useSendAiMessage,
} from "@liveblocks/react";
import { useCallback } from "react";

function Chats() {
  const sendAiMessage = useSendAiMessage();
  const createAiChat = useCreateAiChat();
  const deleteAiChat = useDeleteAiChat();

  const handleSendMessage = useCallback(() => {
    const text = `
      Repeat the following essay:

      # Montreal: A City of Culture, History, and Innovation

      ## Introduction

      Nestled on the banks of the Saint Lawrence River, **Montreal** stands as a vibrant testament to Canada’s rich cultural tapestry. As the largest city in Quebec and the second-largest in Canada, Montreal is renowned for its unique blend of French and English influences, which shape everything from its architecture to its cuisine.

      ---

      ## A Glimpse into History

      - **Founded**: 1642 as Ville-Marie by French settlers
      - **Evolution**: From fur trading post to bustling metropolis
      - **Historic Sites**:  
        - Old Port: Cobblestone streets and centuries-old architecture  
        - Notre-Dame Basilica: Iconic Gothic Revival church

      ---

      ## Culture and the Arts

      Montreal’s cultural scene is one of its greatest assets:

      - **Festivals**:  
        - Montreal Jazz Festival  
        - Just for Laughs Comedy Festival
      - **Museums & Galleries**:  
        - Montreal Museum of Fine Arts  
        - Contemporary Art Museum

      > “The city’s bilingual nature fosters a creative energy that permeates its neighborhoods.”

      Neighborhoods like the bohemian *Plateau-Mont-Royal* and historic *Old Montreal* are hubs of artistic expression.

      ---

      ## Quality of Life

      Despite its cosmopolitan flair, Montreal retains a warm, community-oriented atmosphere:

      - **Green Spaces**:  
        - Mount Royal Park  
        - Lachine Canal
      - **Year-Round Activities**:  
        - Summer festivals  
        - Winter ice skating

      ---

      ## Conclusion

      Montreal seamlessly weaves together history, culture, and modernity. Its dynamic spirit, diverse population, and enduring charm make it not only a Canadian gem but a global destination.

      ---

      *Written on: 19 September 2025*
    `;

    createAiChat("without-interpolation");
    createAiChat("with-interpolation");
    sendAiMessage({ text, chatId: "with-interpolation" });
    sendAiMessage({ text, chatId: "without-interpolation" });
  }, [createAiChat, sendAiMessage]);

  const handleClearChats = useCallback(() => {
    deleteAiChat("without-interpolation");
    deleteAiChat("with-interpolation");
  }, [deleteAiChat]);

  return (
    <main className="flex flex-col h-screen overflow-auto w-full">
      <div className="flex flex-1 min-h-0 text-[10px]">
        <div className="h-full w-1/2">
          <AiChat
            chatId="without-interpolation"
            className="**:[.lb-ai-chat-footer]:hidden! **:[.lb-ai-chat-user-message]:hidden!"
            layout="compact"
          />
        </div>
        <div className="h-full w-1/2 border-l border-gray-200">
          <AiChat
            chatId="with-interpolation"
            className="**:[.lb-ai-chat-footer]:hidden! **:[.lb-ai-chat-user-message]:hidden!"
            layout="compact"
          />
        </div>
      </div>
      <div className="border-t border-gray-200 flex p-3 gap-3 flex-none">
        <button
          className="px-4 py-2 bg-black rounded text-white flex-1 cursor-pointer outline-none"
          onClick={handleSendMessage}
        >
          Send message
        </button>
        <button
          className="px-4 py-2 bg-black rounded text-white flex-1 cursor-pointer outline-none"
          onClick={handleClearChats}
        >
          Clear chats
        </button>
      </div>
    </main>
  );
}
export default function Home() {
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <Chats />
    </LiveblocksProvider>
  );
}
