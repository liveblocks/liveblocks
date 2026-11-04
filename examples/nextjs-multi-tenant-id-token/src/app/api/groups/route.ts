import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { groupId } = await request.json();

  const res = await fetch(`${process.env.LIVEBLOCKS_BASE_URL}/v2/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
    },
    body: JSON.stringify({
      groupId,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }

  return NextResponse.json(await res.json());
}
