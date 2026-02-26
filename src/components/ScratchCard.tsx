"use client";

import { useEffect, useRef, useState } from "react";

interface ScratchCardProps {
  onComplete: () => void;
  color?: string;
}

export function ScratchCard({ onComplete, color = "#f97316" }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scratched, setScratched] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawing = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Draw silver scratch overlay
    ctx.fillStyle = "#8a919e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture/shimmer
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(255,255,255,0.3)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(255,255,255,0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text hint
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦ Scratch to Check In ✦", canvas.width / 2, canvas.height / 2);
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function scratch(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    checkCompletionThrottle(canvas);
  }

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function checkCompletionThrottle(canvas: HTMLCanvasElement) {
    if (checkTimeout.current) return;
    checkTimeout.current = setTimeout(() => {
      checkTimeout.current = null;
      checkCompletion(canvas);
    }, 150);
  }

  function checkCompletion(canvas: HTMLCanvasElement) {
    if (completed.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 128) transparent++;
    }
    const totalPixels = (canvas.width * canvas.height);
    const pct = Math.round((transparent / totalPixels) * 100);
    setScratchPercent(pct);

    if (pct >= 60 && !completed.current) {
      completed.current = true;
      setScratched(true);
      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([50, 30, 100, 30, 200]);
      }
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTimeout(() => onComplete(), 400);
    }
  }

  return (
    <div className="scratch-card-wrapper">
      {/* Background reveal */}
      <div className="scratch-card-reveal" style={{ borderColor: color }}>
        {scratched ? (
          <div className="scratch-card-done" style={{ color }}>
            <div className="scratch-card-checkmark">✅</div>
            <div className="scratch-card-done-text">Check-in Unlocked!</div>
          </div>
        ) : (
          <div className="scratch-card-hint">
            <span style={{ fontSize: "2rem" }}>🔥</span>
            <span>Check In</span>
          </div>
        )}
      </div>

      {/* Scratch overlay canvas */}
      {!scratched && (
        <canvas
          ref={canvasRef}
          className="scratch-card-canvas"
          onMouseDown={(e) => { isDrawing.current = true; scratch(...Object.values(getPos(e)) as [number, number]); }}
          onMouseMove={(e) => { if (isDrawing.current) scratch(...Object.values(getPos(e)) as [number, number]); }}
          onMouseUp={() => { isDrawing.current = false; }}
          onMouseLeave={() => { isDrawing.current = false; }}
          onTouchStart={(e) => { e.preventDefault(); isDrawing.current = true; scratch(...Object.values(getPos(e)) as [number, number]); }}
          onTouchMove={(e) => { e.preventDefault(); if (isDrawing.current) scratch(...Object.values(getPos(e)) as [number, number]); }}
          onTouchEnd={() => { isDrawing.current = false; }}
          style={{ touchAction: "none" }}
        />
      )}

      {!scratched && (
        <div className="scratch-card-progress">
          {scratchPercent}% scratched
        </div>
      )}
    </div>
  );
}
