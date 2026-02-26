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
  zenMode?: boolean;
  impactMultiplier?: number;
  impactUnit?: string;
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
  const [zenMode, setZenMode] = useState(initial?.zenMode ?? false);
  const [impactMultiplier, setImpactMultiplier] = useState(initial?.impactMultiplier ?? 0);
  const [impactUnit, setImpactUnit] = useState(initial?.impactUnit ?? "");
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
          zenMode,
          impactMultiplier,
          impactUnit,
        });
      } else {
        await createStreak({
          title: title.trim(),
          emoji,
          color,
          targetDays,
          zenMode,
          impactMultiplier,
          impactUnit,
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

          {/* ─── Cumulative Impact ─── */}
          <div className="form-group">
            <label className="form-label">⚡ Thành quả tích lũy (để trống nếu không dùng)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="Hệ số/ngày (VD: 10)"
                value={impactMultiplier || ""}
                onChange={(e) => setImpactMultiplier(parseInt(e.target.value) || 0)}
                style={{ flex: "0 0 120px" }}
              />
              <input
                className="form-input"
                placeholder="Đơn vị (VD: trang sách, nghìn đồng)"
                value={impactUnit}
                onChange={(e) => setImpactUnit(e.target.value)}
              />
            </div>
            {impactMultiplier > 0 && impactUnit && (
              <div className="impact-preview">
                VD: Streak 30 ngày = <strong>{(30 * impactMultiplier).toLocaleString()} {impactUnit}</strong>
              </div>
            )}
          </div>

          {/* ─── Zen Mode Toggle ─── */}
          <button
            type="button"
            className={`zen-toggle ${zenMode ? "active" : ""}`}
            onClick={() => setZenMode((z) => !z)}
            title="Ẩn con số streak để giảm áp lực"
          >
            <div className="zen-toggle-inner">
              <span className="zen-toggle-icon">{zenMode ? "🧘" : "👁️"}</span>
              <div>
                <div className="zen-toggle-title">
                  Chế độ Tu Tiên Giấu Nghề {zenMode ? "(Đang bật)" : ""}
                </div>
                <div className="zen-toggle-desc">
                  {zenMode
                    ? "Con số ẩn đi — chỉ cần làm, không cần đếm 🌫️"
                    : "Bật để ẩn số ngày streak, giảm áp lực"}
                </div>
              </div>
            </div>
            <div className={`zen-switch ${zenMode ? "on" : ""}`} />
          </button>

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
