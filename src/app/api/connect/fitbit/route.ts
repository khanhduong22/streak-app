import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Missing FITBIT_CLIENT_ID" }, { status: 500 });
  }

  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:33000";
  // Xoá trailing slash nếu có để ghép path không bị lỗi //
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  const redirectUri = `${cleanBaseUrl}/api/connect/fitbit/callback`;

  // Request scopes for activity (steps, active minutes)
  const scopes = "activity";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: scopes,
    redirect_uri: redirectUri,
    expires_in: "31536000", // 1 year (Fitbit max)
    state: session.user.id, // Pass userId in state to link token on callback
  });

  return NextResponse.redirect(
    `https://www.fitbit.com/oauth2/authorize?${params.toString()}`
  );
}
