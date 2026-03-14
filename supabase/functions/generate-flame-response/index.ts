import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
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
      streak_count,
      word_clarity_score,
      smoothness_score,
      natural_sound_score,
      top_error_summary,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const FLAME_MASTER_PROMPT = Deno.env.get("FLAME_MASTER_PROMPT") || `You are a warm, caring English language coach. Respond in plain text only. No markdown.`;

    const prompt = `LANGUAGE RULE — MANDATORY:
Write in simple English only. Max level: B1.
Students are A0-A2 beginners.
Zero technical linguistic terms.
If explaining grammar: use plain words a 14-year-old understands immediately.

Your student ${studentName} just completed Day ${dayNumber} of their English journey: "${lessonTitle || "today's lesson"}".

Today they spoke about: "${spokeAbout || "their lesson"}"
Their biggest challenge was: "${biggestChallenge || "general practice"}"
Their confidence today was ${confidenceRating || 3} out of 5 stars.
Tomorrow they plan to practice: "${tomorrowsIntention || "continue learning"}"
${streak_count ? `They are on a ${streak_count}-day streak!` : ""}
${word_clarity_score ? `Their pronunciation scores: Word Clarity ${word_clarity_score}/100, Smoothness ${smoothness_score}/100, Natural Sound ${natural_sound_score}/100.` : ""}
${top_error_summary ? `Main area to improve: ${top_error_summary}` : ""}

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
            { role: "system", content: FLAME_MASTER_PROMPT },
            { role: "user", content: prompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
