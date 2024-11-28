declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        picture: string;
        color: string;
      };
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
