import { Format } from "./types";

export const PROSE_CONTAINER_ID = "prose_container";

export const LOCAL_STORAGE_THEME = "theme";

export const USER_COLORS = [
  "#0167B5",
  "#2FCABE",
  "#31B455",
  "#A322E8",
  "#CA672F",
  "#F8B301",
  "#FF1F73",
];

export const HOTKEYS: Record<string, Format> = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+s": "strikeThrough",
};
