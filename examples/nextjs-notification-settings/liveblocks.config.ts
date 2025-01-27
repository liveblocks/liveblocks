import type { User } from "@/types/data";

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: Pick<User, "name" | "picture" | "color">;
    };
    ActivitiesData: {
      $fileUploaded: {
        file: string;
        size: number;
        success: boolean;
      };
    };
  }
}

export {};
