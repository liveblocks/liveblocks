import type { Json } from "./Json";

export type ArboristNode =
  | {
      type: "LiveMap" | "LiveList" | "LiveObject";
      id: string;
      name: number | string /* parentKey */;
      children?: ArboristTree;
    }
  | {
      type: "Json";
      id: string;
      name: number | string /* parentKey */;
      data: Json;
    };

export type ArboristTree = ArboristNode[];

export function nanoid(): string {
  return `id-${Math.ceil(Math.random() * 1000000000)}`;
}
