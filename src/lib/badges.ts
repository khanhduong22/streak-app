export type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requiredDays: number;
  color: string;
};

export const BADGES: Badge[] = [
  {
    id: "week",
    name: "Week Warrior",
    emoji: "🥉",
    description: "7-day streak",
    requiredDays: 7,
    color: "#cd7f32",
  },
  {
    id: "fortnight",
    name: "Two Weeks Strong",
    emoji: "⚡",
    description: "14-day streak",
    requiredDays: 14,
    color: "#f97316",
  },
  {
    id: "month",
    name: "Month Master",
    emoji: "🥈",
    description: "30-day streak",
    requiredDays: 30,
    color: "#94a3b8",
  },
  {
    id: "sixty",
    name: "Ironclad",
    emoji: "💎",
    description: "60-day streak",
    requiredDays: 60,
    color: "#06b6d4",
  },
  {
    id: "hundred",
    name: "Century Club",
    emoji: "🥇",
    description: "100-day streak",
    requiredDays: 100,
    color: "#f59e0b",
  },
  {
    id: "halfyear",
    name: "Legend",
    emoji: "👑",
    description: "180-day streak",
    requiredDays: 180,
    color: "#a855f7",
  },
  {
    id: "year",
    name: "Mythic",
    emoji: "🌟",
    description: "365-day streak",
    requiredDays: 365,
    color: "#ec4899",
  },
];

export function getEarnedBadges(longestStreak: number): Badge[] {
  return BADGES.filter((b) => longestStreak >= b.requiredDays);
}

export function getNextBadge(longestStreak: number): Badge | null {
  return BADGES.find((b) => longestStreak < b.requiredDays) || null;
}

export function getProgressToNext(longestStreak: number): number {
  const next = getNextBadge(longestStreak);
  if (!next) return 100;
  const prev = BADGES.filter((b) => b.requiredDays <= longestStreak).at(-1);
  const from = prev?.requiredDays ?? 0;
  return Math.round(((longestStreak - from) / (next.requiredDays - from)) * 100);
}
