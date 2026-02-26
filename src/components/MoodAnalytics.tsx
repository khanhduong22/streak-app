"use client";

import { useState, useEffect } from "react";
import { getCheckIns } from "@/actions/checkin-actions";

type CheckInProps = {
  checkInDate: string;
  status: "checked_in" | "frozen";
  mood?: "happy" | "tired" | "stressed" | null;
};

export function MoodAnalytics({ streakId }: { streakId: string }) {
  const [data, setData] = useState<CheckInProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const now = new Date();
      const all: CheckInProps[] = [];
      // Load last 6 months for analytics
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const res = await getCheckIns(streakId, d.getFullYear(), d.getMonth() + 1);
        all.push(...(res as CheckInProps[]));
      }
      setData(all);
      setLoading(false);
    }
    loadData();
  }, [streakId]);

  if (loading) return <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", textAlign: "center", padding: 16 }}>Loading analytics...</div>;

  const totalLogs = data.filter(d => d.mood !== null && d.mood !== undefined).length;
  if (totalLogs === 0) {
    return (
      <div style={{ marginTop: 16, padding: "16px", background: "var(--bg-glass)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Not enough mood data yet. Keep checking in and logging your feelings!</div>
      </div>
    );
  }

  const moodCounts = { happy: 0, tired: 0, stressed: 0 };
  const frozenByMood = { happy: 0, tired: 0, stressed: 0 };

  data.forEach((c) => {
    if (c.mood) {
      moodCounts[c.mood]++;
      if (c.status === "frozen") {
        frozenByMood[c.mood]++;
      }
    }
  });

  const getPercent = (count: number, total: number) => total > 0 ? Math.round((count / total) * 100) : 0;

  const insights = [];
  if (moodCounts.stressed > 0 && frozenByMood.stressed / moodCounts.stressed > 0.3) {
    insights.push("You tend to miss your streak when you're 🤯 Stressed. Try breaking the habit into smaller steps on those days.");
  }
  if (moodCounts.tired > 0 && frozenByMood.tired / moodCounts.tired > 0.3) {
    insights.push("Being 😫 Tired often disrupts your streak. Consider scheduling this habit for earlier in the day when you have more energy.");
  }
  if (moodCounts.happy > moodCounts.tired + moodCounts.stressed) {
    insights.push("You're mostly 😊 Happy when doing this! Your positive association is keeping the streak strong.");
  }

  return (
    <div className="mood-analytics" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
      <h3 style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
        Mood Insights (Last 6 Months)
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {insights.length > 0 ? insights.map((msg, i) => (
          <div key={i} style={{ fontSize: "0.8125rem", color: "var(--text-primary)", background: "rgba(255,255,255,0.05)", padding: "10px 12px", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-orange)" }}>
            💡 {msg}
          </div>
        )) : (
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Keep logging your mood to uncover personalized insights!</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          { key: "happy", icon: "😊", label: "Happy", color: "#4ade80" },
          { key: "tired", icon: "😫", label: "Tired", color: "#fbbf24" },
          { key: "stressed", icon: "🤯", label: "Stressed", color: "#f87171" },
        ].map((m) => {
          const mKey = m.key as keyof typeof moodCounts;
          const total = moodCounts[mKey];
          const pct = getPercent(total, totalLogs);

          return (
            <div key={m.key} style={{ flex: 1, background: "var(--bg-glass)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: m.color }}>{pct}%</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
