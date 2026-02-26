"use client";

import { useState, useTransition } from "react";
import { createDeathPool, joinDeathPool, getMyPools, getActivePools } from "@/actions/death-pool-actions";

type Pool = Awaited<ReturnType<typeof getMyPools>>[number];
type ActivePool = Awaited<ReturnType<typeof getActivePools>>[number];

interface DeathPoolPageClientProps {
  myPools: Pool[];
  activePools: ActivePool[];
  userCoins: number;
}

export function DeathPoolPageClient({ myPools: initialMyPools, activePools: initialActivePools, userCoins }: DeathPoolPageClientProps) {
  const [myPools, setMyPools] = useState(initialMyPools);
  const [activePools, setActivePools] = useState(initialActivePools);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    stakeAmount: 50,
    endDate: "",
  });

  const myPoolIds = new Set(myPools.map((m) => m.pool.id));

  const today = new Date().toISOString().split("T")[0];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createDeathPool(form);
        setShowCreate(false);
        setForm({ name: "", stakeAmount: 50, endDate: "" });
        // Refresh
        window.location.reload();
      } catch (err: unknown) {
        setError((err as Error).message);
      }
    });
  }

  async function handleJoin(poolId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await joinDeathPool(poolId);
        window.location.reload();
      } catch (err: unknown) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="death-pool-container">
      <div className="death-pool-header">
        <div>
          <h1 className="death-pool-title">💀 Hồ Bơi Sinh Tử</h1>
          <p className="death-pool-subtitle">
            Cọc xu, giữ streak — kẻ bỏ cuộc mất tiền cho người sống sót
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ⚔️ Tạo Pool
        </button>
      </div>

      {error && <div className="death-pool-error">⚠️ {error}</div>}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">⚔️ Tạo Hồ Bơi Sinh Tử</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Tên thử thách</label>
                <input
                  className="form-input"
                  placeholder="VD: Dậy sớm 5h sáng 30 ngày"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cọc xu (bạn có: {userCoins} 🪙)</label>
                <input
                  className="form-input"
                  type="number"
                  min={10}
                  max={userCoins}
                  value={form.stakeAmount}
                  onChange={(e) => setForm({ ...form, stakeAmount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày kết thúc</label>
                <input
                  className="form-input"
                  type="date"
                  min={today}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
              {error && <div className="death-pool-error">{error}</div>}
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "⏳ Đang tạo..." : "🚀 Tạo Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Pools */}
      {myPools.length > 0 && (
        <section>
          <h2 className="death-pool-section-title">📌 Pool của tôi</h2>
          <div className="death-pool-grid">
            {myPools.map(({ pool, memberStatuses, myMembership }) => (
              <div key={pool.id} className={`death-pool-card ${myMembership.isActive ? "active" : "eliminated"}`}>
                <div className="death-pool-card-header">
                  <div className="death-pool-card-name">{pool.name}</div>
                  <div className={`death-pool-badge ${pool.status}`}>{pool.status === "active" ? "🔴 Active" : "✅ Ended"}</div>
                </div>
                <div className="death-pool-card-stake">💀 Cọc: {pool.stakeAmount} 🪙</div>
                <div className="death-pool-card-dates">
                  {pool.startDate} → {pool.endDate}
                </div>
                {!myMembership.isActive && (
                  <div className="death-pool-eliminated-badge">💀 Bạn đã bị loại</div>
                )}
                <div className="death-pool-members">
                  {memberStatuses.map((m) => (
                    <div key={m.userId} className={`death-pool-member ${m.isActive ? "alive" : "dead"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.user?.image || "/default-avatar.png"} alt="" className="death-pool-avatar" onError={(e) => { (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(m.user?.name || "U"); }} />
                      <div className="death-pool-member-status">
                        {m.isActive ? (m.checkedInToday ? "✅" : "⏳") : "💀"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Join public pools */}
      <section>
        <h2 className="death-pool-section-title">🌍 Pool đang mở — Tham gia ngay</h2>
        {activePools.filter((p) => !myPoolIds.has(p.id)).length === 0 ? (
          <div className="death-pool-empty">Chưa có pool nào đang mở. Tạo pool đầu tiên nhé! ⚔️</div>
        ) : (
          <div className="death-pool-grid">
            {activePools
              .filter((p) => !myPoolIds.has(p.id))
              .map((pool) => (
                <div key={pool.id} className="death-pool-card open">
                  <div className="death-pool-card-header">
                    <div className="death-pool-card-name">{pool.name}</div>
                    <div className="death-pool-badge active">🔴 Active</div>
                  </div>
                  <div className="death-pool-card-stake">💀 Cọc: {pool.stakeAmount} 🪙</div>
                  <div className="death-pool-card-dates">{pool.startDate} → {pool.endDate}</div>
                  <div className="death-pool-card-members-count">👥 {pool.members.length} thành viên</div>
                  <button
                    className="btn btn-danger"
                    style={{ width: "100%", marginTop: 12 }}
                    onClick={() => handleJoin(pool.id)}
                    disabled={isPending || userCoins < pool.stakeAmount}
                  >
                    {isPending ? "⏳" : `⚔️ Tham gia — Cọc ${pool.stakeAmount} 🪙`}
                  </button>
                  {userCoins < pool.stakeAmount && (
                    <div className="death-pool-error">Không đủ xu!</div>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
