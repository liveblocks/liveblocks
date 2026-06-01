export const AGENT_NAMES = [
  "Taro",
  "Nio",
  "Mika",
  "Kai",
  "Luna",
  "Aero",
  "Zane",
  "Remy",
  "Sora",
  "Iris",
  "Otto",
  "Yuki",
  "Vee",
  "Juno",
  "Ezra",
  "Nova",
];

export function randomAgentName(): string {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
}

// Deterministic, pleasant color from an agent name (so the same name always
// gets the same color in chat and on its canvas cursor).
export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function agentStatusLabel(status: string): string {
  switch (status) {
    case "thinking":
      return "Thinking";
    case "editing":
      return "Generating";
    default:
      return "";
  }
}
