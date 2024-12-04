type Shape = {
  x: number;
  y: number;
  fill: string;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      selectedShape: string | null;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    StorageV2: {
      shapes: Map<string, Shape>;
    };
  }
}

type Mutable = {
  root: Liveblocks["StorageV2"];
};

//
// NOTE:
// The mutations below will get executed both on the client and the server!
//
// Inside these mutations, `root` is a mutable proxy. Mutate it like you would
// mutate any JavaScript object. Accessing fields on `root` further gives you
// access to nested proxies that you can also mutate. Any changes you make
// anywhere underneath the root will get live serialized to all connected
// clients in the room.
//
// Inside the client, this exact same code will run as an optimistic update.
//
// Any mutation you run locally will travel over the wire as a tuple of
// function name and arguments:
//
//     ["init", []]  // For new rooms only
//     ["insertRectangle", ["shapeId", 13, 42, "#ef62ac"]]
//     ["setXY", ["shapeId", 18, 32]]
//
// These means any arguments you pass to this function must be
// JSON-serializable.
//

export function init({ root }: Mutable) {
  root.shapes = new Map();
}

export function insertRectangle(
  { root }: Mutable,
  shapeId: string,
  x: number,
  y: number,
  fill: string
) {
  root.shapes.set(shapeId, { x, y, fill });
}

export function deleteRectangle({ root }: Mutable, shapeId: string) {
  root.shapes.delete(shapeId);
}

export function setXY(
  { root }: Mutable,
  shapeId: string,
  x: number,
  y: number
) {
  const shape = root.shapes.get(shapeId);
  if (shape) {
    shape.x = x;
    shape.y = y;
  }
}
