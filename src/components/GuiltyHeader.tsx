"use client";

import { useState, useEffect } from "react";

const MESSAGES = {
  morning: {
    range: [5, 11],
    texts: [
      "Chào buổi sáng! Sẵn sàng đập nát mục tiêu hôm nay chưa? 🔥",
      "Bình minh mới, cơ hội mới. Đừng để ngày hôm nay trôi qua vô nghĩa!",
      "Sáng sớm mà đã vào đây check-in — tay nhanh như chớp, xứng danh huyền thoại! ⚡",
    ],
  },
  afternoon: {
    range: [12, 17],
    texts: [
      "Gần hết ngày rồi, đừng có mà lười đấy! 👀",
      "Buổi chiều vàng — check-in ngay trước khi não cá vàng quên mất! 🐠",
      "Ngày vẫn còn dài, streak vẫn đang chờ. Bao giờ thì chịu vào check-in đây? 🤨",
    ],
  },
  evening: {
    range: [18, 21],
    texts: [
      "Tối rồi! Chưa check-in hả? Đừng để streak chết oan ức vậy. 😩",
      "Cơm tối xong rồi, còn quên check-in nữa không? 🍚",
      "Chiều tà rồi bạn ơi, thói quen không tự chạy đâu. Nhấn vào đây nào! 💪",
    ],
  },
  lateNight: {
    range: [22, 4],
    texts: [
      "Wow, tính đi ngủ mà bỏ dở streak thật à? Yếu đuối vậy sao? 😤",
      "Khuya rồi… và streak của bạn đang nhìn bạn với ánh mắt thất vọng. 👀",
      "Còn vài tiếng nữa là mất streak rồi đó. Bấm vào đây ngay! 🚨",
    ],
  },
};

function getHourCategory(hour: number) {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 21) return "evening";
  return "lateNight";
}

interface GuiltyHeaderProps {
  hasUncheckedStreaks: boolean;
  longestActiveStreak: number;
}

export function GuiltyHeader({ hasUncheckedStreaks, longestActiveStreak }: GuiltyHeaderProps) {
  const [hour, setHour] = useState(new Date().getHours());
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setHour(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  const category = getHourCategory(hour);
  const isLateNightGuilty = category === "lateNight" && hasUncheckedStreaks;
  const msgs = MESSAGES[category].texts;
  const message = msgs[msgIndex % msgs.length];

  // Cycle messages every 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setMsgIndex((i) => i + 1), 8000);
    return () => clearTimeout(t);
  }, [msgIndex]);

  // Late night with unchecked streaks → red danger mode
  const dangerMode = isLateNightGuilty;

  return (
    <div className={`guilty-header ${dangerMode ? "danger" : category}`}>
      <span className="guilty-header-text">
        {dangerMode && longestActiveStreak > 0
          ? `Wow, tính đi ngủ mà bỏ dở streak ${longestActiveStreak} ngày thật à? Yếu đuối vậy sao? 😤`
          : message}
      </span>
      {dangerMode && <span className="guilty-header-pulse" />}
    </div>
  );
}
