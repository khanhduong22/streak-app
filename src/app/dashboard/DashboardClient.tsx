"use client";

import { useState, useTransition, useEffect } from "react";
import { StreakCard } from "@/components/StreakCard";
import { StreakForm } from "@/components/StreakForm";
import { deleteStreak } from "@/actions/streak-actions";
import { CoopInviteBar } from "@/components/CoopInviteBar";
import { AICoachPanel } from "@/components/AICoachPanel";
import { MonthlyWrapped } from "@/components/MonthlyWrapped";
import Link from "next/link";

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
  stakeAmount: number;
  stakeStatus: "none" | "active" | "won" | "lost";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export function DashboardClient({
  initialStreaks,
  aiCoachPersonality,
  userId,
}: {
  initialStreaks: Streak[];
  aiCoachPersonality: "military" | "sweetheart" | "stoic";
  userId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingStreak, setEditingStreak] = useState<Streak | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showWrapped, setShowWrapped] = useState(false);

  const totalActiveStreaks = initialStreaks.filter((s) => s.currentStreak > 0).length;
  const longestOverall = Math.max(0, ...initialStreaks.map((s) => s.longestStreak));

  // Auto-show Monthly Wrapped on 1st-3rd of month
  useEffect(() => {
    const now = new Date();
    const day = now.getDate();
    const monthKey = `wrapped_seen_${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
    if (day >= 1 && day <= 3 && !localStorage.getItem(monthKey) && initialStreaks.length > 0) {
      setShowWrapped(true);
      localStorage.setItem(monthKey, "1");
    }
  }, [initialStreaks.length]);

  function handleEdit(streak: Streak) {
    setEditingStreak(streak);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this streak? This cannot be undone.")) return;
    startTransition(async () => { await deleteStreak(id); });
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingStreak(null);
  }

  const streakSummary = initialStreaks.map((s) => ({
    title: s.title,
    currentStreak: s.currentStreak,
    lastCheckIn: s.lastCheckIn,
  }));

  return (
    <div className="dashboard">
      {/* AI Coach Panel */}
      {initialStreaks.length > 0 && (
        <AICoachPanel
          streaks={streakSummary}
          initialPersonality={aiCoachPersonality}
          userId={userId}
        />
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Streaks</h1>
        </div>
        <div className="dashboard-stats">
          <span className="stat-badge">
            🔥 Active: <span className="stat-badge-value">{totalActiveStreaks}</span>
          </span>
          <span className="stat-badge">
            🏆 Best: <span className="stat-badge-value">{longestOverall}</span>
          </span>
          <Link href="/dashboard/death-pool" className="stat-badge" style={{ cursor: "pointer", textDecoration: "none" }}>
            💀 <span className="stat-badge-value">Death Pool</span>
          </Link>
          <button
            className="stat-badge"
            style={{ cursor: "pointer", border: "none", background: "var(--bg-glass)" }}
            onClick={() => setShowWrapped(true)}
            title="Monthly Wrapped"
          >
            📊 <span className="stat-badge-value">Wrapped</span>
          </button>
        </div>
      </div>

      <CoopInviteBar />

      {initialStreaks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">🚀</div>
          <h2 className="empty-state-title">Start your first streak!</h2>
          <p className="empty-state-text">
            Create a streak to start building consistency in your daily habits.
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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

      <button className="fab" onClick={() => setShowForm(true)} title="New Streak">+</button>

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

      {showWrapped && <MonthlyWrapped onClose={() => setShowWrapped(false)} />}
    </div>
  );
}
