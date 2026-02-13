/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type {
  BaseUserMeta,
  Brand,
  IUserInfo,
  Json,
  JsonObject,
} from "@liveblocks/core";
import {
  assertNever,
  ClientMsgCode,
  nodeStreamToCompactNodes,
  OpCode,
  raise,
  ServerMsgCode,
  tryParseJson,
  WebsocketCloseCodes as CloseCode,
} from "@liveblocks/core";
import { Mutex } from "async-mutex";
import { array, formatInline } from "decoders";
import { chunked } from "itertools";
import { nanoid } from "nanoid";

import type { Guid } from "~/decoders";
import { clientMsgDecoder } from "~/decoders";
import type { IServerWebSocket, IStorageDriver } from "~/interfaces";
import { Logger } from "~/lib/Logger";
import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";
import type {
  ClientMsg as GenericClientMsg,
  IgnoredOp,
  Op,
  ServerMsg as GenericServerMsg,
  ServerWireOp,
} from "~/protocol";
import { ProtocolVersion } from "~/protocol";
import { Storage } from "~/Storage";
import { YjsStorage } from "~/YjsStorage";

import { tryCatch } from "./lib/tryCatch";
import { UniqueMap } from "./lib/UniqueMap";
import type { LeasedSession } from "./types";
import { isLeasedSessionExpired, makeRoomStateMsg } from "./utils";

const messagesDecoder = array(clientMsgDecoder);

const HIGHEST_PROTOCOL_VERSION = Math.max(
  ...Object.values(ProtocolVersion).filter(
    (v): v is number => typeof v === "number"
  )
) as ProtocolVersion;

// Reverse lookup for ServerMsgCodes
const SERVER_MSG_CODE_NAMES = Object.fromEntries(
  Object.entries(ServerMsgCode).map(([k, v]) => [v, k])
) as Record<(typeof ServerMsgCode)[keyof typeof ServerMsgCode], string>;

const BLACK_HOLE = new Logger([
  /* No targets, i.e. black hole logger */
]);

export type LoadingState = "initial" | "loading" | "loaded";
export type ActorID = Brand<number, "ActorID">;

/**
 * Session keys are also known as the "nonce" in the protocol. It's a random,
 * unique, but PRIVATE, identifier for the session, and it's important that
 * this ID is never shared to anyone except the connected client, which
 * receives it as part of its ROOM_STATE message.
 */
export type SessionKey = Brand<string, "SessionKey">;

export type PreSerializedServerMsg = Brand<string, "PreSerializedServerMsg">;
type ClientMsg = GenericClientMsg<JsonObject, Json>;
type ServerMsg = GenericServerMsg<JsonObject, BaseUserMeta, Json>;

/**
 * Creates a collector for deferred promises (side effects that should run
 * outside a mutex). Call `defer` to collect promises, then `waitAll` to
 * await them all.
 */
function collectSideEffects() {
  const deferred: Promise<void>[] = [];
  return {
    defer: (p: Promise<void>) => void deferred.push(p),
    waitAll: () => Promise.allSettled(deferred),
  };
}

function serialize(
  msgs: ServerMsg | readonly ServerMsg[]
): PreSerializedServerMsg {
  return JSON.stringify(msgs) as PreSerializedServerMsg;
}

export function ackIgnoredOp(opId: string): IgnoredOp {
  return { type: OpCode.DELETE_CRDT, id: "ACK", opId }; // (H)Ack Op
}

function stripOpId(op: Op): ServerWireOp {
  // TODO: Optimize later! Instead of duplicating every op and
  // stripping the opId explicitly, it would be generally more
  // efficient if we treated the opIds as "envelopes" around Ops (or
  // send them in a separate array altogether at the protocol level
  // in V8 soon--even better, as it would not even require any stripping!)
  const { opId: _, ...rest } = op; // Strip opIds from all outgoing messages!
  return rest;
}

/**
 * A known or anonymous user.
 *
 * BY DEFINITION:
 * A User with an assigned `id` property is a non-anonymous user.
 * A User with an assigned `anonymousId` property is an anonymous user.
 * A User with neither of those properties is also an anonymous user.
 *
 * WHAT'S THE DIFFERENCE?
 * When creating a non-anonymous user, other users in the room will be able to
 * observe the assigned `id` property in Presence (e.g. via the `other.user.id`
 * in the Liveblocks client).
 *
 * When creating an anonymous user, you can _optionally_ provide an anonymous
 * ID to (re)use. While not authorized, this still allows you to correlate
 * unique users.
 */
export type IUserData = AuthorizedUser | AnonymousUser; // YYY Remove this export before launch. It's a private API, but only needed temporarily, while refactoring our CF server

type AuthorizedUser = {
  readonly id: string;
  readonly anonymousId?: never;
  readonly info?: IUserInfo;
};

// Anonymous users, by definition, have no ID, or have an explicitly-assigned
// anonymous ID (in case you need to control anonymous ID generation, e.g. by
// tracking a cookie). The anonymous ID will not show up in other clients. To
// those clients, it will appear as a user without an ID.
type AnonymousUser = {
  readonly anonymousId: string;
  readonly id?: never;
  readonly info?: IUserInfo;
};

/*

Session Types: 
|                                   | Browser Session | Backend Session | Leased Session |
|-----------------------------------|-----------------|-----------------|-----------------|
| Sends enter/leave/presence events |        ✓        |                 |        ✓        |
| Visible to other users in room    |        ✓        |                 |        ✓        |
| Has WebSocket connection          |        ✓        |                 |                 |
| Updated from                      |     Browser     |    REST API     |  REST API       |

*/

/**
 * Each BrowserSession is an abstraction around a socket instance, and maintains
 * metadata about the connection.
 */
export class BrowserSession<SM, CM extends JsonObject> {
  //                        ^^ User-defined Session Metadata
  //                            ^^ User-defined Client Metadata (sent to client in ROOM_STATE)

  public readonly version: ProtocolVersion; // Liveblocks protocol version this client will speak
  public readonly actor: ActorID; // Must be unique within the room
  public readonly createdAt: Date;

  // Externally provided (public!) user metadata. This information will get shared with other clients
  public readonly user: IUserData;
  public readonly scopes: string[]; // Permissions for this session, sent to connected clients (so consider public info)
  public readonly meta: SM; // Arbitrary *private* meta data to attach to this session (will NOT be shared)
  public readonly publicMeta?: CM; // Metadata sent to client in ROOM_STATE message's "meta" field

  readonly #_socket: IServerWebSocket;
  readonly #_debug: boolean;
  #_lastActiveAt: Date;

  // We keep a status in-memory in the session of whether we already sent a rejected ops message to the client.
  #_hasNotifiedClientStorageUpdateError: boolean;

  /** @internal - Never create a BrowserSession instance manually. Use the room.startBrowserSession() API instead. */
  constructor(
    ticket: Ticket<SM, CM>,
    socket: IServerWebSocket,
    debug: boolean
  ) {
    this.version = ticket.version;
    this.actor = ticket.actor;
    this.user = ticket.user;
    this.scopes = ticket.scopes;
    this.meta = ticket.meta ?? (undefined as unknown as SM);
    this.publicMeta = ticket.publicMeta;
    this.#_socket = socket;
    this.#_debug = debug;

    const now = new Date();
    this.createdAt = now;
    this.#_lastActiveAt = now;
    this.#_hasNotifiedClientStorageUpdateError = false;
  }

  get lastActiveAt(): Date {
    const lastPing = this.#_socket.getLastPongTimestamp?.();
    if (lastPing && lastPing > this.#_lastActiveAt) {
      return lastPing;
    } else {
      return this.#_lastActiveAt;
    }
  }

  get hasNotifiedClientStorageUpdateError(): boolean {
    return this.#_hasNotifiedClientStorageUpdateError;
  }

  markActive(now = new Date()): void {
    if (now > this.#_lastActiveAt) {
      this.#_lastActiveAt = now;
    }
  }

  setHasNotifiedClientStorageUpdateError(): void {
    this.#_hasNotifiedClientStorageUpdateError = true;
  }

  sendPong(): number {
    this.markActive();

    const sent = this.#_socket.send("pong");
    if (this.#_debug) {
      if (sent < 0) {
        console.error(
          `failed to send "pong" to actor=${this.actor} (back pressure)`
        );
      } else if (sent === 0) {
        console.error(
          `failed to send "pong" to actor=${this.actor} (connection issue)`
        );
      } else {
        // Success
        console.log(`sent to actor=${this.actor}: "pong"`);
      }
    }
    return sent;
  }

  send(serverMsg: ServerMsg | ServerMsg[] | PreSerializedServerMsg): number {
    const data =
      typeof serverMsg === "string" ? serverMsg : serialize(serverMsg);
    const sent = this.#_socket.send(data);
    if (this.#_debug) {
      if (sent < 0) {
        console.error(
          `failed to send message to actor=${this.actor} (back pressure)`
        );
      } else if (sent === 0) {
        console.error(
          `failed to send message to actor=${this.actor} (connection issue)`
        );
      }

      const msgs = JSON.parse(data) as ServerMsg | ServerMsg[];
      for (const msg of Array.isArray(msgs) ? msgs : [msgs]) {
        console.log(
          `sent to actor=${this.actor}: [${
            SERVER_MSG_CODE_NAMES[msg.type] ?? msg.type
          }] ${JSON.stringify(msg)}`
        );
      }
    }
    return sent;
  }

  /**
   * @internal
   * Closes the socket associated to this BrowserSession.
   *
   * NOTE: Never call this API directly! Call .endBrowserSession() instead.
   */
  closeSocket(code: number, reason?: string): void {
    this.#_socket.close(code, reason);
  }
}

export class BackendSession extends BrowserSession<never, never> {
  /** @internal Never call this constructor directly */
  constructor(
    ticket: Ticket<never, never>,
    socket: IServerWebSocket,
    debug: boolean
  ) {
    super(ticket, socket, debug);
  }
}

export type Ticket<SM, CM extends JsonObject> = {
  readonly sessionKey: SessionKey; // Should stay private
  readonly version: ProtocolVersion;
  readonly actor: ActorID;
  readonly meta?: SM; // Private Session metadata
  readonly publicMeta?: CM; // Client metadata is *public* metadata sent to client in ROOM_STATE message
  readonly user: IUserData; // User-provided, public, metadata
  readonly scopes: string[];
};

export type CreateTicketOptions<SM, CM extends JsonObject> = {
  /** The Liveblocks protocol version this client will speak */
  version?: ProtocolVersion;
  meta?: SM;
  publicMeta?: CM;
  /** A user-provided ID to externally recognize the user by */
  id?: string;
  /**
   * A user-provided anonymous ID to use. When `id` is provided, this field is
   * ignored. When both fields are missing, a new anonymous ID will be
   * generated.
   */
  anonymousId?: string;
  /** Static user metadata to assign this session, will get broadcasted to other clients */
  info?: IUserInfo;
  /** Permissions to assign this session */
  scopes?: string[];

  /** An explicit actor ID to use. Supported for legacy use cases only. It's best to not set this and let it get assigned dynamically, as it's important for this identifier to be unique. */
  actor?: ActorID;
};

type InternalData = {
  readonly storage: Storage;
  readonly yjsStorage: YjsStorage;
  readonly mutex: Mutex;
};

type RoomOptions<SM, CM extends JsonObject, C> = {
  /**
   * Bring your own persistence backend
   */
  storage?: IStorageDriver;
  logger?: Logger;

  /**
   * Whether to allow streaming storage responses. Only safe with drivers
   * that can guarantee that no Ops from other clients can get interleaved
   * between the chunk generation until the last chunk has been sent.
   * Defaults to true, but is notably NOT safe to use from DOS-KV backends.
   */
  allowStreaming?: boolean;

  // YYY Restructure these hooks to all take a single `event` param
  hooks?: {
    /** Customize which incoming messages from a client are allowed or disallowed. */
    isClientMsgAllowed?: (
      msg: ClientMsg,
      session: BrowserSession<SM, CM>
    ) => { allowed: true } | { allowed: false; reason: string };

    /** Called whenever the server acknowledged a ping with a pong */
    onDidPong?: (ctx?: C) => void | Promise<void>;

    /** Called before the room is attempted to be loaded */
    onRoomWillLoad?: (ctx?: C) => void | Promise<void>;
    /** Called right after the room's contents are loaded, but before any session has been started */
    onRoomDidLoad?: (ctx?: C) => void | Promise<void>;

    /** Called right before the room is attempted to be unloaded. Synchronous. May throw to abort the unloading. */
    onRoomWillUnload?: (ctx?: C) => void;
    /** Called right after the room has been unloaded from memory. Synchronous. */
    onRoomDidUnload?: (ctx?: C) => void;

    /** Called when a new user entered the room. */
    onSessionDidStart?: (
      session: BrowserSession<SM, CM>,
      ctx?: C
    ) => void | Promise<void>;
    /** Called when a user left the room. */
    onSessionDidEnd?: (
      session: BrowserSession<SM, CM>,
      ctx?: C
    ) => void | Promise<void>;

    /**
     * Called when Liveblocks Storage for the room was updated.
     *
     * IMPORTANT! If you implement these as async functions, it's important to
     * note that these run outside of the storage mutex that guarantees
     * a consistent view of storage.
     * Therefore, only ever use this hook to implement a side effect (like
     * trigger a notification), don't read storage in this hook directly.
     */
    postClientMsgStorageDidUpdate?: (ctx?: C) => void | Promise<void>;
    /**
     * Called when Yjs Storage for the room was updated.
     *
     * IMPORTANT! If you implement these as async functions, it's important to
     * note that these run outside of the storage mutex that guarantees
     * a consistent view of storage.
     * Therefore, only ever use this hook to implement a side effect (like
     * trigger a notification), don't read storage in this hook directly.
     */
    postClientMsgYdocDidUpdate?: (
      ctx?: C,
      sess?: BrowserSession<SM, CM>
    ) => void | Promise<void>;
  };

  /** Enable debug logging */
  enableDebugLogging?: boolean;
};

/**
 * A Liveblocks Room server.
 */
export class Room<RM, SM, CM extends JsonObject, C = undefined> {
  //              ^^^^^^^^^^ User-defined Room Metadata, Session Metadata, and Client Metadata

  public meta: RM;
  public readonly driver: IStorageDriver;
  public logger: Logger;

  private _loadData$: Promise<void> | null = null;
  private _data: InternalData | null = null;
  private _qsize = 0;

  private readonly sessions = new UniqueMap<
    SessionKey,
    BrowserSession<SM, CM>,
    ActorID
  >((s) => s.actor);

  private readonly hooks: {
    isClientMsgAllowed: (
      msg: ClientMsg,
      session: BrowserSession<SM, CM>
    ) => { allowed: true } | { allowed: false; reason: string };

    onDidPong?: (ctx?: C) => void | Promise<void>;

    onRoomWillLoad?: (ctx?: C) => void | Promise<void>;
    onRoomDidLoad?: (ctx?: C) => void | Promise<void>;

    onRoomWillUnload?: (ctx?: C) => void;
    onRoomDidUnload?: (ctx?: C) => void;

    onSessionDidStart?: (
      session: BrowserSession<SM, CM>,
      ctx: C | undefined
    ) => void | Promise<void>;
    onSessionDidEnd?: (
      session: BrowserSession<SM, CM>,
      ctx: C | undefined
    ) => void | Promise<void>;

    // Don't like these callback names yet. Think about how to better abstract it later.
    postClientMsgStorageDidUpdate?: (ctx?: C) => void | Promise<void>;
    postClientMsgYdocDidUpdate?: (
      ctx?: C,
      sess?: BrowserSession<SM, CM>
    ) => void | Promise<void>;
  };

  readonly #_debug: boolean;
  readonly #_allowStreaming: boolean;

  constructor(meta: RM, options?: RoomOptions<SM, CM, C>) {
    const driver = options?.storage ?? makeNewInMemoryDriver();
    this.meta = meta;
    this.driver = driver;
    this.logger = options?.logger ?? BLACK_HOLE;
    this.#_allowStreaming = options?.allowStreaming ?? true;
    this.hooks = {
      isClientMsgAllowed:
        options?.hooks?.isClientMsgAllowed ??
        (() => {
          return {
            allowed: true,
          };
        }),

      // YYY .load() isn't called on the RoomServer yet! As soon as it does, these hooks will get called
      onRoomWillLoad: options?.hooks?.onRoomWillLoad,
      onRoomDidLoad: options?.hooks?.onRoomDidLoad,

      onRoomWillUnload: options?.hooks?.onRoomWillUnload,
      onRoomDidUnload: options?.hooks?.onRoomDidUnload,

      onSessionDidStart: options?.hooks?.onSessionDidStart,
      onSessionDidEnd: options?.hooks?.onSessionDidEnd,

      postClientMsgStorageDidUpdate:
        options?.hooks?.postClientMsgStorageDidUpdate,
      postClientMsgYdocDidUpdate: options?.hooks?.postClientMsgYdocDidUpdate,
    };
    this.#_debug = options?.enableDebugLogging ?? false;
  }

  public get loadingState(): LoadingState {
    if (this._loadData$ === null) {
      return "initial";
    } else if (this._data === null) {
      return "loading";
    } else {
      return "loaded";
    }
  }

  public  get numSessions(): number     { return this.sessions.size; } // prettier-ignore

  public  get storage(): Storage        { return this.data.storage; } // prettier-ignore
  public  get yjsStorage(): YjsStorage  { return this.data.yjsStorage; } // prettier-ignore

  public get mutex(): Mutex            { return this.data.mutex; } // prettier-ignore

  private get data(): InternalData      { return this._data ?? raise("Cannot use room before it's loaded"); } // prettier-ignore

  // ------------------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------------------

  /**
   * Initializes the Room, so it's ready to start accepting connections. Safe
   * to call multiple times. After awaiting `room.load()` the Room is ready to
   * be used.
   */
  public async load(ctx?: C): Promise<void> {
    if (this._loadData$ === null) {
      this._data = null;
      this._loadData$ = this._load(ctx).catch((e) => {
        this._data = null;
        this._loadData$ = null;
        throw e;
      });
    }
    return this._loadData$;
  }

  /**
   * Releases the currently-loaded storage tree from worker memory, freeing it
   * up to be garbage collected. The next time a user will join the room, the
   * room will be reloaded from storage.
   */
  public unload(ctx?: C): void {
    this.hooks.onRoomWillUnload?.(ctx); // May throw to cancel unloading
    if (this._data) {
      this.storage.unload();
      this.yjsStorage.unload();
    }
    // YYY Abort any potentially in-flight _loadData$ calls here
    this._loadData$ = null;
    // this._data = null;  // YYY Should we also clear _data? I think so!
    this.hooks.onRoomDidUnload?.(ctx);
  }

  /**
   * Issues a Ticket with a new/unique actor ID
   *
   * IMPORTANT! As the caller of this function, you are responsible for
   * ensuring you trust the values passed in here. Never pass unauthorized
   * values in here.
   *
   * The returned Ticket can be turned into a active Session once the socket
   * connection is established. If the socket is never established, this
   * unused Ticket will simply get garbage collected.
   */
  public async createTicket(
    options?: CreateTicketOptions<SM, CM>
  ): Promise<Ticket<SM, CM>> {
    const actor$ = options?.actor ?? this.getNextActor();
    const sessionKey = nanoid() as SessionKey;
    const info = options?.info;
    const ticket: Ticket<SM, CM> = {
      version: options?.version ?? HIGHEST_PROTOCOL_VERSION,
      actor: await actor$,
      sessionKey,
      meta: options?.meta,
      publicMeta: options?.publicMeta,
      user: options?.id
        ? { id: options.id, info }
        : { anonymousId: options?.anonymousId ?? nanoid(), info },
      scopes: options?.scopes ?? ["room:write"],
    };
    if (this.#_debug) {
      console.log(`new ticket created: ${JSON.stringify(ticket)}`);
    }
    return ticket;
  }

  public async createBackendSession_experimental(): Promise<
    [session: BackendSession, outgoingMessages: PreSerializedServerMsg[]]
  > {
    const ticket = (await this.createTicket()) as Ticket<never, never>;
    const capturedServerMsgs: PreSerializedServerMsg[] = [];
    const stub = {
      send: (data) => {
        if (typeof data === "string") {
          capturedServerMsgs.push(data as PreSerializedServerMsg);
        }
        return 0;
      },
      close: () => {}, // noop
    } satisfies IServerWebSocket;
    const session = new BackendSession(ticket, stub, false);
    return [session, capturedServerMsgs];
  }

  /**
   * Restores the given sessions as the Room server's session list. Can only be
   * called as long as there are no existing sessions.
   *
   * The key difference with the .startBrowserSession() API is that restoreSessions is
   * used in cases where a session was hibernated and needs to be restored,
   * without _conceptually_ starting a new session.
   *
   * Because there are no side effects to restoreSession, it's synchronous.
   */
  public restoreSessions(
    sessions: {
      ticket: Ticket<SM, CM>;
      socket: IServerWebSocket;
      lastActivity: Date;
    }[]
  ): void {
    if (this.sessions.size > 0) {
      throw new Error("This API can only be called before any sessions exist");
    }

    for (const { ticket, socket, lastActivity } of sessions) {
      const newSession = new BrowserSession(ticket, socket, this.#_debug);
      this.sessions.set(ticket.sessionKey, newSession);
      newSession.markActive(lastActivity);
    }
  }

  private async sendSessionStartMessages(
    newSession: BrowserSession<SM, CM>,
    ticket: Ticket<SM, CM>,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to sendSessionStartMessages() to collect async side effects."
      );
    }
  ): Promise<void> {
    const users: Record<ActorID, BaseUserMeta & { scopes: string[] }> = {};
    // Add regular sessions
    for (const session of this.otherSessions(ticket.sessionKey)) {
      users[session.actor] = {
        id: session.user.id,
        info: session.user.info,
        scopes: session.scopes,
      };
    }

    // List all active server sessions
    const leasedSessions: LeasedSession[] = await this.listLeasedSessions(
      ctx,
      defer
    );
    // Add server sessions
    for (const leasedSession of leasedSessions) {
      users[leasedSession.actorId as ActorID] = {
        id: leasedSession.sessionId,
        info: leasedSession.info,
        scopes: [],
      };
    }

    // this must happen before presence messages are sent
    newSession.send(
      makeRoomStateMsg(
        newSession.actor,
        ticket.sessionKey, // called "nonce" in the protocol
        newSession.scopes,
        users,
        ticket.publicMeta
      )
    );

    // Send each server session's full presence to the new user
    // NOTE: this doesn't exist for other browser sessions because those other sessions send from their frontend clients in response to room state messages.
    for (const leasedSession of leasedSessions) {
      newSession.send({
        type: ServerMsgCode.UPDATE_PRESENCE,
        actor: leasedSession.actorId as ActorID,
        targetActor: newSession.actor, // full presence to new user
        data: leasedSession.presence as JsonObject,
      });
    }
  }

  /**
   * Registers a new BrowserSession into the Room server's session list, along with
   * the socket connection to use for that BrowserSession, now that it is known.
   *
   * This kicks off a few side effects:
   * - Sends a ROOM_STATE message to the socket.
   * - Broadcasts a USER_JOINED message to all other sessions in the room.
   */
  public async startBrowserSession(
    ticket: Ticket<SM, CM>,
    socket: IServerWebSocket,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to startBrowserSession() to collect async side effects."
      );
    }
  ): Promise<void> {
    let existing: SessionKey | undefined;
    while (
      (existing = this.sessions.lookupPrimaryKey(ticket.actor)) !== undefined
    ) {
      // If this happens, it means a new connection attempt is happening for an
      // existing actor ID. It's most likely from a reconnection attempt using
      // a legacy token (which has the actor ID hardcoded in it), where the old
      // session hasn't been closed explicitly. We'll actively kill it now.

      // Terminate old session
      this.endBrowserSession(
        existing,
        CloseCode.KICKED,
        "Closed stale connection",
        ctx,
        defer
      );

      this.logger.warn(
        `Previous session for actor ${ticket.actor} killed in favor of new session`
      );
    }

    const newSession = new BrowserSession(ticket, socket, this.#_debug);
    this.sessions.set(ticket.sessionKey, newSession);

    // send sessions start messages
    await this.sendSessionStartMessages(newSession, ticket, ctx, defer);

    this.sendToOthers(
      ticket.sessionKey,
      {
        type: ServerMsgCode.USER_JOINED,
        actor: newSession.actor,
        id: newSession.user.id,
        info: newSession.user.info,
        scopes: newSession.scopes,
      },
      ctx,
      defer
    );

    // Call the hook, but don't await the results here
    const p$ = this.hooks.onSessionDidStart?.(newSession, ctx);
    if (p$) defer(p$);
  }

  /**
   * Unregisters the BrowserSession for the given actor. Call this when the socket has
   * been closed from the client's end.
   *
   * This kicks off a few side effects:
   * - Broadcasts a USER_LEFT message to all other sessions in the room.
   */
  public endBrowserSession(
    key: SessionKey,
    code: number,
    reason: string,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "Your onSessionDidEnd handler returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to endBrowserSession() to collect async side effects."
      );
    }
  ): void {
    const sessions = this.sessions;

    const session = sessions.get(key);
    if (session === undefined) return;

    session.closeSocket(code, reason);

    const deleted = sessions.delete(key);
    if (deleted) {
      for (const other of this.otherSessions(key)) {
        other.send({ type: ServerMsgCode.USER_LEFT, actor: session.actor });
      }

      // Call the hook
      const p$ = this.hooks.onSessionDidEnd?.(session, ctx);
      if (p$) defer(p$);
    }
  }

  /**
   * Force-closes all sessions matching the given predicate.
   */
  public endSessionBy(
    predicate: (session: BrowserSession<SM, CM>) => boolean,
    code: number,
    reason: string,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "Your onSessionDidEnd handler returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to endSessionBy() to collect async side effects."
      );
    }
  ): number {
    let count = 0;
    for (const [key, session] of this.sessions) {
      if (predicate(session)) {
        count++;
        this.endBrowserSession(key, code, reason, ctx, defer);
      }
    }
    return count;
  }

  /**
   * Handles a raw incoming socket message, which can be a ping, or an
   * JSON-encoded message batch.
   */
  public async handleData(
    key: SessionKey,
    data: unknown,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to handleData() to collect async side effects."
      );
    }
  ): Promise<void> {
    const text =
      typeof data === "string" ? data : raise("Unsupported message format");

    if (text === "ping") {
      await this.handlePing(key, ctx);
    } else {
      const json = tryParseJson(text);
      const messages = messagesDecoder.decode(json);

      if (!messages.ok) {
        const reason =
          process.env.NODE_ENV !== "production"
            ? formatInline(messages.error)
            : "Invalid message format";

        this.endBrowserSession(
          key,
          CloseCode.INVALID_MESSAGE_FORMAT,
          reason,
          ctx,
          defer
        );
        return;
      }

      // TODO: Decide on these limits later.
      // If qsize is > 0, then it means there is a traffic jam. This shouldn't
      // be a problem for a while, but it grows beyond a certain (soft or hard)
      // limit, we may want to take measures.
      if (this._qsize > 10_000) {
        // Over hard limit
        // TODO: Maybe disconnect this sockets with a 42xx close code? This
        // will make the client back off more aggressively. See
        // https://github.com/liveblocks/liveblocks/blob/223f7ce0d77380fecd3b08ed9454ca8c330bbe16/packages/liveblocks-core/src/types/IWebSocket.ts#L53
      } else if (this._qsize > 5_000) {
        // Over soft limit
        // TODO: Maybe instruct clients to increase their throttle values?
      }

      this._qsize++;

      // Run this.handleMsgs(), but guarded by a mutex lock, ensuring that no
      // two messages will get processed simultaneously. This provides similar
      // concurrency protection as Cloudflare's I/O gates
      try {
        await this.processClientMsg(key, messages.value, ctx);
      } finally {
        this._qsize--;
      }
    }
  }

  /**
   * Processes an incoming batch of 1 or more ClientMsgs on behalf of
   * a (regular user/browser) session.
   *
   * IMPORTANT: Only use this API on "trusted" data!
   * To handle untrusted input data, use `.handleData()` instead.
   *
   * Before calling this API, make sure:
   * 1. The call site is entitled to call this message on behalf of this session; and
   * 2. The ClientMsg payload has been validated to be correct.
   */
  public async processClientMsg(
    key: SessionKey,
    messages: ClientMsg[],
    ctx?: C
  ): Promise<void> {
    await this.load(ctx);
    const { defer, waitAll } = collectSideEffects();
    await this.mutex.runExclusive(() =>
      this._processClientMsg_withExclusiveAccess(key, messages, ctx, defer)
    );

    // Run all deferred work (like queueing messages, sending notifications,
    // etc) outside of the mutex
    await waitAll();
  }

  /**
   * Processes an incoming batch of 1 or more ClientMsgs on behalf of
   * a BACKEND session.
   *
   * Difference 1: HTTP RESPONSE instead of WEB SOCKET RESPONSE
   * ----------------------------------------------------------
   * For "normal" sessions that have a socket attached, any "responses" (i.e.
   * server messages like acks or fixops) will be sent back through that
   * existing socket connection.
   *
   * The key difference when using this method is that there is no such socket,
   * so any "response" ServerMsgs will get sent back as an HTTP response.
   *
   * Difference 2: No auth check
   * ---------------------------
   * Another key difference is that when processing a backend session, no
   * "isClientMsgAllowed()" check is performed, because those checks assume
   * a session.
   */
  public async processClientMsgFromBackendSession(
    session: BackendSession,
    messages: ClientMsg[],
    ctx?: C
  ): Promise<void> {
    await this.load(ctx);
    const { defer, waitAll } = collectSideEffects();
    await this.mutex.runExclusive(() =>
      this._processClientMsgFromBackendSession_withExclusiveAccess(
        session,
        messages,
        ctx,
        defer
      )
    );

    // Run all deferred work (like queueing messages, sending notifications,
    // etc) outside of the mutex
    await waitAll();
  }

  public getSession(
    sessionKey: SessionKey
  ): BrowserSession<SM, CM> | undefined {
    return this.sessions.get(sessionKey);
  }

  public listSessions(): BrowserSession<SM, CM>[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Upsert a leased session. Creates a new session if it doesn't exist (or is expired),
   * or updates an existing session with merged presence.
   */
  public async upsertLeasedSession(
    sessionId: string,
    presence: JsonObject,
    ttl: number,
    info: IUserInfo,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to upsertLeasedSession() to collect async side effects."
      );
    }
  ): Promise<void> {
    const existingSession = await this.driver.get_leased_session(sessionId);
    const isExpired =
      existingSession !== undefined && isLeasedSessionExpired(existingSession);

    if (isExpired) {
      await this.deleteLeasedSession(existingSession, ctx, defer);
    }

    if (existingSession === undefined || isExpired) {
      // Creating new session (or was expired)
      const actorId = await this.getNextActor();
      const now = Date.now();
      const session: LeasedSession = {
        sessionId,
        presence,
        updatedAt: now,
        info,
        ttl,
        actorId,
      };

      await this.driver.put_leased_session(session);

      // Broadcast USER_JOINED to all existing sessions
      this.sendToAll(
        {
          type: ServerMsgCode.USER_JOINED,
          actor: actorId,
          id: sessionId,
          info,
          scopes: [],
        },
        ctx,
        defer
      );
      // now send the presence to all sessions
      this.sendToAll(
        {
          type: ServerMsgCode.UPDATE_PRESENCE,
          actor: actorId,
          data: presence,
          targetActor: 1,
        },
        ctx,
        defer
      );
    } else {
      // Updating existing session (and not expired)
      // Merge/patch the presence
      const mergedPresence = {
        ...(existingSession.presence as JsonObject),
        ...presence,
      };
      const updatedSession: LeasedSession = {
        ...existingSession,
        //info, UserInfo is immutable after creation
        presence: mergedPresence,
        updatedAt: Date.now(),
        ttl,
      };

      await this.driver.put_leased_session(updatedSession);

      // Broadcast UPDATE_PRESENCE WITHOUT targetActor to all sessions (patch)
      this.sendToAll(
        {
          type: ServerMsgCode.UPDATE_PRESENCE,
          actor: existingSession.actorId,
          data: presence, // Send only the patch, not the full merged presence
          // NO targetActor - this makes it a partial presence patch
        },
        ctx,
        defer
      );
    }
  }

  /**
   * List all server sessions. As a side effect, it will delete expired sessions.
   */
  public async listLeasedSessions(
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to listLeasedSessions() to collect async side effects."
      );
    }
  ): Promise<LeasedSession[]> {
    await this.load(ctx);
    const sessions = await this.driver.list_leased_sessions();
    const validSessions: LeasedSession[] = [];
    const toDelete: LeasedSession[] = [];
    for (const [_, session] of sessions) {
      if (isLeasedSessionExpired(session)) {
        toDelete.push(session);
      } else {
        validSessions.push(session);
      }
    }

    for (const session of toDelete) {
      await this.deleteLeasedSession(session, ctx, defer);
    }

    return validSessions;
  }

  /**
   * Delete a server session and broadcast USER_LEFT to all sessions.
   */
  public async deleteLeasedSession(
    session: LeasedSession,
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to deleteLeasedSession() to collect async side effects."
      );
    }
  ): Promise<void> {
    // Broadcast USER_LEFT to all sessions
    this.sendToAll(
      {
        type: ServerMsgCode.USER_LEFT,
        actor: session.actorId,
      },
      ctx,
      defer
    );
    await this.driver.delete_leased_session(session.sessionId);
  }

  /**
   * Delete all server sessions and broadcast USER_LEFT to all sessions.
   */
  public async deleteAllLeasedSessions(
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to deleteAllLeasedSessions() to collect async side effects."
      );
    }
  ): Promise<void> {
    await this.load(ctx);
    const sessions = await this.driver.list_leased_sessions();
    for (const [_, session] of sessions) {
      await this.deleteLeasedSession(session, ctx, defer);
    }
  }

  /**
   * Will send the given ServerMsg through all Session, except the Session
   * where the message originates from.
   */
  public sendToOthers(
    sender: SessionKey,
    serverMsg: ServerMsg | readonly ServerMsg[],
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to sendToOthers() to collect async side effects."
      );
    }
  ): void {
    const msg = serialize(serverMsg);
    for (const [key, session] of this.otherSessionEntries(sender)) {
      const success = session.send(msg);
      if (success === 0) {
        // If there is a connection issue, terminate the session at once.
        // Note that in the case of -1 (= back pressure), we don't terminate
        // the connection.
        this.endBrowserSession(
          key,
          CloseCode.KICKED,
          "Closed broken connection",
          ctx,
          defer
        );
      }
    }
  }

  /**
   * Will broadcast the given ServerMsg to all Sessions in the Room.
   */
  public sendToAll(
    serverMsg: ServerMsg | readonly ServerMsg[],
    ctx?: C,
    defer: (promise: Promise<void>) => void = () => {
      throw new Error(
        "One of your hook handlers returned a promise, but no side effect collector was provided. " +
          "Pass a `defer` callback to sendToAll() to collect async side effects."
      );
    }
  ): void {
    const msg = serialize(serverMsg);
    for (const [key, session] of this.sessions) {
      const success = session.send(msg);
      if (success === 0) {
        // If there is a connection issue, terminate the session at once.
        // Note that in the case of -1 (= back pressure), we don't terminate
        // the connection.
        this.endBrowserSession(
          key,
          CloseCode.KICKED,
          "Closed broken connection",
          ctx,
          defer
        );
      }
    }
  }

  // ------------------------------------------------------------------------------------
  // Private APIs
  // ------------------------------------------------------------------------------------

  private async _loadStorage(): Promise<Storage> {
    const storage = new Storage(this.driver);
    await storage.load(this.logger);
    return storage;
  }

  private async _loadYjsStorage(): Promise<YjsStorage> {
    const yjsStorage = new YjsStorage(this.driver);
    await yjsStorage.load(this.logger);
    return yjsStorage;
  }

  // Don't ever manually call this!
  private async _load(ctx?: C): Promise<void> {
    await this.hooks.onRoomWillLoad?.(ctx);

    // YYY Maybe later run these in parallel? See https://github.com/liveblocks/liveblocks-cloudflare/pull/721#discussion_r1489076389
    const storage = await this._loadStorage();
    const yjsStorage = await this._loadYjsStorage();

    this._data = {
      mutex: new Mutex(),
      storage,
      yjsStorage,
    };

    await this.hooks.onRoomDidLoad?.(ctx);
  }

  /**
   * Returns a new, unique, actor ID.
   */
  private async getNextActor(): Promise<ActorID> {
    return (await this.driver.next_actor()) as ActorID;
  }

  /**
   * Iterates over all *other* Sessions and their session keys.
   */
  private *otherSessionEntries(
    currentKey: SessionKey
  ): Generator<[SessionKey, BrowserSession<SM, CM>]> {
    for (const [key, session] of this.sessions) {
      if (key !== currentKey) {
        yield [key, session];
      }
    }
  }

  /**
   * Iterates over all *other* Sessions.
   */
  private *otherSessions(
    currentKey: SessionKey
  ): Generator<BrowserSession<SM, CM>> {
    for (const [key, session] of this.sessions) {
      if (key !== currentKey) {
        yield session;
      }
    }
  }

  /**
   * @internal
   * Handles an incoming ping, by sending a pong back.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async handlePing(sessionKey: SessionKey, ctx?: C): Promise<void> {
    const session = this.sessions.get(sessionKey);
    if (session === undefined) {
      this.logger
        .withContext({ sessionKey })
        .warn("[probe] in handlePing, no such session exists");
      return;
    }

    const sent = session.sendPong();

    // 0 means there was a connection issue
    // -1 means there was back pressure, which is no issue (we'll just count the ping)
    if (sent !== 0) {
      await this.hooks.onDidPong?.(ctx);
    }
  }

  private async _processClientMsg_withExclusiveAccess(
    sessionKey: SessionKey,
    messages: ClientMsg[],
    ctx: C | undefined,
    defer: (p: Promise<void>) => void
  ): Promise<void> {
    const session = this.sessions.get(sessionKey);
    if (!session) {
      this.logger
        .withContext({ sessionKey })
        .warn("[probe] in handleClientMsgs, no such session exists");
      return;
    }

    // Keep two ServerMsg buffers to send at the end:
    // - Messages to fan-out to all *others* (current session not included)
    // - Messages to reply back to the current sender (i.e. acks and rejections)
    const toFanOut: ServerMsg[] = [];
    const toReply: ServerMsg[] = [];
    const replyImmediately = (msg: ServerMsg | ServerMsg[]) =>
      void session.send(msg);
    const scheduleFanOut = (msg: ServerMsg) => void toFanOut.push(msg);
    const scheduleReply = (msg: ServerMsg) => void toReply.push(msg);

    for (const msg of messages) {
      const isMsgAllowed = this.hooks.isClientMsgAllowed(msg, session);
      if (isMsgAllowed.allowed) {
        await this.handleOne(
          session,
          msg,
          replyImmediately,
          scheduleFanOut,
          scheduleReply,
          ctx,
          defer
        );
      } else {
        if (!session.hasNotifiedClientStorageUpdateError) {
          toReply.push({
            type: ServerMsgCode.REJECT_STORAGE_OP,
            opIds:
              msg.type === ClientMsgCode.UPDATE_STORAGE
                ? msg.ops.map((op) => op.opId)
                : [],
            reason: isMsgAllowed.reason,
          });
          session.setHasNotifiedClientStorageUpdateError();
        }
      }
    }

    if (toFanOut.length > 0) {
      this.sendToOthers(sessionKey, toFanOut, ctx, defer);
    }

    if (toReply.length > 0) {
      session.send(toReply);
    }
  }

  // TODO It's a bit bothering how much duplication there is between this method
  // and the _processClientMsg_withExclusiveAccess version. A better
  // abstraction is needed.
  private async _processClientMsgFromBackendSession_withExclusiveAccess(
    session: BackendSession,
    messages: ClientMsg[],
    ctx: C | undefined,
    defer: (p: Promise<void>) => void
  ): Promise<void> {
    // Keep two ServerMsg buffers to send at the end:
    // - Messages to fan-out to all *others* (current session not included)
    // - Messages to reply back to the current sender (i.e. acks and rejections)
    const toFanOut: ServerMsg[] = [];
    const toReplyImmediately: ServerMsg[] = [];
    const toReplyAfter: ServerMsg[] = [];

    const replyImmediately = (msg: ServerMsg | ServerMsg[]) => {
      if (Array.isArray(msg)) {
        for (const m of msg) {
          toReplyImmediately.push(m);
        }
      } else {
        toReplyImmediately.push(msg);
      }
    };
    const scheduleFanOut = (msg: ServerMsg) => void toFanOut.push(msg);
    const scheduleReply = (msg: ServerMsg) => void toReplyAfter.push(msg);

    for (const msg of messages) {
      await this.handleOne(
        session,
        msg,
        replyImmediately,
        scheduleFanOut,
        scheduleReply,
        ctx,
        defer
      );
    }

    if (toReplyImmediately.length > 0) {
      session.send(toReplyImmediately);
      toReplyImmediately.length = 0;
    }

    if (toFanOut.length > 0) {
      this.sendToOthers("(transient)" as SessionKey, toFanOut, ctx, defer);
      toFanOut.length = 0;
    }

    if (toReplyAfter.length > 0) {
      session.send(toReplyAfter);
      toReplyAfter.length = 0;
    }
  }

  private async handleOne(
    session: BrowserSession<SM, CM>,
    msg: ClientMsg,
    replyImmediately: (msg: ServerMsg | ServerMsg[]) => void,
    scheduleFanOut: (msg: ServerMsg) => void,
    scheduleReply: (msg: ServerMsg) => void,
    ctx: C | undefined,
    defer: (p: Promise<void>) => void
  ): Promise<void> {
    if (!this.mutex.isLocked()) {
      throw new Error("Handling messages requires exclusive access");
    }

    switch (msg.type) {
      case ClientMsgCode.UPDATE_PRESENCE: {
        // YYY Maybe consider calling session.sendToOthers() directly here instead of queueing for fan-out?
        scheduleFanOut({
          type: ServerMsgCode.UPDATE_PRESENCE,
          actor: session.actor,
          data: msg.data,
          targetActor: msg.targetActor,
        });
        break;
      }

      case ClientMsgCode.BROADCAST_EVENT: {
        // YYY Maybe consider calling session.sendToOthers() directly here instead of queueing for fan-out?
        scheduleFanOut({
          type: ServerMsgCode.BROADCASTED_EVENT,
          actor: session.actor,
          event: msg.event,
        });
        break;
      }

      case ClientMsgCode.FETCH_STORAGE: {
        if (session.version >= ProtocolVersion.V8) {
          if (this.#_allowStreaming) {
            const NODES_PER_CHUNK = 250; // = arbitrary! Could be tuned later

            for (const chunk of chunked(
              nodeStreamToCompactNodes(this.storage.loadedDriver.iter_nodes()),
              NODES_PER_CHUNK
            )) {
              // NOTE: We don't take a storage snapshot here, because this
              // iteration is happening synchronously, so consistency of the
              // current document automatically guaranteed. If we ever make
              // this streaming asynchronous, however, we need to take
              // a storage snapshot to guarantee document consistency.
              replyImmediately({
                type: ServerMsgCode.STORAGE_CHUNK,
                nodes: chunk,
              });
            }
          } else {
            replyImmediately({
              type: ServerMsgCode.STORAGE_CHUNK,
              nodes: Array.from(
                nodeStreamToCompactNodes(this.storage.loadedDriver.iter_nodes())
              ),
            });
          }

          replyImmediately({ type: ServerMsgCode.STORAGE_STREAM_END });
        } else {
          replyImmediately({
            type: ServerMsgCode.STORAGE_STATE_V7,
            items: Array.from(this.storage.loadedDriver.iter_nodes()),
          });
        }
        break;
      }

      case ClientMsgCode.UPDATE_STORAGE: {
        // Bump storage version to indicate data will get mutated
        // A driver can use this information to implement copy-on-write
        // semantics to provide snapshot isolation.
        this.driver.bump_storage_version?.();

        const result = await this.storage.applyOps(msg.ops);

        const opsToForward: ServerWireOp[] = result.flatMap((r) =>
          r.action === "accepted" ? [r.op] : []
        );

        const opsToSendBack: ServerWireOp[] = result.flatMap((r) => {
          switch (r.action) {
            case "ignored":
              // HACK! We send a cleverly composed message, that will act
              // as an acknowledgement to all old clients out there in
              // the wild.
              return r.ignoredOpId !== undefined
                ? [ackIgnoredOp(r.ignoredOpId)]
                : [];

            case "accepted":
              return r.fix !== undefined ? [r.fix] : [];

            // istanbul ignore next
            default:
              return assertNever(r, "Unhandled case");
          }
        });

        if (opsToForward.length > 0) {
          scheduleFanOut({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: opsToForward.map(stripOpId),
          });
          scheduleReply({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: opsToForward,
          });
        }

        if (opsToSendBack.length > 0) {
          replyImmediately({
            type: ServerMsgCode.UPDATE_STORAGE,
            ops: opsToSendBack,
          });
        }

        if (opsToForward.length > 0) {
          // NOTE! These are being called after *every* handleOne() call
          // currently. Should we not just call these once at the end of
          // handleClientMsgs()?
          const p$ = this.hooks.postClientMsgStorageDidUpdate?.(ctx);
          if (p$) defer(p$);
        }
        break;
      }

      case ClientMsgCode.FETCH_YDOC: {
        const vector = msg.vector;
        const guid = msg.guid as Guid | undefined;
        const isV2 = msg.v2;
        const [update, stateVector, snapshotHash] = await Promise.all([
          this.yjsStorage.getYDocUpdate(this.logger, vector, guid, isV2),
          this.yjsStorage.getYStateVector(guid),
          this.yjsStorage.getSnapshotHash({ guid, isV2 }),
        ]);

        if (update !== null && snapshotHash !== null) {
          replyImmediately({
            type: ServerMsgCode.UPDATE_YDOC,
            update,
            isSync: true, // this is no longer used by the client, instead we use the presence of stateVector
            stateVector,
            guid,
            v2: isV2,
            remoteSnapshotHash: snapshotHash,
          });
        }
        break;
      }

      case ClientMsgCode.UPDATE_YDOC: {
        const update = msg.update;
        const guid = msg.guid as Guid | undefined;
        const isV2 = msg.v2;
        const [result, error] = await tryCatch(
          this.yjsStorage.addYDocUpdate(this.logger, update, guid, isV2)
        );

        if (error)
          // Ignore any errors
          break;

        this.sendToAll(
          {
            type: ServerMsgCode.UPDATE_YDOC,
            update,
            guid,
            isSync: false,
            stateVector: null,
            v2: isV2,
            remoteSnapshotHash: result.snapshotHash,
          },
          ctx,
          defer
        );
        if (result.isUpdated) {
          const p$ = this.hooks.postClientMsgYdocDidUpdate?.(ctx, session);
          if (p$) defer(p$);
        }

        break;
      }

      default: {
        try {
          return assertNever(msg, "Unrecognized client msg");
        } catch {
          // Ignore
        }
      }
    }
  }
}

export { serialize as serializeServerMsg };
