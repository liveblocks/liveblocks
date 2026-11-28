import type { Climate } from "../climate";

export type TreeKind = "round" | "conifer" | "snowy" | "palm" | "cactus";

// What a climate looks like: the colors of the ground, what houses are
// built of, and what grows there
export type Look = {
  grass: string;
  // Ground with trees on it
  wooded: string;
  // The shore
  sand: string;
  water: string;
  lawn: string;
  // Houses and small blocks of flats pick their colors from these
  walls: string[];
  roofs: string[];
  // Houses have flat roofs instead of pitched ones
  flatRoofs: boolean;
  // The two kinds of tree that grow here. Woods are a mix of both.
  leafy: { kind: TreeKind; color: string };
  conifer: { kind: TreeKind; color: string };
};

export const LOOKS: Record<Climate, Look> = {
  normal: {
    grass: "#7fbb58",
    wooded: "#6fae50",
    sand: "#e3d4a2",
    water: "#4b90d2",
    lawn: "#93cf6b",
    walls: ["#f3ead9", "#e6d3b8", "#f7f2e8", "#dcb99c"],
    roofs: ["#b4533c", "#8c5a44", "#5f6b7a", "#a8452f"],
    flatRoofs: false,
    leafy: { kind: "round", color: "#4f9a3f" },
    conifer: { kind: "conifer", color: "#2f7a4a" },
  },
  // Timber houses, painted, with snow on their roofs
  snow: {
    grass: "#f0f4f7",
    wooded: "#e3ebf0",
    sand: "#cfd9e1",
    water: "#4f86bd",
    lawn: "#e8eff3",
    walls: ["#b9543f", "#d9b48c", "#ece4d6", "#8a6a55"],
    roofs: ["#f6f9fb", "#e7eef4", "#f6f9fb", "#dce6ee"],
    flatRoofs: false,
    leafy: { kind: "snowy", color: "#3c7d5c" },
    conifer: { kind: "snowy", color: "#2b6a4b" },
  },
  // Whitewashed and mud brick houses with flat roofs
  desert: {
    grass: "#e2c88c",
    wooded: "#dbbf82",
    sand: "#f0dfb4",
    water: "#3f9fc4",
    lawn: "#b9c77a",
    walls: ["#f4e6c8", "#e2c296", "#f9f1df", "#d3a074"],
    roofs: ["#dcbd92", "#c7946a", "#e8d6b2", "#b67c54"],
    flatRoofs: true,
    leafy: { kind: "palm", color: "#5a9a45" },
    conifer: { kind: "cactus", color: "#5c9458" },
  },
  // Wooden houses under thatch and painted tin
  jungle: {
    grass: "#63b34b",
    wooded: "#4c9b3b",
    sand: "#e6d9a2",
    water: "#3a94b5",
    lawn: "#7cc45c",
    walls: ["#d8b688", "#f0e3c2", "#c38e5e", "#e8d6a6"],
    roofs: ["#c4a45c", "#a98840", "#5f8c58", "#b5533c"],
    flatRoofs: false,
    leafy: { kind: "round", color: "#2f8f3c" },
    conifer: { kind: "palm", color: "#3f9a3f" },
  },
};
