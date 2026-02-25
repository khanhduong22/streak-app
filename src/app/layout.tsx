import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streak — Track Your Daily Habits",
  description:
    "Build consistency and track your daily streaks. Never break the chain!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
