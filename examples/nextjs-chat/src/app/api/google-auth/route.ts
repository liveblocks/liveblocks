import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// TODO: this code is not secure, do not rely on this in prod
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const cookieStore = await cookies();
  if (code) {
    const { tokens } = await oauth2Client.getToken(code);
    console.log(tokens);
    if (tokens.access_token) {
      cookieStore.set("google_access_token", tokens.access_token);
    }
    if (tokens.refresh_token) {
      cookieStore.set("google_refresh_token", tokens.refresh_token);
    }
    return NextResponse.redirect(request.nextUrl.origin);
  }

  const accessToken = cookieStore.get("google_access_token")?.value;
  const refreshToken = cookieStore.get("google_refresh_token")?.value;

  if (refreshToken && accessToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    // not sure if this is noop when accessToken is still valid
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.refresh_token) {
      cookieStore.set("google_access_token", credentials.refresh_token);
    }
    if (credentials.access_token) {
      cookieStore.set("google_access_token", credentials.access_token);
    }
    return NextResponse.json({ token: credentials.access_token });
  }

  const scope = ["https://www.googleapis.com/auth/calendar"];
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope,
  });
  return NextResponse.json({ authUrl });
}
