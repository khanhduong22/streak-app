"use client";

import { useState, useTransition } from "react";
import { checkIn, undoCheckIn } from "@/actions/checkin-actions";
import { CheckInCalendar } from "./CheckInCalendar";
import { BadgeDisplay } from "./BadgeDisplay";
import { YearHeatmap } from "./YearHeatmap";
import { ShareCard } from "./ShareCard";
import { MoodAnalytics } from "./MoodAnalytics";
import { CoopPanel } from "./CoopPanel";

type Streak = {
  id: string;
  title: string;
  emoji: string | null;
  color: string | null;
  targetDays: number | null;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  coopPartnerStreakId: string | null;
  createdAt: Date;
};

type View = "none" | "month" | "year" | "badges" | "analytics" | "coop";

export function StreakCard({
  streak,
  onEdit,
  onDelete,
}: {
  streak: Streak;
  onEdit: (streak: Streak) => void;
  onDelete: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("none");
  const [showShare, setShowShare] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [askingTier, setAskingTier] = useState(false);
  const [askingMood, setAskingMood] = useState<{ active: boolean; tier?: "full" | "half" | "minimal" }>({ active: false });

  const today = new Date().toISOString().split("T")[0];
  const checkedInToday = streak.lastCheckIn === today;
  const color = streak.color || "#f97316";

  const progressPercent =
    streak.targetDays && streak.targetDays > 0
      ? Math.min((streak.currentStreak / streak.targetDays) * 100, 100)
      : 0;

  function toggleView(v: View) {
    setView((prev) => (prev === v ? "none" : v));
  }

  function handleCheckInInit() {
    setAskingTier(true);
  }

  function handleTierSelect(tier: "full" | "half" | "minimal") {
    setAskingTier(false);
    setAskingMood({ active: true, tier });
  }

  function handleMoodSelect(mood?: "happy" | "tired" | "stressed" | null) {
    const tier = askingMood.tier || "full";
    setAskingMood({ active: false });
    setAnimating(true);
    startTransition(async () => {
      try {
        await checkIn(streak.id, undefined, mood, tier);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
      setTimeout(() => setAnimating(false), 400);
    });
  }

  function handleUndo() {
    startTransition(async () => {
      try {
        await undoCheckIn(streak.id);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <>
      <div
        className={`streak-card ${animating ? "checkin-animating" : ""}`}
        style={{ "--card-color": color } as React.CSSProperties}
      >
        {/* Header */}
        <div className="streak-card-header">
          <div className="streak-card-info">
            <div className="streak-card-emoji">{streak.emoji || "🔥"}</div>
            <div>
              <div className="streak-card-title">{streak.title}</div>
              {streak.targetDays ? (
                <div className="streak-card-target">
                  Target: {streak.targetDays} days
                </div>
              ) : null}
            </div>
          </div>
          <div className="streak-card-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => toggleView("month")} title="Monthly Calendar">🗓️</button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleView("year")} title="Year Heatmap">📊</button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleView("badges")} title="Badges">🏅</button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleView("analytics")} title="Mood Analytics">🧠</button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleView("coop")} title="Co-op Streak" style={{ color: streak.coopPartnerStreakId ? "#a78bfa" : undefined }}>🤝</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)} title="Share">📤</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(streak)} title="Edit">✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onDelete(streak.id)} title="Delete">🗑️</button>
          </div>
        </div>

        {/* Count */}
        <div className="streak-card-count">
          <span className="streak-card-number" style={{ color }}>
            {streak.currentStreak}
          </span>
          <span className="streak-card-label">day streak</span>
        </div>

        {/* Progress */}
        {streak.targetDays ? (
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%`, background: color }}
            />
          </div>
        ) : null}

        {/* Meta */}
        <div className="streak-card-meta">
          <span className="streak-card-meta-item">🏆 Best: {streak.longestStreak}</span>
          <span className="streak-card-meta-item">
            📅 Since {new Date(streak.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Expandable panels */}
        {view === "month" && (
          <CheckInCalendar streakId={streak.id} color={color} />
        )}
        {view === "year" && (
          <YearHeatmap streakId={streak.id} color={color} />
        )}
        {view === "badges" && (
          <BadgeDisplay longestStreak={streak.longestStreak} />
        )}
        {view === "analytics" && (
          <MoodAnalytics streakId={streak.id} />
        )}
        {view === "coop" && (
          <CoopPanel streakId={streak.id} coopPartnerStreakId={streak.coopPartnerStreakId} />
        )}

        {/* Check-in */}
        {checkedInToday ? (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="checkin-btn done" style={{ flex: 1 }} disabled>
              ✅ Done for today!
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleUndo}
              disabled={isPending}
              title="Undo"
            >
              ↩️
            </button>
          </div>
        ) : askingTier ? (
          <div style={{ marginTop: 16, background: "var(--bg-glass)", padding: 12, borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.875rem", marginBottom: 8, color: "var(--text-secondary)", textAlign: "center", fontWeight: 600 }}>
              How did you do today?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8, justifyContent: "space-between" }} onClick={() => handleTierSelect("full")}>
                <span>🎯 Full Goal</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>+30 🪙</span>
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8, justifyContent: "space-between" }} onClick={() => handleTierSelect("half")}>
                <span>👍 Halfway</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>+20 🪙</span>
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8, justifyContent: "space-between" }} onClick={() => handleTierSelect("minimal")}>
                <span>🤏 Minimal (Saved Streak)</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>+10 🪙</span>
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, padding: 8 }} onClick={() => setAskingTier(false)}>Cancel</button>
            </div>
          </div>
        ) : askingMood.active ? (
          <div style={{ marginTop: 16, background: "var(--bg-glass)", padding: 12, borderRadius: "var(--radius-md)" }}>
            <div style={{ fontSize: "0.875rem", marginBottom: 8, color: "var(--text-secondary)", textAlign: "center" }}>
              How are you feeling today?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8 }} onClick={() => handleMoodSelect("happy")}>😊</button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8 }} onClick={() => handleMoodSelect("tired")}>😫</button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8 }} onClick={() => handleMoodSelect("stressed")}>🤯</button>
              <button className="btn btn-ghost" style={{ flex: 1, padding: 8 }} onClick={() => handleMoodSelect(null)}>Skip</button>
            </div>
          </div>
        ) : (
          <button
            className="checkin-btn available"
            onClick={handleCheckInInit}
            disabled={isPending}
          >
            {isPending ? "⏳ Checking in..." : "🔥 Check in"}
          </button>
        )}
      </div>

      {showShare && (
        <ShareCard
          streakId={streak.id}
          streakTitle={streak.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
