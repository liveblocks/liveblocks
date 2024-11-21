import { LiveList } from "@liveblocks/client";

type IdAndName = { id: string; name: string };

export type Feature = {
  id: string;
  name: string;
  startAt: number;
  endAt: number;
  status: IdAndName & { color: string };
  group: IdAndName;
  product: IdAndName;
  owner: IdAndName & { image: string };
  initiative: IdAndName;
  release: IdAndName;
};

export type FeatureWithDates = Omit<Feature, "startAt" | "endAt"> & {
  startAt: Date;
  endAt: Date;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      presence: any; // Used by tldraw
    };
    Storage: {
      features: LiveList<Feature>; // Used by tldraw
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
  }
}
