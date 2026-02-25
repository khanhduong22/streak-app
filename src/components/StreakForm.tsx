"use client";

import { useState, useTransition } from "react";
import { createStreak, updateStreak } from "@/actions/streak-actions";

const EMOJIS = ["🔥", "💪", "📚", "🏃", "🧘", "💧", "🎯", "✍️", "🎸", "💤", "🥗", "💊"];
const COLORS = [
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#ec4899",
];

type StreakData = {
  id?: string;
  title: string;
  emoji: string;
  color: string;
  targetDays: number;
};

export function StreakForm({
  initial,
  onClose,
}: {
  initial?: StreakData | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "🔥");
  const [color, setColor] = useState(initial?.color || "#f97316");
  const [targetDays, setTargetDays] = useState(initial?.targetDays || 0);
  const [isPending, startTransition] = useTransition();

  const isEditing = !!initial?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      if (isEditing && initial?.id) {
        await updateStreak(initial.id, {
          title: title.trim(),
          emoji,
          color,
          targetDays,
        });
      } else {
        await createStreak({
          title: title.trim(),
          emoji,
          color,
          targetDays,
        });
      }
      onClose();
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {isEditing ? "Edit Streak" : "New Streak"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">What do you want to track?</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Exercise, Read, Meditate..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="emoji-picker">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-option ${emoji === e ? "selected" : ""}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-option ${color === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Target (days) — 0 for no target
            </label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={targetDays}
              onChange={(e) => setTargetDays(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending || !title.trim()}
            >
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Streak"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
