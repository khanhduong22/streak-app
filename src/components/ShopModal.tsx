"use client";

import { useState, useEffect, useTransition } from "react";
import { getUserStats, buyFreezeToken } from "@/actions/user-actions";

export function ShopModal({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [coins, setCoins] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const PRICE = 100;

  useEffect(() => {
    getUserStats()
      .then((data) => {
        setCoins(data.coins);
        setTokens(data.freezeTokens);
        setLoading(false);
      })
      .catch((e) => {
        alert(e.message);
        setLoading(false);
      });
  }, []);

  function handleBuy() {
    startTransition(async () => {
      try {
        await buyFreezeToken();
        setCoins((c) => c - PRICE);
        setTokens((t) => t + 1);
        if (onChange) onChange();
      } catch (e: unknown) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>🛒 Shop</h2>
          {loading ? null : (
            <div style={{ display: "flex", gap: 16, fontSize: "1.1rem", fontWeight: 600 }}>
              <span title="Coins">🪙 {coins}</span>
              <span title="Freeze Tokens">❄️ {tokens}</span>
            </div>
          )}
        </div>

        <div className="shop-item">
          <div className="shop-item-icon">❄️</div>
          <div className="shop-item-info">
            <h3 className="shop-item-title">Streak Freeze</h3>
            <p className="shop-item-desc">
              Missed a day? A Streak Freeze will automatically protect your streak from resetting. 
              Keep checking in to earn more coins!
            </p>
          </div>
          <div className="shop-item-action">
            <button
              className="btn btn-primary"
              onClick={handleBuy}
              disabled={isPending || loading || coins < PRICE}
            >
              🪙 {PRICE}
            </button>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 32 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
