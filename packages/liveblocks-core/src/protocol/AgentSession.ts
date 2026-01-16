import type { Json } from "../lib/Json";

export type AgentSession<SM extends Json = Json> = {
  sessionId: string;
  metadata: SM;
  timestamp: number;
};

export type AgentMessage<MD extends Json = Json> = {
  id: string;
  timestamp: number;
  data: MD;
};
