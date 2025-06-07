import type { AiChatProps } from "@liveblocks/react-ui";
import { users } from "@/data/users";
import { departments, roles } from "@/data/data";
import { transactions } from "@/data/transactions";
import { aggregatedReport } from "@/data/report";

export async function GET() {
  const aiContext: AiChatProps["contexts"] = [
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
    {
      description: "A list of all transactions that occurred",
      value: JSON.stringify(transactions),
    },
    {
      description: "A list of aggregated daily reports",
      value: JSON.stringify(aggregatedReport),
    },
  ];

  console.log(aiContext);

  return Response.json(aiContext, { status: 200 });
}
