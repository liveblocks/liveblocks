/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { onTestFinished } from "vitest";

import { Client, Server } from "~/index.js";
import { makePipe } from "~/lib/Pipe.js";
import type { ClientMsg, Mutations, ServerMsg, Socket } from "~/types.js";

async function connectClientAndServer(
  /* eslint-disable @typescript-eslint/no-explicit-any */
  client: Client<any>,
  server: Server
) {
  // Build two two-way sockets, interconnect them, and hand the client and
  // the server one end each.
  const c2sPipe = makePipe<ClientMsg>();
  const s2cPipe = makePipe<ServerMsg>();

  // Disable auto-sync! No messages will get delivered until explicitly
  // requested so by calling sync()
  c2sPipe.setManual();
  s2cPipe.setManual();

  const clientSocket: Socket<ClientMsg, ServerMsg> = {
    send: (data) => c2sPipe.send(data),
    recv: s2cPipe.output,
  };
  const serverSocket: Socket<ServerMsg, ClientMsg> = {
    send: (data) => s2cPipe.send(data),
    recv: c2sPipe.output,
  };

  const disconnect1 = server.connect(serverSocket);
  const disconnect2 = client.connect(clientSocket);

  function disconnect() {
    disconnect1();
    disconnect2();
  }

  /**
   * Ensures all messages between client and server get exchanged, and waits
   * until that has happened.
   */
  async function sync(side?: Client<any> | Server) {
    if (side === undefined || side === client) {
      await c2sPipe.flush();
    }
    if (side === undefined || side === server) {
      await s2cPipe.flush();
    }
  }

  onTestFinished(() => disconnect());

  {
    //
    // Strictly allow only the messages necessary for the initial handshake 🤝
    // ...but not any more messages than that.
    //
    //  Client                              Server
    //    |       <------ WelcomeServerMsg ---|
    //    |--- CatchUpClientMsg ------>       |
    //    |       <-- InitialSyncServerMsg ---|
    //
    await s2cPipe.flushWhile((msg) => msg.type === "WelcomeServerMsg");
    await c2sPipe.flushWhile((msg) => msg.type === "CatchUpClientMsg");
    await s2cPipe.flushWhile((msg) => msg.type === "InitialSyncServerMsg");
  }

  return { sync, disconnect };
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
export async function oneClientSetup<M extends Mutations>(
  mutations: M,
  serverMutations?: Mutations
) {
  const {
    clients,
    server,
    sync,
    reconnect: reconnect_,
    disconnect: disconnect_,
  } = await manyClientsSetup(1, mutations, serverMutations ?? mutations);

  const ctl = clients[0]!;
  const { client } = ctl;
  const reconnect = () => reconnect_(client);
  const disconnect = () => disconnect_(client);
  return { client, server, sync, disconnect, reconnect };
}

export async function twoClientsSetup<M extends Mutations>(
  mutations: M,
  serverMutations?: Mutations
) {
  const { server, clients, sync, disconnect, reconnect } =
    await manyClientsSetup(2, mutations, serverMutations ?? mutations);
  const client1 = clients[0]!.client;
  const client2 = clients[1]!.client;

  return { client1, client2, server, sync, disconnect, reconnect };
}

type ClientControl<M extends Mutations> = {
  client: Client<M>;
  sync: (side?: Client<M> | Server) => Promise<void>;
  disconnect: () => void;
};

export async function manyClientsSetup<M extends Mutations>(
  numClients: number,
  mutations: M,
  serverMutations?: Mutations
) {
  const server = new Server(serverMutations ?? mutations);

  const clients: ClientControl<M>[] = [];

  for (let i = 1; i <= numClients; i++) {
    const client = new Client(mutations);
    const { sync, disconnect } = await connectClientAndServer(client, server);
    clients.push({ client, sync, disconnect });
  }

  /**
   * Deliver all queued up messages in a specific pipe (aka flush that pipe),
   * and wait for all those messages to be delivered/handled. Pipes are
   * unidirectional. The following calls are possible:
   *
   * - await sync(client1)          Flushes all queued messages from client 1 to the server.
   * - await sync(server, client1)  Flushes all queued messages from the server to client 1.
   * - await sync(server)           Flushes all queued messages from the server to all
   *                                connected clients.
   * - await sync()                 Flushes all pipes, delivering all queued messages.
   */
  async function sync(): Promise<void>; // (1)
  async function sync(src: Client<M>): Promise<void>; // (2)
  async function sync(src: Server): Promise<void>; // (3)
  async function sync(src: Server, tgt: Client<M>): Promise<void>; // (4)
  async function sync(src?: Client<M> | Server, tgt?: Client<M>) {
    // (1)
    if (!src && !tgt) {
      // First take in all client's messages in the server, one by one (client
      // A's messages all arrive first, then client B's messages, etc etc)
      for (const ctl of clients) {
        await ctl.sync(ctl.client);
      }
      // Then, let the server emit all messages
      for (const ctl of clients) {
        await ctl.sync(server);
      }
      return;
    }
    src = src!; // We now know that src is set

    // (4)
    if (src && tgt) {
      for (const ctl of clients) {
        if (tgt === ctl.client) {
          await ctl.sync(server);
        }
      }
      return;
    }

    // (2) or (3)
    for (const ctl of clients) {
      if (src === server) {
        await ctl.sync(server);
      } else if (src === ctl.client) {
        await ctl.sync(ctl.client);
      }
    }
  }

  function disconnect(client: Client<M>) {
    for (const ctl of clients) {
      if (ctl.client === client) {
        ctl.disconnect();
      }
    }
  }

  async function reconnect(client: Client<M>) {
    disconnect(client); // Will be a no-op when not connected

    const newCtl = await connectClientAndServer(client, server);
    for (const ctl of clients) {
      if (ctl.client === client) {
        ctl.sync = newCtl.sync;
        ctl.disconnect = newCtl.disconnect;
      }
    }
  }

  return { clients, server, sync, disconnect, reconnect };
}
