"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { ShopModal } from "./ShopModal";
import { getUserStats } from "@/actions/user-actions";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function Header({ user }: { user: User }) {
  const [showShop, setShowShop] = useState(false);
  const [coins, setCoins] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [key, setKey] = useState(0); // force refresh

  useEffect(() => {
    getUserStats().then((data) => {
      setCoins(data.coins);
      setTokens(data.freezeTokens);
    });
  }, [key]);

  // Expose refresh globally so dashboard updates header
  useEffect(() => {
    const handleRefresh = () => setKey((k) => k + 1);
    window.addEventListener("refresh-header-stats", handleRefresh);
    return () => window.removeEventListener("refresh-header-stats", handleRefresh);
  }, []);

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <a href="/dashboard" className="header-logo">
            <span>🔥</span> Streak
          </a>
          <div className="header-user">
            {/* Stats */}
            <div 
              style={{ display: "flex", gap: 12, marginRight: 12, cursor: "pointer", background: "var(--bg-glass)", padding: "4px 12px", borderRadius: 99 }}
              onClick={() => setShowShop(true)}
              title="Open Shop"
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>🪙 {coins}</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>❄️ {tokens}</span>
            </div>

            <span className="header-name">{user.name || user.email}</span>
            {user.image && (
              <img
                src={user.image}
                alt="Avatar"
                className="header-avatar"
                referrerPolicy="no-referrer"
              />
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {showShop && <ShopModal onClose={() => setShowShop(false)} onChange={() => setKey(k => k + 1)} />}
    </>
  );
}
