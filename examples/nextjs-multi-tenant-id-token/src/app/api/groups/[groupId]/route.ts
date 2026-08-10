import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  const { userId, childId } = await request.json();

  const body = childId ? { childId } : { userId };

  const res = await fetch(
    `${process.env.LIVEBLOCKS_BASE_URL}/v2/groups/${groupId}/${childId ? "groups" : "users"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to add user or child to group" },
      { status: 500 }
    );
  }

  return NextResponse.json(await res.json());
}

export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  const { userId, childId } = await request.json();

  const body = childId ? { childId } : { userId };

  const res = await fetch(
    `${process.env.LIVEBLOCKS_BASE_URL}/v2/groups/${groupId}/${childId ? "groups" : "users"}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to remove user or child from group" },
      { status: 500 }
    );
  }

  return NextResponse.json(await res.json());
}
