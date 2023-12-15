import type { AuthValue } from "../auth-manager";
import type { JsonObject } from "../lib/Json";
import type { Polyfills } from "../room";
import type { BaseMetadata } from "../types/BaseMetadata";
import type { CommentBody } from "../types/CommentBody";
import type { CommentData, CommentDataPlain } from "../types/CommentData";
import type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "../types/CommentReaction";
import type { ThreadData, ThreadDataPlain } from "../types/ThreadData";
import {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToThreadData,
} from "./convert-plain-data";

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

type RoomConfig = {
  baseUrl: string;
  polyfills?: Polyfills;
};

export type QueryParams =
  | Record<string, string | number | boolean | null | undefined>
  | URLSearchParams;

export type ThreadsOptions<TThreadMetadata extends BaseMetadata> = {
  query?: {
    metadata?: Partial<TThreadMetadata>;
  };
};

export type CommentsApi<TThreadMetadata extends BaseMetadata> = {
  getThreads(
    options?: ThreadsOptions<TThreadMetadata>
  ): Promise<ThreadData<TThreadMetadata>[]>;
  createThread(options: {
    threadId: string;
    commentId: string;
    metadata: TThreadMetadata | undefined;
    body: CommentBody;
  }): Promise<ThreadData<TThreadMetadata>>;
  editThreadMetadata(options: {
    metadata: PartialNullable<TThreadMetadata>;
    threadId: string;
  }): Promise<TThreadMetadata>;
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
  }): Promise<CommentUserReaction>;
  removeReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;
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
  config: RoomConfig
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
    );
    const fetcher = config.polyfills?.fetch || /* istanbul ignore next */ fetch;
    return await fetcher(url.toString(), {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
      },
    });
  }

  async function getThreads(
    options?: ThreadsOptions<TThreadMetadata>
  ): Promise<ThreadData<TThreadMetadata>[]> {
    const response = await fetchApi(roomId, "/threads/search", {
      body: JSON.stringify({
        ...(options?.query?.metadata && { metadata: options.query.metadata }),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok) {
      const json = await (response.json() as Promise<{
        data: ThreadDataPlain<TThreadMetadata>[];
      }>);
      return json.data.map((thread) => convertToThreadData(thread));
    } else if (response.status === 404) {
      return [];
    } else {
      throw new Error("There was an error while getting threads.");
    }
  }

  async function createThread({
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
    const thread = await fetchJson<ThreadDataPlain<TThreadMetadata>>(
      "/threads",
      {
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
      }
    );

    return convertToThreadData(thread);
  }

  async function editThreadMetadata({
    metadata,
    threadId,
  }: {
    roomId: string;
    metadata: PartialNullable<TThreadMetadata>;
    threadId: string;
  }) {
    return await fetchJson<TThreadMetadata>(
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

  async function createComment({
    threadId,
    commentId,
    body,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    const comment = await fetchJson<CommentDataPlain>(
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

    return convertToCommentData(comment);
  }

  async function editComment({
    threadId,
    commentId,
    body,
  }: {
    threadId: string;
    commentId: string;
    body: CommentBody;
  }) {
    const comment = await fetchJson<CommentDataPlain>(
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

    return convertToCommentData(comment);
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

  async function addReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    const reaction = await fetchJson<CommentUserReactionPlain>(
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

    return convertToCommentUserReaction(reaction);
  }

  async function removeReaction({
    threadId,
    commentId,
    emoji,
  }: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    await fetchJson<CommentData>(
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
