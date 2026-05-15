import type { AiChatProps } from "@liveblocks/react-ui";
import { currentPlan, departments, roles } from "@/data/data";
import { users } from "@/data/users";

/** Same payload shape as `GET /api/team` — keeps Comments AI aligned with the dashboard copilot. */
export function getDashboardTeamKnowledge(): AiChatProps["knowledge"] {
  return [
    {
      description: "A list of all users added to the team",
      value: JSON.stringify(users),
    },
    {
      description: "Every department in this team",
      value: JSON.stringify(departments),
    },
    {
      description: "Every role in this team",
      value: JSON.stringify(roles),
    },
  ];
}

export function getDashboardPlanKnowledge() {
  return currentPlan;
}
