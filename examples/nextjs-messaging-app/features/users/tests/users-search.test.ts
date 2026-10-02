// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/features/users/api/users-search";
import { getUsers } from "@/lib/database";

const DEMO_USER_IDS = getUsers().map((user) => user.id);

function searchRequest(text?: string) {
  const url = new URL("http://localhost/api/users/search");
  if (text !== undefined) {
    url.searchParams.set("text", text);
  }
  return GET(new NextRequest(url));
}

describe("GET /api/users/search", () => {
  it("returns all five demo user ids when text is omitted", async () => {
    const response = await searchRequest();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEMO_USER_IDS);
  });

  it("matches by name case-insensitively", async () => {
    const response = await searchRequest("char");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      "charlie.layne@example.com",
    ]);
  });

  it("matches MISLAV case-insensitively", async () => {
    const response = await searchRequest("MISLAV");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(["mislav.abha@example.com"]);
  });

  it("matches by id substring", async () => {
    const response = await searchRequest("example.com");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEMO_USER_IDS);
  });

  it("returns an empty array when nothing matches", async () => {
    const response = await searchRequest("zzz");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("trims whitespace from the query", async () => {
    const response = await searchRequest("  char  ");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      "charlie.layne@example.com",
    ]);
  });
});
