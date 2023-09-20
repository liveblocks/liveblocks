import type { AuthValue } from "../auth-manager";
import type { BaseMetadata } from "./types/BaseMetadata";
import type { CommentBody } from "./types/CommentBody";
import type { CommentData } from "./types/CommentData";
import type { ThreadData } from "./types/ThreadData";

type Options = {
  serverEndpoint: string;
};

function getAuthBearerHeaderFromAuthValue(authValue: AuthValue) {
  if (authValue.type === "public") {
    return authValue.publicApiKey;
  } else {
    return authValue.token.raw;
  }
}

export type CommentsApi<ThreadMetadata extends BaseMetadata> = {
  getThreads(): Promise<ThreadData<ThreadMetadata>[]>;
  createThread(options: {
    threadId: string;
    commentId: string;
    metadata: ThreadMetadata | undefined;
    body: CommentBody;
  }): Promise<ThreadData<ThreadMetadata>>;
  editThreadMetadata(options: {
    metadata: Partial<ThreadMetadata>;
    threadId: string;
  }): Promise<ThreadData<ThreadMetadata>>;
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
  addCommentReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentData>;
  removeCommentReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<CommentData>;
};

export function createCommentsApi<ThreadMetadata extends BaseMetadata>(
  roomId: string,
  getAuthValue: () => Promise<AuthValue>,
  { serverEndpoint }: Options
): CommentsApi<ThreadMetadata> {
  async function fetchJson<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetchApi(roomId, endpoint, options);

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

  async function fetchApi(
    roomId: string,
    endpoint: string,
    options?: RequestInit
  ): Promise<Response> {
    // TODO: Use the right scope
    const authValue = await getAuthValue();

    const url = `${serverEndpoint}/c/rooms/${encodeURIComponent(
      roomId
    )}${endpoint}`;

    return await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getAuthBearerHeaderFromAuthValue(authValue)}`,
      },
    });
  }

  async function getThreads(): Promise<ThreadData<ThreadMetadata>[]> {
    const response = await fetchApi(roomId, "/threads");

    if (response.ok) {
      const json = await (response.json() as Promise<{
        data: ThreadData<ThreadMetadata>[];
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
    metadata: ThreadMetadata | undefined;
    body: CommentBody;
  }) {
    return fetchJson<ThreadData<ThreadMetadata>>("/threads", {
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
    metadata: Partial<ThreadMetadata>;
    threadId: string;
  }) {
    return fetchJson<ThreadData<ThreadMetadata>>(
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

  function addCommentReaction({
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

  function removeCommentReaction({
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
    addCommentReaction,
    removeCommentReaction,
  };
}
