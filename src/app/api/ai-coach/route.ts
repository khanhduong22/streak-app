import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PERSONALITIES = {
  military: {
    name: "Drill Sergeant",
    emoji: "🪖",
    systemPrompt: `You are a brutal military drill sergeant / Gordon Ramsay style coach for a habit tracking app. 
    Be harsh, direct, and intimidating but actually motivating. Use aggressive language, call them out for laziness.
    Keep it under 2 sentences. In Vietnamese or English is fine. Be dramatic and intense.`,
  },
  sweetheart: {
    name: "Người Yêu",
    emoji: "💕",
    systemPrompt: `You are a loving, caring virtual partner/sweetheart for a habit tracking app.
    Be warm, gentle, encouraging and use terms of endearment like "cục cưng", "anh/em". 
    Keep it under 2 sentences. Speak in Vietnamese. Be affectionate and supportive.`,
  },
  stoic: {
    name: "Stoic Philosopher",
    emoji: "🏛️",
    systemPrompt: `You are a Stoic philosopher (Marcus Aurelius, Epictetus, Seneca style) coaching someone on their habits.
    Use deep philosophical wisdom, cite stoic principles about discipline, virtue, and control.
    Keep it under 2 sentences. Mix English and Latin phrases if appropriate. Be profound.`,
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streakTitle, currentStreak, personality, checkedInToday } =
    await req.json();

  const p = PERSONALITIES[personality as keyof typeof PERSONALITIES] || PERSONALITIES.military;

  // Static fallback messages
  const fallbacks = {
    military: [
      "Drop and give me 20! That streak isn't going to maintain itself, soldier! 💪",
      "You think champions take days off?! Get moving before I lose all respect for you! 🪖",
      "That's a pathetic excuse for effort. Now get out there and DOMINATE! 😤",
    ],
    sweetheart: [
      "Cục cưng ơi, hôm nay em nhớ anh lắm đó 🥺 Đừng quên check-in nha!",
      "Anh làm được rồi đó! Em tự hào về anh lắm 💕 Cố lên thêm chút nữa nhé!",
      "Hôm nay mệt không cưng? Dù sao thì em vẫn luôn ở đây ủng hộ anh 🌸",
    ],
    stoic: [
      "\"You have power over your mind, not outside events. Realize this, and you will find strength.\" — Marcus Aurelius 🏛️",
      "Waste no more time arguing about what a good man should be. Be one. Act now. 📜",
      "The obstacle is the way. Your habit is not a burden — it is your path to virtue. 🏺",
    ],
  };

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    const msgs = fallbacks[personality as keyof typeof fallbacks] || fallbacks.military;
    return NextResponse.json({
      message: msgs[Math.floor(Math.random() * msgs.length)],
      personality: p,
    });
  }

  const contextPrompt = checkedInToday
    ? `The user already checked in today for "${streakTitle}" (${currentStreak} day streak). Give them praise/encouragement.`
    : `The user has NOT checked in yet today for "${streakTitle}" (${currentStreak} day streak). Motivate them to do it NOW.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: p.systemPrompt }] },
          contents: [{ parts: [{ text: contextPrompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 1.2 },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini failed");

    const data = await res.json();
    const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!message) throw new Error("Empty response");

    return NextResponse.json({ message, personality: p });
  } catch {
    const msgs = fallbacks[personality as keyof typeof fallbacks] || fallbacks.military;
    return NextResponse.json({
      message: msgs[Math.floor(Math.random() * msgs.length)],
      personality: p,
    });
  }
}
