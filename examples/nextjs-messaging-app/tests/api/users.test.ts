// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/users/route";
import { AI_USER, getUser, getUsers } from "@/app/database";

function getUsersRequest(userIds: string[]) {
  const url = new URL("http://localhost/api/users");
  for (const id of userIds) {
    url.searchParams.append("userIds", id);
  }
  return GET(new NextRequest(url));
}

describe("GET /api/users", () => {
  it("returns user info for known ids and null for unknown", async () => {
    const charlie = getUser("charlie.layne@example.com")!;
    const response = await getUsersRequest([
      "charlie.layne@example.com",
      "unknown-id",
      "mislav.abha@example.com",
    ]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      charlie.info,
      null,
      getUser("mislav.abha@example.com")!.info,
    ]);
  });

  it("returns an empty array when userIds is omitted", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/users")
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("resolves ai-assistant to the AI user info", async () => {
    const response = await getUsersRequest(["ai-assistant"]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([AI_USER.info]);
  });

  it("returns info objects with name, avatar, and color", async () => {
    const [first] = getUsers();
    const response = await getUsersRequest([first.id]);
    const [info] = await response.json();
    expect(info).toEqual({
      name: first.info.name,
      avatar: first.info.avatar,
      color: first.info.color,
    });
  });
});
