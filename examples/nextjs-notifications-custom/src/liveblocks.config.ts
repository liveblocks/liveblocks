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

type IssueStatusUpdate = {
  type: "status";
  status: string;
};

type IssueRenameUpdate = {
  type: "rename";
  title: string;
};

type IssueAssignUpdate = {
  type: "assign";
  name: string;
};

export type IssueUpdatedData =
  | IssueAssignUpdate
  | IssueRenameUpdate
  | IssueStatusUpdate;

declare global {
  interface Liveblocks {
    UserMeta: UserMeta;
    RoomInfo: RoomInfo;
    ActivitiesData: {
      $alert: AlertData;
      $imageUpload: ImageUploadData;
      $invite: InviteData;
      $issueUpdated: IssueUpdatedData;
    };
  }
}
