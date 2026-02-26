"use client";

import { useState, useEffect, useTransition } from "react";
import { placeStake, claimStakeWin } from "@/actions/stake-actions";
import { getUserStats } from "@/actions/user-actions";

type StakeStatus = "none" | "active" | "won" | "lost";

export function StakePanel({
  streakId,
  targetDays,
  currentStreak,
  stakeAmount,
  stakeStatus,
}: {
  streakId: string;
  targetDays: number | null;
  currentStreak: number;
  stakeAmount: number;
  stakeStatus: StakeStatus;
}) {
  const [coins, setCoins] = useState(0);
  const [amount, setAmount] = useState(100);
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState<StakeStatus>(stakeStatus);
  const [localStake, setLocalStake] = useState(stakeAmount);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    getUserStats().then(d => setCoins(d.coins));
  }, []);

  const payout = Math.floor(localStake * 1.5);
  const progress = targetDays && targetDays > 0 ? Math.min((currentStreak / targetDays) * 100, 100) : 0;
  const goalReached = targetDays ? currentStreak >= targetDays : false;

  function handleStake() {
    if (amount > coins) return alert(`Not enough coins! You have ${coins} 🪙`);
    if (!targetDays) return alert("Set a target goal first!");
    startTransition(async () => {
      try {
        await placeStake(streakId, amount);
        setLocalStatus("active");
        setLocalStake(amount);
        setCoins(c => c - amount);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  function handleClaim() {
    startTransition(async () => {
      try {
        const result = await claimStakeWin(streakId);
        setLocalStatus("won");
        setCoins(c => c + result.payout);
        setClaimed(true);
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <div className="stake-panel" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        🐟 Penalty Stake
      </div>

      {/* No stake yet */}
      {localStatus === "none" && (
        <div>
          {!targetDays ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Set a target day goal first to enable staking.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
                Bet coins on completing your <strong>{targetDays}-day goal</strong>. 
                Win = get <strong>1.5× back</strong>. Break streak = coins burned! 🔥
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Stake:</span>
                {[50, 100, 200, 500].map(preset => (
                  <button
                    key={preset}
                    className={`btn btn-sm ${amount === preset ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setAmount(preset)}
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.875rem" }}
                  value={amount}
                  min={10}
                  max={coins}
                  onChange={e => setAmount(Number(e.target.value))}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleStake}
                  disabled={isPending || amount > coins || amount <= 0}
                >
                  {isPending ? "⏳" : `Stake`}
                </button>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                Your coins: 🪙 {coins} · Potential win: 🪙 {Math.floor(amount * 1.5)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Active stake */}
      {localStatus === "active" && (
        <div>
          <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>🪙 {localStake} at stake</span>
              <span style={{ fontSize: "0.875rem", color: "#4ade80" }}>→ Win 🪙 {payout}</span>
            </div>
            <div style={{ background: "var(--bg-glass)", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #f59e0b, #4ade80)", width: `${progress}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              {currentStreak} / {targetDays} days — {Math.round(progress)}% complete
            </div>
          </div>

          {goalReached ? (
            <button
              className="btn btn-primary"
              style={{ width: "100%", background: "linear-gradient(135deg, #4ade80, #22d3ee)" }}
              onClick={handleClaim}
              disabled={isPending}
            >
              🎉 Claim Winnings (🪙 {payout})
            </button>
          ) : (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
              ⚠️ Break your streak and you lose the stake. Keep going!
            </p>
          )}
        </div>
      )}

      {/* Won */}
      {localStatus === "won" && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: 6 }}>🏆</div>
          <div style={{ fontWeight: 700, color: "#4ade80" }}>
            {claimed ? `You claimed 🪙 ${payout}!` : "Stake won! Claim your reward."}
          </div>
          {!claimed && (
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleClaim} disabled={isPending}>
              Claim 🪙 {payout}
            </button>
          )}
        </div>
      )}

      {/* Lost */}
      {localStatus === "lost" && (
        <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 6 }}>💀</div>
          <div style={{ fontSize: "0.875rem" }}>Your stake was burned. Better luck next time! You can place a new stake.</div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setLocalStatus("none")}
          >
            Stake Again
          </button>
        </div>
      )}
    </div>
  );
}
