import { POST } from "@/features/users/api/auth";

export const AUTH_ORIGIN = "http://localhost:3000";

export function cookiesFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

export function authRequest(path: string, body: unknown, cookie?: string) {
  return POST(
    new Request(`${AUTH_ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: AUTH_ORIGIN,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    })
  );
}

export function signInDemo(userId: string) {
  return authRequest("/sign-in/demo", { userId });
}

export async function demoSessionCookie(userId: string) {
  return cookiesFrom(await signInDemo(userId));
}
