import type { Client } from "../client";
import type { BaseMetadata } from "./types/BaseMetadata";
import type { CommentBody } from "./types/CommentBody";
import type { CommentData } from "./types/CommentData";
import type { ThreadData } from "./types/ThreadData";

type Options = {
  serverEndpoint: string;
};

export type CommentsApi<ThreadMetadata extends BaseMetadata> = {
  getThreads(options: {
    roomId: string;
  }): Promise<ThreadData<ThreadMetadata>[]>;
  createThread(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    metadata: ThreadMetadata | undefined;
    body: CommentBody;
  }): Promise<ThreadData<ThreadMetadata>>;
  editThreadMetadata(options: {
    roomId: string;
    metadata: Partial<ThreadMetadata>;
    threadId: string;
  }): Promise<ThreadData<ThreadMetadata>>;
  createComment(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): Promise<CommentData>;
  editComment(options: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): Promise<CommentData>;
  deleteComment(options: {
    roomId: string;
    threadId: string;
    commentId: string;
  }): Promise<void>;
};

export function createCommentsApi<ThreadMetadata extends BaseMetadata>(
  client: Client,
  { serverEndpoint }: Options
): CommentsApi<ThreadMetadata> {
  async function fetchApi<T>(
    roomId: string,
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const authValue = await client.__internal.getAuthValue(
      "comments:read", // TODO: Use the right scope
      roomId
    );

    if (authValue.type !== "secret") {
      throw new Error("Only secret key are supported for client.");
    }

    const url = `${serverEndpoint}/rooms/${roomId}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${authValue.token.raw}`,
      },
    });

    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let errorMessage = "";
        try {
          const errorBody = (await response.json()) as { message: string };
          errorMessage = errorBody.message;
        } catch (error) {
          errorMessage = response.statusText;
        }
        throw new Error(
          `Request failed with status ${response.status}: ${errorMessage}`
        );
      }
    }

    let body;

    try {
      body = (await response.json()) as T;
    } catch {
      body = {} as T;
    }

    return body;
  }

  async function getThreads({ roomId }: { roomId: string }) {
    const { data } = await fetchApi<{ data: ThreadData<ThreadMetadata>[] }>(
      roomId,
      "/threads"
    );
    return data;
  }

  function createThread({
    roomId,
    metadata,
    body,
    commentId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    metadata: ThreadMetadata | undefined;
    body: CommentBody;
  }) {
    return fetchApi<ThreadData<ThreadMetadata>>(roomId, "/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: threadId,
        comment: {
          id: commentId,
          body,
        },
        metadata,
      }),
    });
  }

  function editThreadMetadata({
    roomId,
    metadata,
    threadId,
  }: {
    roomId: string;
    metadata: Partial<ThreadMetadata>;
    threadId: string;
  }) {
    return fetchApi<ThreadData<ThreadMetadata>>(
      roomId,
      `/threads/${threadId}/metadata`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );
  }

  function createComment({
    roomId,
    threadId,
    commentId,
    body,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    return fetchApi<CommentData>(roomId, `/threads/${threadId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: commentId,
        body,
      }),
    });
  }

  function editComment({
    roomId,
    threadId,
    commentId,
    body,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    return fetchApi<CommentData>(
      roomId,
      `/threads/${threadId}/comments/${commentId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
        }),
      }
    );
  }

  async function deleteComment({
    roomId,
    threadId,
    commentId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
  }) {
    await fetchApi(roomId, `/threads/${threadId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  return {
    getThreads,
    createThread,
    editThreadMetadata,
    createComment,
    editComment,
    deleteComment,
  };
}
