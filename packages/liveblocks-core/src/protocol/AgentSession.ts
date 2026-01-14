import type { Json } from "../lib/Json";

export type AgentSession = {
  sessionId: string;
  metadata: Json;
  timestamp: number;
};

export type AgentMessage = {
  id: string;
  timestamp: number;
  data: Json;
};
