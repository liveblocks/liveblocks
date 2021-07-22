import { AuthEndpoint, AuthenticationToken } from "./types";

async function fetchAuthorize(endpoint: string, room: string): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room,
    }),
  });

  if (!res.ok) {
    throw new AuthenticationError(
      `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
    );
  }

  let authResponse = null;
  try {
    authResponse = await res.json();
  } catch (er) {
    throw new AuthenticationError(
      `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
    );
  }

  if (typeof authResponse.token !== "string") {
    throw new AuthenticationError(
      `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
    );
  }

  return authResponse.token;
}

export default async function auth(
  endpoint: AuthEndpoint,
  room: string
): Promise<string> {
  if (typeof endpoint === "string") {
    return fetchAuthorize(endpoint, room);
  }

  if (typeof endpoint === "function") {
    const { token } = await endpoint(room);
    // TODO: Validation
    return token;
  }

  throw new Error(
    "Authentication error. Liveblocks could not parse the response of your authentication endpoint"
  );
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function parseToken(token: string): AuthenticationToken {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new AuthenticationError(
      `Authentication error. Liveblocks could not parse the response of your authentication endpoint`
    );
  }

  const data = JSON.parse(atob(tokenParts[1]));
  if (typeof data.actor !== "number") {
    throw new AuthenticationError(
      `Authentication error. Liveblocks could not parse the response of your authentication endpoint`
    );
  }

  return data;
}
