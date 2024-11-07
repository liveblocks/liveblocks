class Client {
  storage = new Map();

  mutations = {
    set: (k, v) => {
      this.storage.set(k, v);
    },
  };

  recv(delta) {
    const [updated, deleted] = delta;
    for (const [k, v] of updates) {
      this.storage.set(k, v);
    }
    for (const k of deleted) {
      this.storage.delete(k);
    }
  }
}

class Server {
  storage = new Map();

  mutations = {
    set: (k, v) => {
      this.storage.set(k, v);
    },
  };

  recv(op) {
    // op = ["set", "foo", "bar"]
    const [name, ...args] = op;
    this.mutations[name](...args);

    const delta = [["foo", "bar"], []];
    this.send(delta);
  }
}

const client = new Client();

function set(key: string, value: string) {
  storage.set(key, value);
}

function raiseAfterSet(key: string, value: string) {
  storage.set(key, value);
  storage.get(key) === value;
  throw new Error("???");
}

client.mutate.set("A", "A");

try {
  client.mutate.raiseAfterSet("B", "B");
} catch (er) {}

client.storage.get("A") === "A";
client.storage.get("B") === undefined;

//

client.mutate.set("A", "A");

client.mutate.set("B", "B");

server.receive(["set", "A", "A"]);

client.receive(["A", "A"]);
