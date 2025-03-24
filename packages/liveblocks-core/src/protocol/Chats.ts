export type CopilotChat = {
  type: "chat";
  id: string;
  projectId: string;
  userId: string;
  prompt: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CopilotChatMessage = {
  type: "chat-message";
  id: string;
  chatId: string;
  createdAt: Date;
} & (
  | {
      role: "user";
      content: [{ type: "text"; text: string }];
    }
  | {
      role: "assistant";
      content: [{ type: "text"; text: string }];
    }
);

export type CopilotChatPlain = Omit<
  CopilotChat,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CopilotChatMessagePlain = Omit<CopilotChatMessage, "createdAt"> & {
  createdAt: string;
};
