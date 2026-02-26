"use client";

import {
  getEarnedBadges,
  getNextBadge,
  getProgressToNext,
  BADGES,
} from "@/lib/badges";

export function BadgeDisplay({ longestStreak }: { longestStreak: number }) {
  const earned = getEarnedBadges(longestStreak);
  const next = getNextBadge(longestStreak);
  const progress = getProgressToNext(longestStreak);

  return (
    <div className="badge-section">
      <h3 className="badge-section-title">Badges</h3>

      {/* Badge Grid */}
      <div className="badge-grid">
        {BADGES.map((badge) => {
          const isEarned = longestStreak >= badge.requiredDays;
          return (
            <div
              key={badge.id}
              className={`badge-item ${isEarned ? "earned" : "locked"}`}
              title={badge.description}
              style={
                isEarned
                  ? ({ "--badge-color": badge.color } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="badge-emoji">{isEarned ? badge.emoji : "🔒"}</span>
              <span className="badge-name">{badge.name}</span>
              <span className="badge-req">{badge.requiredDays}d</span>
            </div>
          );
        })}
      </div>

      {/* Next badge progress */}
      {next && (
        <div className="badge-next">
          <div className="badge-next-label">
            <span>
              Next: {next.emoji} <strong>{next.name}</strong>
            </span>
            <span className="badge-next-count">
              {longestStreak}/{next.requiredDays} days
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%`, background: next.color }}
            />
          </div>
        </div>
      )}

      {earned.length === BADGES.length && (
        <p className="badge-complete">🌟 You've unlocked all badges!</p>
      )}
    </div>
  );
}
