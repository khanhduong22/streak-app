"use client";

import { useState, useEffect, useTransition } from "react";
import { getPendingInvites, acceptCoopInvite, rejectCoopInvite } from "@/actions/coop-actions";
import { getStreaks } from "@/actions/streak-actions";

type Invite = {
  id: string;
  fromUser: { name: string | null; email: string; image: string | null } | null;
  fromStreak: { title: string; emoji: string | null; color: string | null } | null;
};

export function CoopInviteBar() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [myStreaks, setMyStreaks] = useState<{ id: string; title: string; emoji: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null); // which invite is being processed
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([getPendingInvites(), getStreaks()]).then(([inv, streaks]) => {
      setInvites(inv as Invite[]);
      setMyStreaks(streaks.map(s => ({ id: s.id, title: s.title, emoji: s.emoji })));
      setLoading(false);
    });
  }, []);

  function handleAccept(inviteId: string, myStreakId: string) {
    startTransition(async () => {
      try {
        await acceptCoopInvite(inviteId, myStreakId);
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        setAccepting(null);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  function handleReject(inviteId: string) {
    startTransition(async () => {
      try {
        await rejectCoopInvite(inviteId);
        setInvites(prev => prev.filter(i => i.id !== inviteId));
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  if (loading || invites.length === 0) return null;

  return (
    <div style={{ 
      marginBottom: 24, 
      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))",
      border: "1px solid rgba(99, 102, 241, 0.3)",
      borderRadius: "var(--radius-lg)",
      padding: "16px 20px"
    }}>
      <div style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: 12, color: "#a78bfa" }}>
        🤝 Co-op Invites ({invites.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invites.map((invite) => (
          <div key={invite.id} style={{ background: "var(--bg-glass)", padding: "12px 16px", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: accepting === invite.id ? 12 : 0 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{invite.fromUser?.name || invite.fromUser?.email}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}> wants to co-op </span>
                <strong>{invite.fromStreak?.emoji} {invite.fromStreak?.title}</strong>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}> with you</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => setAccepting(accepting === invite.id ? null : invite.id)}
                  disabled={isPending}
                >
                  Accept
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => handleReject(invite.id)}
                  disabled={isPending}
                >
                  ✕
                </button>
              </div>
            </div>

            {accepting === invite.id && (
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  Which of your streaks will pair with theirs?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {myStreaks.map(s => (
                    <button
                      key={s.id}
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => handleAccept(invite.id, s.id)}
                      disabled={isPending}
                    >
                      {s.emoji} {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
