import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // We passed userId in state
  const error = searchParams.get("error");

  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:33000";
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  if (error || !code || !userId) {
    return NextResponse.redirect(
      `${cleanBaseUrl}/dashboard?fitbit=error&reason=${error || "missing_params"}`
    );
  }

  try {
    const clientId = process.env.FITBIT_CLIENT_ID!;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET!;
    const redirectUri = `${cleanBaseUrl}/api/connect/fitbit/callback`;

    // Fitbit requires Basic Auth header with base64 encoded client_id:client_secret
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Fitbit API Error: ${tokenRes.status} ${errText}`);
    }

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      throw new Error("No access token in response");
    }

    // Calculate expiry timestamp
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Save tokens to DB
    await db.update(users)
      .set({
        fitbitAccessToken: tokens.access_token,
        fitbitRefreshToken: tokens.refresh_token || null,
        fitbitTokenExpiry: expiryDate,
      })
      .where(eq(users.id, userId));

    return NextResponse.redirect(
      `${cleanBaseUrl}/dashboard?fitbit=connected`
    );
  } catch (err) {
    console.error("Fitbit OAuth error:", err);
    return NextResponse.redirect(
      `${cleanBaseUrl}/dashboard?fitbit=error&reason=token_exchange_failed`
    );
  }
}
