import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-emoji">🔑</div>
        <h1 className="landing-title">Welcome Back</h1>
        <p className="landing-subtitle">
          Sign in to continue tracking your streaks
        </p>
        <LoginButton />
      </div>
    </main>
  );
}
