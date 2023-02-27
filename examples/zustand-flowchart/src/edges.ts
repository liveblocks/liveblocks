import { Edge } from "reactflow";

export default [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
  { id: "e2-3", source: "2", target: "3", label: "with" },
  { id: "e3-4", source: "3", target: "4", label: "and", animated: true },
] as Edge[];
