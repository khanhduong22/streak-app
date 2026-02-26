"use client";

import { useEffect, useState, useCallback } from "react";
import { updateCoachPersonality } from "@/actions/user-actions";

type Personality = "military" | "sweetheart" | "stoic";

interface AICoachPanelProps {
  streaks: Array<{ title: string; currentStreak: number; lastCheckIn: string | null }>;
  initialPersonality: Personality;
  userId: string;
}

const PERSONALITY_LABELS: Record<Personality, { label: string; emoji: string }> = {
  military: { label: "Drill Sergeant", emoji: "🪖" },
  sweetheart: { label: "Người Yêu", emoji: "💕" },
  stoic: { label: "Stoic", emoji: "🏛️" },
};

export function AICoachPanel({ streaks, initialPersonality, userId }: AICoachPanelProps) {
  const [personality, setPersonality] = useState<Personality>(initialPersonality);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const [open, setOpen] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const primaryStreak = streaks[0];
  const checkedInToday = primaryStreak?.lastCheckIn === today;

  const fetchMessage = useCallback(async (p: Personality) => {
    if (!primaryStreak) return;
    setLoading(true);
    setDisplayed("");
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streakTitle: primaryStreak.title,
          currentStreak: primaryStreak.currentStreak,
          personality: p,
          checkedInToday,
        }),
      });
      const data = await res.json();
      setMessage(data.message || "Stay focused!");
    } catch {
      setMessage("Keep going. Every day counts. 💪");
    } finally {
      setLoading(false);
    }
  }, [primaryStreak, checkedInToday]);

  // Typewriter effect
  useEffect(() => {
    if (!message) return;
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(message.slice(0, i + 1));
      i++;
      if (i >= message.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [message]);

  useEffect(() => {
    fetchMessage(personality);
  }, [personality, fetchMessage]);

  async function handlePersonalityChange(p: Personality) {
    setPersonality(p);
    await updateCoachPersonality(p);
  }

  if (!primaryStreak) return null;

  return (
    <div className={`ai-coach-panel ${personality}`}>
      <div className="ai-coach-header">
        <div className="ai-coach-title">
          <span>{PERSONALITY_LABELS[personality].emoji}</span>
          <span>AI Coach — {PERSONALITY_LABELS[personality].label}</span>
        </div>
        <div className="ai-coach-controls">
          <div className="ai-coach-selector">
            {(Object.keys(PERSONALITY_LABELS) as Personality[]).map((p) => (
              <button
                key={p}
                className={`ai-coach-mode-btn ${personality === p ? "active" : ""}`}
                onClick={() => handlePersonalityChange(p)}
                title={PERSONALITY_LABELS[p].label}
              >
                {PERSONALITY_LABELS[p].emoji}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchMessage(personality)} title="Refresh">
            🔄
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} title="Toggle">
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {open && (
        <div className="ai-coach-message">
          {loading ? (
            <div className="ai-coach-loading">
              <span className="dot-pulse" />
              <span className="dot-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="dot-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          ) : (
            <p>{displayed}<span className="cursor-blink">|</span></p>
          )}
        </div>
      )}
    </div>
  );
}
