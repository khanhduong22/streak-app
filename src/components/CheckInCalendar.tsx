"use client";

import { useState, useEffect, useTransition } from "react";
import { getCheckIns } from "@/actions/checkin-actions";

export function CheckInCalendar({
  streakId,
  color,
}: {
  streakId: string;
  color: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [checkInDates, setCheckInDates] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getCheckIns(streakId, year, month);
      setCheckInDates(new Set(data.map((c) => c.checkInDate)));
    });
  }, [streakId, year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const today = new Date().toISOString().split("T")[0];

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
          ◀
        </button>
        <span className="calendar-month">{monthName}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
          ▶
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekdays.map((d) => (
          <span key={d} className="calendar-weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const isActive = checkInDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`calendar-day ${isActive ? "active" : "inactive"} ${
                isToday ? "today" : ""
              }`}
              style={
                isActive
                  ? { background: color, opacity: isPending ? 0.5 : 1 }
                  : undefined
              }
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
