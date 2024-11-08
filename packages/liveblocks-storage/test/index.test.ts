import { describe, expect, test } from "vitest";
import { BoundMutations, Client, Mutations, Server } from "~/index.js";
import { mutations } from "./_mutations.js";

describe("storage", () => {
  test("simple mutations", () => {
    const client = new Client(mutations);
    // const server = new Server(mutations as Mutations);

    expect(Object.keys(client.mutate)).toEqual(Object.keys(mutations));

    client.mutate.put("henk", "foo");

    // expect(new Client()).toEqual(new Server());
  });

  //   const client = new Client();
  //
  //   client.mutate.set("A", "A");
  //
  //   try {
  //     client.mutate.raiseAfterSet("B", "B");
  //   } catch (er) {}
  //
  //   client.storage.get("A") === "A";
  //   client.storage.get("B") === undefined;
  //
  //   //
  //
  //   client.mutate.set("A", "A");
  //
  //   client.mutate.set("B", "B");
  //
  //   server.receive(["set", "A", "A"]);
  //
  //   client.receive(["A", "A"]);
});
