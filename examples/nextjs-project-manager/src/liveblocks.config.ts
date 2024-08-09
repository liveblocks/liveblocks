import { LiveList, LiveObject } from "@liveblocks/core";
import { Label, Metadata, PriorityState, ProgressState } from "@/config";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    Storage: {
      meta: LiveObject<{
        title: string;
      }>;
      properties: LiveObject<{
        progress: ProgressState;
        priority: PriorityState;
        assignedTo: string | "none";
      }>;
      labels: LiveList<Label>;
    };
    RoomInfo: {
      id: string;
      metadata: Metadata;
    };
  }
}
