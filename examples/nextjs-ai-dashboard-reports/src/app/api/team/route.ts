import type { AiChatProps } from "@liveblocks/react-ui";
import { users } from "@/data/users";
import { departments, roles } from "@/data/data";

export async function GET() {
  const aiKnowledge: AiChatProps["knowledge"] = [
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

  return Response.json(aiKnowledge, { status: 200 });
}
