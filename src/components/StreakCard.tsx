"use client";

import { useState, useTransition } from "react";
import { checkIn, undoCheckIn } from "@/actions/checkin-actions";
import { CheckInCalendar } from "./CheckInCalendar";

type Streak = {
  id: string;
  title: string;
  emoji: string | null;
  color: string | null;
  targetDays: number | null;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  createdAt: Date;
};

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [animating, setAnimating] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const checkedInToday = streak.lastCheckIn === today;

  const progressPercent =
    streak.targetDays && streak.targetDays > 0
      ? Math.min((streak.currentStreak / streak.targetDays) * 100, 100)
      : 0;

  function handleCheckIn() {
    setAnimating(true);
    startTransition(async () => {
      try {
        await checkIn(streak.id);
      } catch (e: unknown) {
        const error = e as Error;
        alert(error.message);
      }
      setTimeout(() => setAnimating(false), 400);
    });
  }

  function handleUndo() {
    startTransition(async () => {
      try {
        await undoCheckIn(streak.id);
      } catch (e: unknown) {
        const error = e as Error;
        alert(error.message);
      }
    });
  }

  return (
    <div
      className={`streak-card ${animating ? "checkin-animating" : ""}`}
      style={{ "--card-color": streak.color || "#f97316" } as React.CSSProperties}
    >
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
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCalendar(!showCalendar)}
            title="Calendar"
          >
            🗓️
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(streak)}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onDelete(streak.id)}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="streak-card-count">
        <span
          className="streak-card-number"
          style={{ color: streak.color || "#f97316" }}
        >
          {streak.currentStreak}
        </span>
        <span className="streak-card-label">day streak</span>
      </div>

      {streak.targetDays ? (
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${progressPercent}%`,
              background: streak.color || "var(--gradient-fire)",
            }}
          />
        </div>
      ) : null}

      <div className="streak-card-meta">
        <span className="streak-card-meta-item">
          🏆 Best: {streak.longestStreak}
        </span>
        <span className="streak-card-meta-item">
          📅 Since {new Date(streak.createdAt).toLocaleDateString()}
        </span>
      </div>

      {showCalendar && <CheckInCalendar streakId={streak.id} color={streak.color || "#22c55e"} />}

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
            style={{ marginTop: 0, alignSelf: "center" }}
          >
            ↩️
          </button>
        </div>
      ) : (
        <button
          className={`checkin-btn available`}
          onClick={handleCheckIn}
          disabled={isPending}
        >
          {isPending ? "⏳ Checking in..." : "🔥 Check in"}
        </button>
      )}
    </div>
  );
}
