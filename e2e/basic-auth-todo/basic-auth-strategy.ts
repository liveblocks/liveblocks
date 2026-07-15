import type { AuthRequest, AuthStrategy } from "@liveblocks/client";

type AuthResponse = {
  token: string;
  userId: string;
  userInfo: {
    name: string;
    color: string;
  };
};

function isAuthResponse(value: unknown): value is AuthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "token" in value &&
    typeof value.token === "string" &&
    "userId" in value &&
    typeof value.userId === "string" &&
    "userInfo" in value &&
    typeof value.userInfo === "object" &&
    value.userInfo !== null &&
    "name" in value.userInfo &&
    typeof value.userInfo.name === "string" &&
    "color" in value.userInfo &&
    typeof value.userInfo.color === "string"
  );
}

function requestIsForRoom(request: AuthRequest, roomId: string): boolean {
  return request.resource !== "personal" && request.roomId === roomId;
}

export function basicAuthStrategy(
  username: string,
  password: string,
  roomId: string
): AuthStrategy {
  return {
    async authenticate(request) {
      if (!requestIsForRoom(request, roomId)) {
        return {
          ok: false,
          fatal: true,
          reason: `Basic Auth is not configured for ${request.resource}`,
        };
      }

      const authorization = `Basic ${btoa(`${username}:${password}`)}`;
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { Authorization: authorization },
      });

      if (!response.ok) {
        return {
          ok: false,
          fatal: response.status >= 400 && response.status < 500,
          reason: (await response.text()) || "Authentication failed",
        };
      }

      const data: unknown = await response.json();
      if (!isAuthResponse(data)) {
        return {
          ok: false,
          fatal: true,
          reason: "The auth endpoint returned an invalid response",
        };
      }

      return {
        ok: true,
        credential: {
          // Custom credentials are opaque to the Liveblocks client. This one
          // is a short-lived session ID issued after Basic authentication.
          token: data.token,
          expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
          identity: {
            userId: data.userId,
            userInfo: data.userInfo,
          },
          scope: { rooms: [roomId] },
        },
      };
    },

    satisfies(credential, request) {
      return (
        requestIsForRoom(request, roomId) &&
        credential.scope?.rooms?.includes(roomId) === true
      );
    },
  };
}
