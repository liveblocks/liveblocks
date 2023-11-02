import type { AuthValue } from "../auth-manager";
import type { JsonObject } from "../lib/Json";
import type { BaseMetadata } from "./types/BaseMetadata";
import type { CommentBody } from "./types/CommentBody";
import type { CommentData } from "./types/CommentData";
import type { ThreadData } from "./types/ThreadData";

type Options = {
  baseUrl: string;
};

function getAuthBearerHeaderFromAuthValue(authValue: AuthValue) {
  if (authValue.type === "public") {
    return authValue.publicApiKey;
  } else {
    return authValue.token.raw;
  }
}

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

export type CommentsApi<TThreadMetadata extends BaseMetadata> = {
  getThreads(): Promise<ThreadData<TThreadMetadata>[]>;
  createThread(options: {
    threadId: string;
    commentId: string;
    metadata: TThreadMetadata | undefined;
    body: CommentBody;
  }): Promise<ThreadData<TThreadMetadata>>;
  editThreadMetadata(options: {
    metadata: PartialNullable<TThreadMetadata>;
    threadId: string;
  }): Promise<ThreadData<TThreadMetadata>>;
  createComment(options: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): Promise<CommentData>;
  editComment(options: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }): Promise<CommentData>;
  deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;
  addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentData>;
  removeReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentData>;
};

export class CommentsApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public details?: JsonObject
  ) {
    super(message);
  }
}

export function createCommentsApi<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  getAuthValue: () => Promise<AuthValue>,
  config: Options
): CommentsApi<TThreadMetadata> {
  async function fetchJson<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetchApi(roomId, endpoint, options);

    if (!response.ok) {
      if (response.status >= 400 && response.status < 600) {
        let error: CommentsApiError;

        try {
          const errorBody = (await response.json()) as { message: string };

          error = new CommentsApiError(
            errorBody.message,
            response.status,
            errorBody
          );
        } catch {
          error = new CommentsApiError(response.statusText, response.status);
        }

        throw error;
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

  async function fetchApi(
    roomId: string,
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> {
    // TODO: Use the right scope
    const authValue = await getAuthValue();
    const url = new URL(
      `/v2/c/rooms/${encodeURIComponent(roomId)}${endpoint}`,
      config.baseUrl
    ).toString();
    return await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
      },
    });
  }

  async function getThreads(): Promise<ThreadData<TThreadMetadata>[]> {
    const response = await fetchApi(roomId, "/threads");

    if (response.ok) {
      const json = await (response.json() as Promise<{
        data: ThreadData<TThreadMetadata>[];
      }>);
      return json.data;
    } else if (response.status === 404) {
      return [];
    } else {
      throw new Error("There was an error while getting threads.");
    }
  }

  function createThread({
    metadata,
    body,
    commentId,
    threadId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
    metadata: TThreadMetadata | undefined;
    body: CommentBody;
  }) {
    return fetchJson<ThreadData<TThreadMetadata>>("/threads", {
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
    metadata,
    threadId,
  }: {
    roomId: string;
    metadata: PartialNullable<TThreadMetadata>;
    threadId: string;
  }) {
    return fetchJson<ThreadData<TThreadMetadata>>(
      `/threads/${encodeURIComponent(threadId)}/metadata`,
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
    threadId,
    commentId,
    body,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    return fetchJson<CommentData>(
      `/threads/${encodeURIComponent(threadId)}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: commentId,
          body,
        }),
      }
    );
  }

  function editComment({
    threadId,
    commentId,
    body,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    return fetchJson<CommentData>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}`,
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
    threadId,
    commentId,
  }: {
    roomId: string;
    threadId: string;
    commentId: string;
  }) {
    await fetchJson(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}`,
      {
        method: "DELETE",
      }
    );
  }

  function addReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    return fetchJson<CommentData>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}/reactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emoji }),
      }
    );
  }

  function removeReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    return fetchJson<CommentData>(
      `/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(
        commentId
      )}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: "DELETE",
      }
    );
  }

  return {
    getThreads,
    createThread,
    editThreadMetadata,
    createComment,
    editComment,
    deleteComment,
    addReaction,
    removeReaction,
  };
}
