import { LiveMap, LiveObject } from "@liveblocks/client";
import { Armchair } from "./src/models/furniture/Armchair";
import { Table } from "./src/models/furniture/Table";
import { CoffeeTable } from "./src/models/furniture/CoffeeTable";
import { Sofa } from "./src/models/furniture/Sofa";
import { Television } from "./src/models/furniture/Television";
import { Lamp } from "./src/models/furniture/Lamp";
import { Plant } from "./src/models/furniture/Plant";
import { ComponentType } from "react";
import { QuaternionLike, Vector3Like } from "three";

type SimpleVector3 = {
  x: number;
  y: number;
  z: number;
};

type SimpleMatrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type Shape = {
  matrix: SimpleMatrix4;
  model: keyof typeof models;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      position: SimpleVector3 | null;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      shapes: LiveMap<string, LiveObject<Shape>>;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
      }; // Accessible through `user.info`
    };
  }
}

export const models = {
  armchair: {
    model: Armchair,
    initialMatrix: [
      -0.5772308340427108, 0, 0.8165810212283631, 0, 0, 1, 0, 0,
      -0.8165810212283631, 0, -0.5772308340427108, 0, -0.4794998971978519, 0,
      1.3992578897901398, 1,
    ],
  },
  table: {
    model: Table,
    initialMatrix: [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.4961440045504397, 0,
      -1.9506043501559756, 1,
    ],
  },
  coffeeTable: {
    model: CoffeeTable,
    initialMatrix: [
      0.9999927780731361, 0, -0.0038005001738697364, 0, 0, 1, 0, 0,
      0.0038005001738697364, 0, 0.9999927780731361, 0, 1.441123831988138, 0,
      2.1579823439897274, 1,
    ],
  },
  sofa: {
    model: Sofa,
    initialMatrix: [
      -0.9999753862861043, 0, 0.007016182862256569, 0, 0, 1, 0, 0,
      -0.007016182862256569, 0, -0.9999753862861043, 0, 1.5326736649991364, 0,
      0.5114342503169618, 1,
    ],
  },
  television: {
    model: Television,
    initialMatrix: [
      0.9999991805424937, 0, 0.0012802008986473046, 0, 0, 0.9999999999999994, 0,
      0, -0.0012802008986473046, 0, 0.9999991805424937, 0, 1.4704967658927384,
      0, 3.6096849324186846, 1,
    ],
  },
  lamp: {
    model: Lamp,
    initialMatrix: [
      0.6140971046860668, 0, 0.789230477120714, 0, 0, 1, 0, 0,
      -0.789230477120714, 0, 0.6140971046860668, 0, -2.192807202835838, 0,
      -3.4733623420820545, 1,
    ],
  },
  plant: {
    model: Plant,
    initialMatrix: [
      0.7091673207113888, 0, 0.7050402195868192, 0, 0, 1, 0, 0,
      -0.7050402195868192, 0, 0.7091673207113888, 0, -2.145703864452491, 0,
      3.5847751351350707, 1,
    ],
  },
} satisfies Record<
  string,
  { model: ComponentType; initialMatrix: SimpleMatrix4 }
>;

export const defaultVector3: Vector3Like = {
  x: 0,
  y: 0,
  z: 0,
};

export const defaultQuaternion: QuaternionLike = {
  w: 1,
  x: 0,
  y: 0,
  z: 0,
};

export const defaultMatrix4: SimpleMatrix4 = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

export const initialPresence: Liveblocks["Presence"] = {
  position: null,
};

export const initialStorage: Liveblocks["Storage"] = {
  shapes: new LiveMap(
    (Object.keys(models) as (keyof typeof models)[]).map((model, index) => {
      const shapeId = String(index);
      const shape: Shape = {
        matrix: models[model].initialMatrix,
        model,
      };

      return [shapeId, new LiveObject(shape)];
    })
  ),
};
