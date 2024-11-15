/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { onTestFinished } from "vitest";

import { Client, Server } from "~/index.js";
import type { LayeredCache } from "~/LayeredCache.js";
import type { Json } from "~/lib/Json.js";
import { makePipe } from "~/lib/Pipe.js";
import type { ClientMsg, Mutations, ServerMsg, Socket } from "~/types.js";

export function fmt(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  base: Client<any> | Server<any> | LayeredCache
  /* eslint-enable @typescript-eslint/no-explicit-any */
): Record<string, Json> {
  return "asObject" in base ? base.asObject() : Object.fromEntries(base);
}

export function size(cache: LayeredCache): number {
  return Array.from(cache.keys()).length;
}

/**
 * Given a set of mutators, will create a Client and Server instance, connect
 * them, and return those.
 *
 * When the test is over, it will disconnect them and clean everything up.
 *
 * This is a SYMMETRIC test, because the client and the server use the same
 * mutators implementation.
 */
export function clientServerSetup<M extends Mutations>(mutations: M) {
  const client = new Client(mutations);
  const server = new Server(mutations);

  // Build two two-way sockets, interconnect them, and hand the client and
  // the server one end each.
  const c2sPipe = makePipe<ClientMsg>();
  const s2cPipe = makePipe<ServerMsg>();

  const clientSocket: Socket<ClientMsg, ServerMsg> = {
    send: (data) => c2sPipe.send(data),
    recv: s2cPipe.output,
  };
  const serverSocket: Socket<ServerMsg, ClientMsg> = {
    send: (data) => s2cPipe.send(data),
    recv: c2sPipe.output,
  };

  const disconnect1 = server.connect(serverSocket);
  onTestFinished(() => disconnect1());

  const disconnect2 = client.connect(clientSocket);
  onTestFinished(() => disconnect2());

  // Ensures all messages between client and server get exchanged, and waits
  // until that has happened
  async function sync() {
    await c2sPipe.flush();
    await s2cPipe.flush();
  }

  onTestFinished(() => sync());

  return { client, server, sync };
}

/**
 * Given a set of mutators, will create two Clients and Server instance,
 * connect them all, and return those.
 *
 * When the test is over, it will disconnect them all and clean everything up.
 *
 * This is a SYMMETRIC test, because the clients and the server all use the
 * same mutators implementation.
 */
// export function twoClientSetup<M extends Mutations>(mutations: M) {
//   const client1 = new Client(mutations);
//   const client2 = new Client(mutations);
//   const server = new Server(mutations);
//
//   // Build two two-way sockets, interconnect them, and hand the client and
//   // the server one end each.
//   const c2sPipe = makePipe<ClientMsg>();
//   const s2cPipe = makePipe<ServerMsg>();
//
//   const clientSocket: Socket<ClientMsg, ServerMsg> = {
//     send: (data) => c2sPipe.send(data),
//     recv: s2cPipe.output,
//   };
//   const serverSocket: Socket<ServerMsg, ClientMsg> = {
//     send: (data) => s2cPipe.send(data),
//     recv: c2sPipe.output,
//   };
//
//   const disconnect1 = server.connect(serverSocket);
//   onTestFinished(() => disconnect1());
//
//   const disconnect2 = client.connect(clientSocket);
//   onTestFinished(() => disconnect2());
//
//   // Ensures all messages between client and server get exchanged, and waits
//   // until that has happened
//   async function sync() {
//     await c2sPipe.flush();
//     await s2cPipe.flush();
//   }
//
//   onTestFinished(() => sync());
//
//   return {
//     client,
//     server,
//     sync,
//   };
// }
