/**
 * A few standard delegate configurations that can be used in unit tests, and
 * that can be used to easily configure the Room's "backend" behavior.
 *
 * Usage:
 *
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(1), SOCKET_CREATE_ONLY);
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(2), SOCKET_AUTO_OPEN);
 */

import { StopRetrying } from "../connection";
import type { RichToken } from "../protocol/AuthToken";
import type { RoomDelegates } from "../room";
import type { IWebSocketInstance } from "../types/IWebSocket";
import { MockWebSocketServer } from "./_MockWebSocketServer";
import { makeRoomToken } from "./_utils";

function makeRichToken(actor: number, scopes: string[]): RichToken {
  const raw = "<some fake JWT token>";
  const parsed = {
    ...makeRoomToken(actor, scopes),
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 60, // Valid for 1 minute
  };
  return { raw, parsed };
}

/**
 * Configures how the "backend" will behave in unit tests.
 *
 * Generates a delegate pair and an associated observable WebSocket server.
 * Feed the delegate pair into the Room instance you'll be testing, and use the
 * `wss` server to control the socket behavior. You can send it messages, that
 * the Room will then receive and act on. You can use the `wss` value to
 * observe the effects of the Room taking actions.
 */
export function defineBehavior(
  authBehavior: () => RichToken,
  socketBehavior: (wss: MockWebSocketServer) => IWebSocketInstance
): {
  wss: MockWebSocketServer;
  delegates: RoomDelegates;
} {
  const authenticate = () => {
    try {
      return Promise.resolve(authBehavior());
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const createSocket = () => socketBehavior(wss);

  const wss = new MockWebSocketServer();

  const delegates: RoomDelegates = {
    authenticate: jest.fn(authenticate),
    createSocket: jest.fn(createSocket),
    //            ^^^^^^^ Allow observing these calls in tests
  };

  return { wss, delegates };
}

//
// Standardized AUTHENTICATION behaviors for use in unit tests.
//

/**
 * Configures the authentication delegate to always successfully authorize as
 * user 1.
 */
export const DEFAULT_AUTH = ALWAYS_AUTH_AS(1);

export function ALWAYS_AUTH_AS(actor: number, scopes: string[] = []) {
  return () => makeRichToken(actor, scopes);
}

export function ALWAYS_FAIL_AUTH(): RichToken {
  throw new Error("Random error, like 503 Service Unavailable or whatever");
}

export function UNAUTHORIZED(): RichToken {
  // A type of error that gets treated specially
  throw new StopRetrying("Unauthorized");
}

//
// Standardized SOCKET behaviors for use in unit tests.
//

/**
 * Configures the MockWebSocketServer to *not* automatically accept new socket
 * connections. This means you'll have to manually accept those socket
 * connections explicitly in unit tests, i.e. by calling `wss.last.accept()` to
 * accept the last connection that was made to the server.
 */
export function MANUAL_SOCKETS(wss: MockWebSocketServer) {
  return wss.newSocket();
}

/**
 * Configures the MockWebSocketServer to automatically accept each new socket
 * connection asynchronously.
 */
export function AUTO_OPEN_SOCKETS(wss: MockWebSocketServer) {
  return wss.newSocket((socket) => socket.server.accept());
}

/**
 * Configures the MockWebSocketServer to automatically accept the first socket
 * connection attempt, then fail all subsequent attempts.
 */
export function SOCKET_CONNECT_ONLY_ONCE() {
  let n = 0;
  return (wss: MockWebSocketServer) => {
    n++;
    if (n > 1) {
      throw new Error("Nope");
    }
    return wss.newSocket((socket) => socket.server.accept());
  };
}
