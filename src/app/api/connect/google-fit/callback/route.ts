import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // We passed userId in state
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?fit=error&reason=${error || "missing_params"}`
    );
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connect/google-fit/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      throw new Error("No access token in response");
    }

    // Calculate expiry timestamp
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Save tokens to DB
    await db.update(users)
      .set({
        fitAccessToken: tokens.access_token,
        fitRefreshToken: tokens.refresh_token || null,
        fitTokenExpiry: expiryDate,
      })
      .where(eq(users.id, userId));

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?fit=connected`
    );
  } catch (err) {
    console.error("Google Fit OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?fit=error&reason=token_exchange_failed`
    );
  }
}
