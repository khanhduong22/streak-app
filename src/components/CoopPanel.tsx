"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getCoopPartner,
  sendCoopInvite,
  dissolveCoopPartnership,
} from "@/actions/coop-actions";

type CoopPartner = {
  partnerStreak: { id: string; title: string; emoji: string | null; color: string | null; currentStreak: number };
  partnerUser: { name: string | null; email: string; image: string | null } | null;
  partnerCheckedInToday: boolean;
} | null;

export function CoopPanel({
  streakId,
  coopPartnerStreakId,
}: {
  streakId: string;
  coopPartnerStreakId: string | null;
}) {
  const [partner, setPartner] = useState<CoopPartner>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    if (coopPartnerStreakId) {
      getCoopPartner(streakId).then((data) => {
        setPartner(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [streakId, coopPartnerStreakId]);

  function handleInvite() {
    if (!email.includes("@")) return alert("Please enter a valid email address.");
    startTransition(async () => {
      try {
        await sendCoopInvite(streakId, email);
        setInviteSent(true);
        setEmail("");
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  function handleDissolve() {
    if (!confirm("Are you sure you want to end this co-op? Both of you will be unlinked.")) return;
    startTransition(async () => {
      try {
        await dissolveCoopPartnership(streakId);
        setPartner(null);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  if (loading) return <div style={{ padding: 16, color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading...</div>;

  // Has a partner  
  if (partner) {
    const { partnerUser, partnerStreak, partnerCheckedInToday } = partner;
    return (
      <div className="coop-panel" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          🤝 Co-op Partner
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-glass)", padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
          {partnerUser?.image ? (
            <img src={partnerUser.image} alt="Partner" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: partnerStreak.color || "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
              {partnerStreak.emoji || "🔥"}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{partnerUser?.name || partnerUser?.email}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{partnerStreak.emoji} {partnerStreak.title} · {partnerStreak.currentStreak} days</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {partnerCheckedInToday ? (
              <div style={{ fontSize: "1.25rem" }} title="Partner checked in today!">✅</div>
            ) : (
              <div style={{ fontSize: "1.25rem" }} title="Partner hasn't checked in yet today">⏳</div>
            )}
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{partnerCheckedInToday ? "Done!" : "Waiting..."}</div>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
          ⚠️ If either of you misses a day, both streaks break.
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 8, width: "100%", color: "var(--error, #f87171)" }}
          onClick={handleDissolve}
          disabled={isPending}
        >
          Remove Co-op Partner
        </button>
      </div>
    );
  }

  // No partner — show invite form
  return (
    <div className="coop-panel" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        🤝 Co-op Mode
      </div>
      {inviteSent ? (
        <div style={{ fontSize: "0.875rem", color: "#4ade80", textAlign: "center", padding: "10px 0" }}>
          ✅ Invite sent! Waiting for your partner to accept.
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
            Invite a friend to co-op this streak. If either of you misses a day, <strong>both streaks reset</strong>. High-risk, high-reward accountability!
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              className="form-input"
              style={{ flex: 1, padding: "8px 12px", fontSize: "0.875rem" }}
              placeholder="partner@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleInvite}
              disabled={isPending || !email}
            >
              {isPending ? "⏳" : "Invite"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
