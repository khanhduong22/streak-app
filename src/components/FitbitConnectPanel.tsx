"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getFitbitStatus, disconnectFitbit, setAutoCheckin } from "@/actions/fit-actions";

export function FitbitConnectPanel({
  streakId,
  autoCheckinSource,
  autoCheckinMinMinutes,
  autoCheckinMinSteps,
}: {
  streakId: string;
  autoCheckinSource: "none" | "fitbit";
  autoCheckinMinMinutes: number;
  autoCheckinMinSteps: number;
}) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [autoEnabled, setAutoEnabled] = useState(autoCheckinSource === "fitbit");
  const [minMin, setMinMin] = useState(autoCheckinMinMinutes);
  const [minSteps, setMinSteps] = useState(autoCheckinMinSteps);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getFitbitStatus().then(s => {
      setConnected(s.connected);
      setLoading(false);
    });
  }, []);

  function handleToggleAuto(enabled: boolean) {
    setAutoEnabled(enabled);
    startTransition(async () => {
      await setAutoCheckin(streakId, enabled ? "fitbit" : "none", minMin, minSteps);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleSaveThresholds() {
    startTransition(async () => {
      await setAutoCheckin(streakId, "fitbit", minMin, minSteps);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleDisconnect() {
    if (!confirm("Disconnect Fitbit? All auto check-ins for your streaks will be disabled.")) return;
    startTransition(async () => {
      await disconnectFitbit();
      setConnected(false);
      setAutoEnabled(false);
    });
  }

  if (loading) return <div style={{ padding: 12, color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading...</div>;

  return (
    <div className="fit-panel" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        ⌚ Auto Check-in (Fitbit)
      </div>

      {!connected ? (
        <div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
            Connect Fitbit to auto-check-in this streak when you work out!
          </p>
          <button
            onClick={() => router.push("/api/connect/fitbit")}
            className="btn btn-primary"
            style={{ width: "100%", display: "block", textAlign: "center", background: "#00B0B9", color: "white", border: "none", padding: "10px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
          >
            🔗 Connect Fitbit
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.875rem", color: "#00B0B9", fontWeight: 600 }}>✅ Fitbit Connected</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }} onClick={handleDisconnect} disabled={isPending}>
              Disconnect
            </button>
          </div>

          {/* Toggle auto check-in */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "var(--bg-glass)", padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={e => handleToggleAuto(e.target.checked)}
                disabled={isPending}
                style={{ width: 16, height: 16, accentColor: "#f97316" }}
              />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Auto Check-in for this streak</span>
            </label>
          </div>

          {autoEnabled && (
            <div style={{ background: "var(--bg-glass)", padding: "12px 14px", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>
                Auto check-in triggers if <strong>either</strong> condition is met today:
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>⏱️ Min active minutes</div>
                  <input
                    type="number"
                    className="form-input"
                    value={minMin}
                    min={1}
                    max={120}
                    onChange={e => setMinMin(Number(e.target.value))}
                    style={{ width: "100%", padding: "6px 10px", fontSize: "0.875rem" }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 4 }}>👣 Min steps</div>
                  <input
                    type="number"
                    className="form-input"
                    value={minSteps}
                    min={100}
                    max={20000}
                    step={100}
                    onChange={e => setMinSteps(Number(e.target.value))}
                    style={{ width: "100%", padding: "6px 10px", fontSize: "0.875rem" }}
                  />
                </label>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSaveThresholds}
                disabled={isPending}
                style={{ width: "100%" }}
              >
                {saved ? "✅ Saved!" : isPending ? "Saving..." : "Save Thresholds"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
