import { getUser } from "@/lib/user";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!params.id) {
    throw new Error("id not passed to /user endpoint");
  }

  const userId = decodeURIComponent(params.id);
  const user = getUser(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return new Response(JSON.stringify(user), { status: 200 });
}
