import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-emoji">🔥</div>
        <h1 className="landing-title">
          Don&apos;t Break
          <br />
          The Chain
        </h1>
        <p className="landing-subtitle">
          Track your daily habits, build consistency, and watch your streaks
          grow. Simple, beautiful, and effective.
        </p>
        <LoginButton />
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">📊</div>
            <span className="landing-feature-text">Track Progress</span>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🗓️</div>
            <span className="landing-feature-text">Calendar View</span>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">🏆</div>
            <span className="landing-feature-text">Personal Best</span>
          </div>
        </div>
      </div>
    </main>
  );
}
