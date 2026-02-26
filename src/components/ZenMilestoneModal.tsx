"use client";

import { useEffect, useRef } from "react";

const MILESTONES = [50, 100, 200, 365, 500, 1000];

interface ZenMilestoneModalProps {
  streakCount: number;
  streakTitle: string;
  onClose: () => void;
}

export function ZenMilestoneModal({ streakCount, streakTitle, onClose }: ZenMilestoneModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const milestone = MILESTONES.find((m) => m === streakCount);

  useEffect(() => {
    let confettiLib: typeof import("canvas-confetti") | null = null;
    let animationFrame: ReturnType<typeof setTimeout>;

    async function startFireworks() {
      const confetti = (await import("canvas-confetti")).default;
      confettiLib = confetti;

      const duration = 3500;
      const end = Date.now() + duration;

      const colors = ["#f97316", "#fbbf24", "#a855f7", "#22d3ee", "#f472b6"];

      function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          animationFrame = setTimeout(frame, 16);
        }
      }

      frame();
    }

    startFireworks();
    return () => {
      clearTimeout(animationFrame);
      // clean up canvas-confetti
      import("canvas-confetti").then((m) => m.default.reset?.());
    };
  }, []);

  if (!milestone) return null;

  const messages: Record<number, { icon: string; title: string; body: string }> = {
    50: {
      icon: "🌟",
      title: `${streakCount} ngày rồi đó!!!`,
      body: "Bí mật lộ rồi 🤫 — bạn đã kiên trì 50 ngày không hề dừng. Điều đó không tầm thường chút nào!",
    },
    100: {
      icon: "💎",
      title: `100 NGÀY. KHÔNG ĐỠ NỔI.`,
      body: "Hầu hết mọi người bỏ cuộc ở tuần đầu. Bạn vừa đạt cột mốc 100 ngày. Bạn không phải hầu hết mọi người 🔥",
    },
    200: {
      icon: "🏆",
      title: `200 ngày — Bậc Thầy Thói Quen!`,
      body: "200 ngày liên tiếp. Đây không còn là thử thách nữa — đây là một phần con người bạn rồi. 🧬",
    },
    365: {
      icon: "🌈",
      title: "MỘT NĂM TRỌN VẸN 🎊",
      body: "365 ngày. Một năm không bỏ lỡ. Bạn vừa hoàn thành thứ mà 99% người khác không dám mơ tới. Huyền thoại!",
    },
    500: {
      icon: "🌌",
      title: "500 ngày — Thiên Thần Thói Quen",
      body: "Bạn đang tiệm cận sự bất diệt 🫡 — 500 ngày không dao động. Kính phục.",
    },
    1000: {
      icon: "⚡",
      title: "1000 NGÀY — HUYỀN THOẠI",
      body: "Không còn gì để nói nữa. Bạn đã vượt qua mọi giới hạn. Đây là lịch sử. 👑",
    },
  };

  const msg = messages[milestone] || {
    icon: "🎉",
    title: `${streakCount} ngày!`,
    body: "Bí mật đã lộ — bạn đã đạt một cột mốc đặc biệt!",
  };

  return (
    <div className="zen-milestone-overlay">
      <div className="zen-milestone-card">
        <div className="zen-milestone-bg-glow" />

        {/* Title streak */}
        <div className="zen-milestone-habit">
          🧘 {streakTitle}
        </div>

        <div className="zen-milestone-icon">{msg.icon}</div>

        <h2 className="zen-milestone-title">{msg.title}</h2>

        <div className="zen-milestone-number">
          <span className="zen-milestone-n">{streakCount}</span>
          <span className="zen-milestone-unit">ngày</span>
        </div>

        <p className="zen-milestone-body">{msg.body}</p>

        <button className="btn btn-primary zen-milestone-btn" onClick={onClose}>
          Hehe ✌️ Tiếp tục tu luyện
        </button>
      </div>
    </div>
  );
}

export function checkIsMilestone(days: number) {
  return MILESTONES.includes(days);
}
