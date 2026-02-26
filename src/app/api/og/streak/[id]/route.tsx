import { ImageResponse } from "next/og";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const revalidate = 3600; // Cache 1 hour

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.id, id),
  });

  if (!streak) {
    return new Response("Not found", { status: 404 });
  }

  const color = streak.color || "#f97316";
  const emoji = streak.emoji || "🔥";

  // Badge logic
  const badges = [
    { days: 7, emoji: "🥉" },
    { days: 14, emoji: "⚡" },
    { days: 30, emoji: "🥈" },
    { days: 60, emoji: "💎" },
    { days: 100, emoji: "🥇" },
    { days: 180, emoji: "👑" },
    { days: 365, emoji: "🌟" },
  ];
  const earnedBadges = badges.filter((b) => streak.longestStreak >= b.days);
  const latestBadge = earnedBadges.at(-1);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0a0a0f",
          padding: "60px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: color,
            opacity: 0.08,
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {emoji}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "40px",
                  fontWeight: 800,
                  color: "#f0f0f5",
                }}
              >
                {streak.title}
              </span>
              <span style={{ fontSize: "20px", color: "#8888a0", marginTop: 4 }}>
                Daily Streak
              </span>
            </div>
          </div>

          {latestBadge && (
            <div
              style={{
                fontSize: "56px",
                display: "flex",
              }}
            >
              {latestBadge.emoji}
            </div>
          )}
        </div>

        {/* Main stat */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px" }}>
          <span
            style={{
              fontSize: "120px",
              fontWeight: 900,
              color: color,
              lineHeight: 1,
            }}
          >
            {streak.currentStreak}
          </span>
          <span style={{ fontSize: "36px", color: "#8888a0" }}>
            day streak 🔥
          </span>
        </div>

        {/* Best */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginBottom: "48px",
          }}
        >
          <span style={{ fontSize: "22px", color: "#8888a0" }}>
            🏆 Best:{" "}
            <span style={{ color: "#f0f0f5", fontWeight: 700 }}>
              {streak.longestStreak} days
            </span>
          </span>
        </div>

        {/* Progress bar */}
        {streak.targetDays && streak.targetDays > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 18, color: "#8888a0" }}>
              Progress to {streak.targetDays}-day goal
            </span>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "99px",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${Math.min((streak.currentStreak / streak.targetDays) * 100, 100)}%`,
                  height: "100%",
                  background: color,
                  borderRadius: "99px",
                  display: "flex",
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "60px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "28px" }}>🔥</span>
          <span style={{ fontSize: "20px", color: "#55556a", fontWeight: 600 }}>
            streak-app.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
