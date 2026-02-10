import { expectType } from "tsd";

import type { JsonObject } from "@liveblocks/core";
import type { IServerWebSocket, Ticket } from "@liveblocks/server";
import { InMemoryDriver, ProtocolVersion, Room } from "@liveblocks/server";

// Assume we have some external values to use
declare const socket: IServerWebSocket;

// Arbitrary types to use as Room and Session metadata in these type tests. Can
// be any user-defined type.
type RM = { my: "room-meta" };
type SM = { my: "session-meta" };
type CM = { my: "client-meta" };

// ----------------------------------------------------------------------------------------------

async () => {
  // Room constructor
  expectType<Room<string, unknown, JsonObject>>(
    // with an explicit/custom storage backend
    new Room("my-room", { storage: new InMemoryDriver() })
  );
  expectType<Room<string, unknown, JsonObject>>(new Room("my-room")); // ...or without one
  //               /            \            \
  // Infers room meta...         |            \
  //            ...can't infer session meta... |
  //                                 ...but knows client meta is at least JsonObject

  // By explicitly providing session metadata type arguments
  expectType<Room<RM, SM, CM>>(
    new Room<RM, SM, CM>({ my: "room-meta" })
    //       ^^^^^^^^^^ Tell, don't infer
  );

  const room = new Room<RM, SM, CM>({ my: "room-meta" });

  // Room.createTicket() API
  expectType<Ticket<SM, CM>>(
    await room.createTicket({ version: ProtocolVersion.V8 })
  );
  expectType<Ticket<SM, CM>>(await room.createTicket());
  expectType<Ticket<SM, CM>>(await room.createTicket());

  const ticket = await room.createTicket({ meta: { my: "session-meta" } });

  // Room.startBrowserSession() API
  expectType<void>(await room.startBrowserSession(ticket, socket));

  // Room.endBrowserSession() API
  expectType<void>(
    await room.endBrowserSession(ticket.sessionKey, 1011, "Close reason")
  );

  // Room.handleData() API
  expectType<void>(await room.handleData(ticket.sessionKey, "ping"));

  // Room.handleMsgs() API
  expectType<void>(await room.handleData(ticket.sessionKey, "ping"));
  expectType<void>(
    await room.handleData(ticket.sessionKey, "[{ /* ClientMsg here */ }]")
  );
};
