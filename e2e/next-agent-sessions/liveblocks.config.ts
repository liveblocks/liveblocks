declare global {
  interface Liveblocks {
    // ... your existing types (UserMeta, Presence, Storage, etc.)

    // Custom metadata for agent sessions
    SessionMetadata: {
      agentName: string;
      model: string;
      temperature?: number;
      // Add any other metadata you want to store with sessions
    };

    // Custom data for agent messages
    MessageData: {
      role: "user" | "assistant" | "system";
      content: string;
      tokens?: number;
      // Add any other data you want to store with messages
    };
  }
}

export {};
