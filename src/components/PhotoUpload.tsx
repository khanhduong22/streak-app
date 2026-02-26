"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  streakTitle: string;
  onComplete: (photoUrl: string, aiVerified: boolean, aiReason: string) => void;
  onSkip: () => void;
}

export function PhotoUpload({ streakTitle, onComplete, onSkip }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState<{ verified: boolean; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError(null);
    setAiResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("streakTitle", streakTitle);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setAiResult({ verified: data.aiVerified, reason: data.aiReason });

      // If AI rejected, show error but still allow proceeding
      if (!data.aiVerified) {
        setError(`⚠️ AI says: "${data.aiReason}"`);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    if (!preview) return;
    onComplete(preview, aiResult?.verified ?? false, aiResult?.reason ?? "");
  }

  return (
    <div className="photo-upload-container">
      <div className="photo-upload-header">
        <span className="photo-upload-title">📸 Photo Proof</span>
        <span className="photo-upload-subtitle">Snap a photo to prove you did it!</span>
      </div>

      {!preview ? (
        <div
          className="photo-upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="photo-upload-icon">📷</div>
          <div className="photo-upload-text">Tap to take photo or upload</div>
          <div className="photo-upload-hint">Supports JPG, PNG, HEIC</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="photo-upload-preview-area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Check-in proof" className="photo-upload-preview" />

          {uploading && (
            <div className="photo-upload-status verifying">
              <span className="spinner" />
              🤖 AI verifying your photo...
            </div>
          )}

          {!uploading && aiResult && (
            <div className={`photo-upload-status ${aiResult.verified ? "verified" : "rejected"}`}>
              {aiResult.verified ? "✅ AI Verified!" : "⚠️ Not verified"}
              <span className="photo-upload-reason">{aiResult.reason}</span>
            </div>
          )}

          {error && (
            <div className="photo-upload-error">{error}</div>
          )}
        </div>
      )}

      <div className="photo-upload-actions">
        {preview && !uploading && (
          <>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setPreview(null); setAiResult(null); setError(null); }}
            >
              🔄 Retake
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              style={{ flex: 1 }}
            >
              {aiResult?.verified ? "✅ Submit" : "📤 Submit Anyway"}
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onSkip}>
          Skip Photo
        </button>
      </div>
    </div>
  );
}
