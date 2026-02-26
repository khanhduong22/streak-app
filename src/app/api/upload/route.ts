import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const streakTitle = formData.get("streakTitle") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Optional AI verification via Gemini Vision
    let aiVerified = false;
    let aiReason = "No verification";

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && streakTitle) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are verifying a habit check-in photo. The user's habit is: "${streakTitle}". 
                      Look at this image and determine if it genuinely shows evidence of completing this habit (e.g., gym equipment, workout, food, book, etc.). 
                      Respond with ONLY a JSON object: {"valid": true/false, "reason": "brief one-sentence reason"}`,
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiVerified = parsed.valid === true;
            aiReason = parsed.reason || "Verified";
          }
        }
      } catch {
        // AI verification failed, continue without it
        aiVerified = true;
        aiReason = "Auto-approved (AI unavailable)";
      }
    } else {
      // No API key, auto-approve
      aiVerified = true;
      aiReason = "Auto-approved";
    }

    return NextResponse.json({
      photoUrl: dataUrl,
      aiVerified,
      aiReason,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
