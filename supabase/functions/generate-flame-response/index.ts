import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      dayNumber,
      lessonTitle,
      spokeAbout,
      biggestChallenge,
      tomorrowsIntention,
      masterName,
      confidenceRating,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are ${masterName}, an inspiring English language coach from India. Your student ${studentName} just completed Day ${dayNumber} of their English journey: "${lessonTitle}".

Today they spoke about: "${spokeAbout}"

Their biggest challenge was: "${biggestChallenge}"

Their confidence today was ${confidenceRating} out of 5 stars.

Tomorrow they plan to practice: "${tomorrowsIntention}"

Write a personal, warm, encouraging response in 3-4 sentences. Address them by name. Reference exactly what they wrote. End with one specific tip for tomorrow's practice. Write in simple English — they are learning, not experts. Sound like a caring coach, not a robot. Do NOT use markdown, bullet points, or formatting. Plain text only.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a warm, caring English language coach. Respond in plain text only. No markdown." },
            { role: "user", content: prompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse =
      data.choices?.[0]?.message?.content ??
      `${studentName}, you should be proud of today's effort. Every day you practice, you grow stronger. Keep going — tomorrow is another chance to shine. ✦`;

    return new Response(JSON.stringify({ aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-flame-response error:", e);
    const fallback = `You should be proud of today's effort. Every day you practice, you grow stronger. Keep going — tomorrow is another chance to shine. ✦`;
    return new Response(JSON.stringify({ aiResponse: fallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
