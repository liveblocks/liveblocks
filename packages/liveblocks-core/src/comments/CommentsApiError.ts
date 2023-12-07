import type { JsonObject } from "../lib/Json";

export class CommentsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}
