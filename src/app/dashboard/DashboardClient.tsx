"use client";

import { useState, useTransition } from "react";
import { StreakCard } from "@/components/StreakCard";
import { StreakForm } from "@/components/StreakForm";
import { deleteStreak } from "@/actions/streak-actions";

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
  updatedAt: Date;
  userId: string;
};

export function DashboardClient({
  initialStreaks,
}: {
  initialStreaks: Streak[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingStreak, setEditingStreak] = useState<Streak | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalActiveStreaks = initialStreaks.filter(
    (s) => s.currentStreak > 0
  ).length;
  const longestOverall = Math.max(
    0,
    ...initialStreaks.map((s) => s.longestStreak)
  );

  function handleEdit(streak: Streak) {
    setEditingStreak(streak);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this streak? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteStreak(id);
    });
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingStreak(null);
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Streaks</h1>
        </div>
        <div className="dashboard-stats">
          <span className="stat-badge">
            🔥 Active:{" "}
            <span className="stat-badge-value">{totalActiveStreaks}</span>
          </span>
          <span className="stat-badge">
            🏆 Best:{" "}
            <span className="stat-badge-value">{longestOverall}</span>
          </span>
        </div>
      </div>

      {initialStreaks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">🚀</div>
          <h2 className="empty-state-title">Start your first streak!</h2>
          <p className="empty-state-text">
            Create a streak to start building consistency in your daily habits.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Create Streak
          </button>
        </div>
      ) : (
        <div className="streak-grid">
          {initialStreaks.map((streak) => (
            <StreakCard
              key={streak.id}
              streak={streak}
              onEdit={() => handleEdit(streak)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={() => setShowForm(true)}
        title="New Streak"
      >
        +
      </button>

      {showForm && (
        <StreakForm
          initial={
            editingStreak
              ? {
                  id: editingStreak.id,
                  title: editingStreak.title,
                  emoji: editingStreak.emoji || "🔥",
                  color: editingStreak.color || "#f97316",
                  targetDays: editingStreak.targetDays || 0,
                }
              : null
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
