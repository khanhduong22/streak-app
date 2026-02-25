"use client";

import { signOut } from "next-auth/react";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function Header({ user }: { user: User }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <a href="/dashboard" className="header-logo">
          <span>🔥</span> Streak
        </a>
        <div className="header-user">
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
  );
}
