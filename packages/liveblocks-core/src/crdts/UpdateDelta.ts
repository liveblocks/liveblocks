export type UpdateDelta =
  | {
      type: "update";
    }
  | {
      type: "delete";
    };
