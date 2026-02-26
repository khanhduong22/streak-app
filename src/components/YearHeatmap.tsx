"use client";

import { useState, useEffect, useTransition } from "react";
import { getCheckIns } from "@/actions/checkin-actions";

type DayData = {
  date: string;
  count: number; // 0 or 1
  status?: "checked_in" | "frozen";
  tier?: "full" | "half" | "minimal";
};

export function YearHeatmap({
  streakId,
  color,
}: {
  streakId: string;
  color: string;
}) {
  const [days, setDays] = useState<DayData[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Fetch last 12 months
    startTransition(async () => {
      const now = new Date();
      const allCheckIns: { checkInDate: string; status: "checked_in" | "frozen"; tier: "full" | "half" | "minimal"; note?: string | null }[] = [];

      // Fetch current month + last 11 months
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const data = await getCheckIns(streakId, d.getFullYear(), d.getMonth() + 1);
        allCheckIns.push(...(data as any));
      }

      const checkInMap = new Map(allCheckIns.map(c => [c.checkInDate, { status: c.status, tier: c.tier }]));

      // Build 365 days array going back from today
      const result: DayData[] = [];
      for (let i = 364; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const data = checkInMap.get(dateStr);
        result.push({ 
          date: dateStr, 
          count: data ? 1 : 0,
          status: data?.status as any,
          tier: data?.tier as any
        });
      }

      setDays(result);
    });
  }, [streakId]);

  // Group by week for grid layout (GitHub style)
  const today = new Date().toISOString().split("T")[0];

  // Pad start so first day aligns to correct column
  const firstDayOfWeek = days.length > 0 ? new Date(days[0].date).getDay() : 0;
  const paddedDays = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...days,
  ];

  const totalCheckIns = days.filter((d) => d.count > 0).length;
  const months = getMonthLabels(days);

  return (
    <div className="year-heatmap">
      <div className="year-heatmap-header">
        <span className="year-heatmap-title">Year Activity</span>
        <span className="year-heatmap-count">{totalCheckIns} check-ins this year</span>
      </div>

      {/* Month labels */}
      <div className="heatmap-months">
        {months.map((m) => (
          <span key={m.label + m.x} className="heatmap-month-label" style={{ gridColumn: m.x }}>
            {m.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="heatmap-grid">
        {paddedDays.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} className="heatmap-cell empty" />
          ) : (
            <div
              key={day.date}
              className={`heatmap-cell ${day.count > 0 ? "active" : "inactive"} ${day.date === today ? "today" : ""}`}
              style={
                day.status === "frozen" 
                  ? { background: "var(--accent-cyan)" } // Freeze color
                  : day.count > 0 
                    ? { 
                        background: color,
                        opacity: day.tier === "minimal" ? 0.4 : day.tier === "half" ? 0.7 : 1
                      } 
                    : undefined
              }
              title={`${day.date}${day.status === "frozen" ? " ❄️ Frozen" : day.count > 0 ? " ✓ " + (day.tier === "full" ? "🎯 Full" : day.tier === "half" ? "👍 Half" : "🤏 Minimal") : ""}`}
            />
          )
        )}
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Less</span>
        {[0, 0.3, 0.6, 0.8, 1].map((o) => (
          <div
            key={o}
            className="heatmap-cell"
            style={{
              background: o === 0 ? "var(--bg-glass)" : color,
              opacity: o === 0 ? 1 : o,
              width: 12,
              height: 12,
            }}
          />
        ))}
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>More</span>
      </div>
    </div>
  );
}

function getMonthLabels(days: DayData[]) {
  const months: { label: string; x: number }[] = [];
  let lastMonth = -1;

  days.forEach((day, i) => {
    const d = new Date(day.date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      // Week column = Math.floor(i / 7) + 1
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        x: Math.floor(i / 7) + 1,
      });
    }
  });
  return months;
}
