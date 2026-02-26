"use client";

import { useState } from "react";

export function ShareCard({
  streakId,
  streakTitle,
  onClose,
}: {
  streakId: string;
  streakTitle: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ogUrl = `/api/og/streak/${streakId}`;
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/og/streak/${streakId}`
    : ogUrl;

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.origin + `/dashboard`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = ogUrl;
    a.download = `streak-${streakTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function handleTwitter() {
    const text = encodeURIComponent(
      `🔥 Check out my "${streakTitle}" streak! Tracking daily habits with streak-app.`
    );
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">📤 Share Your Streak</h2>

        {/* Preview */}
        <div className="share-preview">
          <img
            src={ogUrl}
            alt="Streak card preview"
            className="share-preview-img"
          />
        </div>

        <div className="form-actions" style={{ flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleDownload}>
            ⬇️ Download Image
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleCopyLink}
            >
              {copied ? "✅ Copied!" : "🔗 Copy Link"}
            </button>
            <button
              className="btn btn-secondary"
              style={{
                flex: 1,
                background: "rgba(29,161,242,0.1)",
                borderColor: "rgba(29,161,242,0.3)",
                color: "#1da1f2",
              }}
              onClick={handleTwitter}
            >
              𝕏 Share
            </button>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
