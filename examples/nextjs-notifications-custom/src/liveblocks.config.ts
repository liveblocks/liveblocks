export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export type RoomInfo = {
  title: string;
  description: string;
};

export type AlertData = {
  title: string;
  message: string;
};

export type ImageUploadData = {
  src: string;
  alt: string;
  uploadedBy: string;
};

export type InviteData = {
  inviteFrom: string;
  roomId: `${string}:${string}:${string}`;
};

declare global {
  interface Liveblocks {
    UserMeta: UserMeta;
    RoomInfo: RoomInfo;
    ActivitiesData: {
      $alert: AlertData;
      $imageUpload: ImageUploadData;
      $invite: InviteData;
    };
  }
}
