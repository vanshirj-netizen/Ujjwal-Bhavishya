import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_FLAME_PROMPT = `You are a warm, caring English language coach giving a deeply personal end-of-day reflection. Respond in plain text only. No markdown. Max B1 vocabulary.`;

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
  const userId = claimsData.claims.sub as string;

  try {
    const {
      userId: bodyUserId,
      courseId,
      dayNumber,
      masterName,
      confidenceRating,
      manthanQuestion,
      manthanAnswer,
      compositeScore,
      recapPoint1,
      recapPoint2,
      recapPoint3,
      // Legacy fields (kept for backward compat)
      studentName,
      lessonTitle,
      spokeAbout,
      biggestChallenge,
      tomorrowsIntention,
      streak_count,
      word_clarity_score,
      smoothness_score,
      natural_sound_score,
      top_error_summary,
      written_sentences,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    const effectiveUserId = userId; // Always use JWT-verified identity, never trust body
    const effectiveCourseId = courseId || "6a860163-ea3c-4205-89b3-74a3e9be098f";
    const effectiveMasterName = masterName || "Gyani";

    // 1. Fetch personality
    const { data: personality } = await supabaseAdmin
      .from("ai_personalities")
      .select("personality_prompt")
      .eq("master_name", effectiveMasterName)
      .eq("context", "flame")
      .limit(1)
      .maybeSingle();

    const systemPrompt = personality?.personality_prompt || FALLBACK_FLAME_PROMPT;

    // 2. Fetch student profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, selected_master")
      .eq("id", effectiveUserId)
      .single();

    const firstName = studentName || profile?.full_name?.split(" ")[0] || "Friend";

    // 3. Fetch student_progress
    const { data: sp } = await supabaseAdmin
      .from("student_progress")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("course_id", effectiveCourseId)
      .maybeSingle();

    // 4. Fetch last 7 sessions
    const { data: recentSessions } = await supabaseAdmin
      .from("practice_sessions")
      .select("day_number, composite_score, top_error_summary, submitted_at")
      .eq("user_id", effectiveUserId)
      .eq("course_id", effectiveCourseId)
      .eq("status", "complete")
      .eq("is_best_attempt", true)
      .order("submitted_at", { ascending: false })
      .limit(7);

    // Also fetch matching reflection confidence ratings
    const recentDays = recentSessions?.map(s => s.day_number) ?? [];
    let recentReflections: any[] = [];
    if (recentDays.length > 0) {
      const { data: refs } = await supabaseAdmin
        .from("reflection_sessions")
        .select("day_number, confidence_rating")
        .eq("user_id", effectiveUserId)
        .eq("course_id", effectiveCourseId)
        .in("day_number", recentDays);
      recentReflections = refs ?? [];
    }

    // 5. Calculate gap
    const effectiveComposite = compositeScore ?? sp?.latest_session_score ?? 50;
    const effectiveConfidence = confidenceRating ?? 3;
    const feltScore = (effectiveConfidence / 5) * 100;
    const gap = effectiveComposite - feltScore;
    let gapContext = "score and confidence are aligned";
    if (gap > 15) gapContext = "performed better than felt";
    else if (gap < -15) gapContext = "felt more confident than scored";

    // Build history block
    const historyLines = recentSessions?.map(s => {
      const ref = recentReflections.find(r => r.day_number === s.day_number);
      return `Day ${s.day_number} | Score: ${s.composite_score ?? "?"}/100 | Confidence: ${ref?.confidence_rating ?? "?"}/5 | Error: ${s.top_error_summary || "none"}`;
    }).join("\n") || "No previous history.";

    // Build progress summary
    const progressSummary = sp
      ? `Sessions completed: ${sp.total_sessions_completed ?? 0}, Days practiced: ${sp.total_days_practiced ?? 0}, Current streak: ${sp.current_streak ?? 0}, Best score: ${sp.best_score_ever ?? "?"}/100, Score trend: ${sp.score_trend ?? "unknown"}`
      : "First session — no previous data.";

    // 6. Build prompt — supports both new (manthan) and legacy (spokeAbout) inputs
    let userContent: string;

    if (manthanQuestion || manthanAnswer) {
      // New flow
      userContent = `LANGUAGE RULE — MANDATORY:
Write in simple English only. Max level: B1.
Students are A0-A2 beginners.
Zero technical linguistic terms.

STUDENT: ${firstName}
DAY: ${dayNumber}
TODAY'S SCORE: ${effectiveComposite}/100
CONFIDENCE: ${effectiveConfidence}/5
FELT SCORE: ${Math.round(feltScore)}/100
GAP: ${gap > 0 ? "+" : ""}${Math.round(gap)} — ${gapContext}

STUDENT'S MANTHAN (REFLECTION):
What they reflected on: ${manthanAnswer || "not provided"}
Their 3 key takeaways from today:
  1. ${recapPoint1 || "not provided"}
  2. ${recapPoint2 || "not provided"}
  3. ${recapPoint3 || "not provided"}
Confidence rating (1-5 stars): ${effectiveConfidence}

MANTHAN QUESTION: ${manthanQuestion || "N/A"}
STUDENT ANSWER: ${manthanAnswer || "N/A"}

PROGRESS SUMMARY: ${progressSummary}

HISTORY (last 7):
${historyLines}

Write a personal, warm, encouraging response in 3-5 sentences. Address them by name. Reference their manthan answer thoughtfully. If there's a gap between confidence and score, gently acknowledge it. End with specific encouragement for tomorrow. Plain text only. No markdown.`;
    } else {
      // Legacy flow
      userContent = `LANGUAGE RULE — MANDATORY:
Write in simple English only. Max level: B1.
Students are A0-A2 beginners.
Zero technical linguistic terms.

Your student ${firstName} just completed Day ${dayNumber} of their English journey: "${lessonTitle || "today's lesson"}".

Today they spoke about: "${spokeAbout || "their lesson"}"
Their biggest challenge was: "${biggestChallenge || "general practice"}"
Their confidence today was ${effectiveConfidence} out of 5 stars.
Tomorrow they plan to practice: "${tomorrowsIntention || "continue learning"}"
${written_sentences ? `They wrote these sentences: "${written_sentences}"` : ""}
${streak_count ? `They are on a ${streak_count}-day streak!` : ""}
${word_clarity_score ? `Their pronunciation scores: Word Clarity ${word_clarity_score}/100, Smoothness ${smoothness_score}/100, Natural Sound ${natural_sound_score}/100.` : ""}
${top_error_summary ? `Main area to improve: ${top_error_summary}` : ""}

PROGRESS SUMMARY: ${progressSummary}

Write a personal, warm, encouraging response in 3-4 sentences. Address them by name. Reference what they spoke about and what was difficult for them. End with one specific tip for tomorrow based on what they plan to say. Plain text only.`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
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
      `${firstName}, you should be proud of today's effort. Every day you practice, you grow stronger. Keep going — tomorrow is another chance to shine. ✦`;

    // 7. Upsert reflection_sessions if courseId and dayNumber provided
    if (dayNumber && effectiveCourseId) {
      try {
        // Check if exists
        const { data: existing } = await supabaseAdmin
          .from("reflection_sessions")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("day_number", dayNumber)
          .eq("course_id", effectiveCourseId)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin.from("reflection_sessions").update({
            ai_response: aiResponse,
            composite_score: effectiveComposite,
            ai_generated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        }
      } catch (e) {
        console.error("Failed to update reflection_sessions:", e);
      }
    }

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
