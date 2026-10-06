import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getRandomUser, getUser, getUsers } from "@/app/database";
import { GET as getUsersRoute } from "@/app/api/users/route";
import { GET as searchUsersRoute } from "@/app/api/users/search/route";

describe("database helpers", () => {
  it("getUser finds by id and returns undefined for unknown ids", () => {
    const known = getUsers()[0];
    expect(getUser(known.id)).toBe(known);
    expect(getUser("unknown@example.com")).toBeUndefined();
  });

  it("getUsers returns the full list with id and info fields", () => {
    const users = getUsers();
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user).toHaveProperty("id");
      expect(user.info).toMatchObject({
        name: expect.any(String),
        avatar: expect.any(String),
        color: expect.any(String),
      });
    }
  });

  it("getRandomUser returns a member of getUsers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const picked = getRandomUser();
    expect(getUsers()).toContain(picked);
    vi.restoreAllMocks();
  });
});

describe("GET /api/users", () => {
  it("returns matching user info objects in query order", async () => {
    const users = getUsers();
    const id1 = users[0].id;
    const id2 = users[2].id;
    const request = new NextRequest(
      `http://localhost/api/users?userIds=${encodeURIComponent(id1)}&userIds=${encodeURIComponent(id2)}`
    );

    const response = await getUsersRoute(request);
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([users[0].info, users[2].info]);
  });
});

describe("GET /api/users/search", () => {
  it("filters users by name case-insensitively and returns ids", async () => {
    const request = new NextRequest(
      "http://localhost/api/users/search?text=char"
    );
    const response = await searchUsersRoute(request);
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(["charlie.layne@example.com"]);
  });

  it("returns all user ids when text is empty", async () => {
    const request = new NextRequest("http://localhost/api/users/search?text=");
    const response = await searchUsersRoute(request);
    const body: unknown = await response.json();

    expect(body).toEqual(getUsers().map((user) => user.id));
  });
});
