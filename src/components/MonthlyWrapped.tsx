"use client";

import { useState, useEffect, useRef } from "react";

interface WrappedData {
  month: string;
  totalCheckIns: number;
  uniqueDays: number;
  daysInMonth: number;
  consistency: number;
  bestStreak: number;
  strongestDay: string;
  mostConsistentHabit: string;
  percentile: number;
  savedStreaks: number;
  totalHabits: number;
}

interface MonthlyWrappedProps {
  onClose: () => void;
}

export function MonthlyWrapped({ onClose }: MonthlyWrappedProps) {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/wrapped")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!data || loading) return;
    if (step >= stats.length) return;
    const timer = setTimeout(() => setStep((s) => s + 1), 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, step]);

  function getMonthName(monthStr: string) {
    const [y, m] = monthStr.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  }

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 800);
    grad.addColorStop(0, "#12121a");
    grad.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Accent circle
    const circle = ctx.createRadialGradient(400, 300, 0, 400, 300, 350);
    circle.addColorStop(0, "rgba(249,115,22,0.15)");
    circle.addColorStop(1, "transparent");
    ctx.fillStyle = circle;
    ctx.fillRect(0, 0, 800, 800);

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🔥 Streak App — Tháng Tổng Kết", 400, 80);

    ctx.fillStyle = "#f0f0f5";
    ctx.font = "bold 64px Arial";
    ctx.fillText(getMonthName(data.month), 400, 180);

    const items = [
      [`📅 ${data.totalCheckIns} lần check-in`, `Top ${100 - data.percentile}% người dùng`],
      [`🏆 Streak dài nhất: ${data.bestStreak} ngày`, `🌟 Habit xịn nhất: ${data.mostConsistentHabit}`],
      [`💪 Ngày mạnh nhất: ${data.strongestDay}`, `✅ Tỉ lệ: ${data.consistency}%`],
    ];

    let y = 280;
    ctx.font = "28px Arial";
    for (const [left, right] of items) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.roundRect(60, y, 680, 70, 12);
      ctx.fill();
      ctx.fillStyle = "#f0f0f5";
      ctx.textAlign = "left";
      ctx.fillText(left, 90, y + 44);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f97316";
      ctx.fillText(right, 710, y + 44);
      y += 90;
    }

    ctx.fillStyle = "#55556a";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("streakapp.vercel.app", 400, 760);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `streak-wrapped-${data.month}.png`;
    a.click();
  }

  if (loading) return (
    <div className="wrapped-overlay">
      <div className="wrapped-card">
        <div className="wrapped-loading">⏳ Đang tổng kết tháng...</div>
      </div>
    </div>
  );

  if (!data || data.totalCheckIns === 0) return (
    <div className="wrapped-overlay" onClick={onClose}>
      <div className="wrapped-card" onClick={(e) => e.stopPropagation()}>
        <div className="wrapped-empty">
          <div style={{ fontSize: "3rem" }}>😅</div>
          <div>Tháng trước chưa có data để tổng kết.</div>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );

  const stats = [
    { icon: "📅", label: "Tổng lần check-in", value: `${data.totalCheckIns} lần`, sub: `trong ${data.daysInMonth} ngày` },
    { icon: "🏆", label: "Streak dài nhất", value: `${data.bestStreak} ngày`, sub: "liên tiếp" },
    { icon: "💪", label: "Ngày mạnh nhất", value: data.strongestDay, sub: "ngày bạn kiên cường nhất" },
    { icon: "⭐", label: "Habit xuất sắc", value: data.mostConsistentHabit, sub: `${data.totalHabits} habits trong tháng` },
    { icon: "📊", label: "Top người dùng", value: `${data.percentile}%`, sub: `bạn beat ${data.percentile}% người dùng khác` },
    { icon: "✅", label: "Tỉ lệ nhất quán", value: `${data.consistency}%`, sub: `${data.uniqueDays}/${data.daysInMonth} ngày` },
  ];

  return (
    <div className="wrapped-overlay" onClick={onClose}>
      <div className="wrapped-card" onClick={(e) => e.stopPropagation()}>
        <div className="wrapped-header">
          <div className="wrapped-month">{getMonthName(data.month)}</div>
          <div className="wrapped-title">Tháng Tổng Kết 🔥</div>
        </div>

        <div className="wrapped-stats-grid">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`wrapped-stat ${i < step ? "visible" : "hidden"}`}
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="wrapped-stat-icon">{s.icon}</div>
              <div className="wrapped-stat-value">{s.value}</div>
              <div className="wrapped-stat-label">{s.label}</div>
              <div className="wrapped-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="wrapped-actions">
          <button className="btn btn-primary" onClick={handleShare}>
            📤 Tải về & Share
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
