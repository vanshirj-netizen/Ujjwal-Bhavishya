import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getAudioMimeType(path: string): string {
  const p = path.toLowerCase();
  if (p.endsWith(".mp4") || p.endsWith(".m4a")) return "audio/mp4";
  return "audio/webm";
}

function normalizeScore(score: number): number {
  if (score === null || score === undefined) return 50;
  if (score <= 1.0 && score >= 0) return Math.round(score * 100);
  return Math.round(Math.min(100, Math.max(0, score)));
}

function stripVoiceCues(text: string): string {
  return text
    .replace(/\[PAUSE\]/gi, '...')
    .replace(/\[LONG PAUSE\]/gi, '...')
    .replace(/\[BEAT\]/gi, '.')
    .replace(/\[SIGH\]/gi, '')
    .replace(/\[SOFT\]/gi, '')
    .replace(/\[WARM\]/gi, '')
    .replace(/\[SLOW\]/gi, '')
    .replace(/\[DIRECT\]/gi, '')
    .replace(/\[DRY\]/gi, '')
    .replace(/\[MIC DROP\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || !LOVABLE_API_KEY.trim()) {
    console.error("[anubhav-evaluate] Missing LOVABLE_API_KEY");
    return new Response(
      JSON.stringify({ error: "Missing required secret: LOVABLE_API_KEY", step: "startup_validation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
  const authUserId = claimsData.claims.sub as string;

  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

  // Parse request body
  const {
    userId: bodyUserId,
    masterName,
    firstName,
    courseId,
    dayNumber,
    attemptNumber,
    selectedWorld,
    writingRecordings,
    worldRecordings,
    sessionHistory,
    progressSummary,
    lessonTitle,
    grammarPattern,
    mtiZone,
    motherTongue,
  } = await req.json();

  const userId = authUserId; // Always use JWT-verified identity, never trust body
  const effectiveCourseId = courseId || "6a860163-ea3c-4205-89b3-74a3e9be098f";
  const effectiveMasterName = (masterName ?? "gyani").toLowerCase();
  const effectiveAttempt = attemptNumber ?? 1;
  const effectiveFirstName = firstName || "Friend";

  // Fallback response used on any error
  const fallbackResult = {
    wordClarityScore: 50,
    smoothnessScore: 50,
    naturalSoundScore: 50,
    compositeScore: 50,
    mastermessage: "You showed up and practiced. That is the foundation.",
    mastermessagevoice: "You showed up and practiced. PAUSE That is the foundation.",
    mastermessageaudiourl: null as string | null,
    topErrorSummary: "",
    wordErrors: [] as any[],
    writingChecks: [] as any[],
  };

  // Safety: always mark complete even on error
  const safeMarkComplete = async () => {
    try {
      // Upsert practice_sessions - find existing in_progress or create
      const { data: existingSession } = await supabaseAdmin
        .from("practice_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", effectiveCourseId)
        .eq("day_number", dayNumber)
        .eq("attempt_number", effectiveAttempt)
        .eq("status", "in_progress")
        .maybeSingle();

      if (existingSession) {
        await supabaseAdmin.from("practice_sessions").update({
          status: "complete",
          submitted_at: new Date().toISOString(),
        }).eq("id", existingSession.id);
      }

      // Upsert progress
      const { data: progressRow } = await supabaseAdmin.from("progress")
        .select("id").eq("user_id", userId).eq("day_number", dayNumber).maybeSingle();
      if (progressRow) {
        await supabaseAdmin.from("progress").update({ anubhav_complete: true }).eq("id", progressRow.id);
      } else {
        await supabaseAdmin.from("progress").insert({ user_id: userId, day_number: dayNumber, course_id: effectiveCourseId, anubhav_complete: true });
      }
    } catch (e) {
      console.error("[anubhav-evaluate] safeMarkComplete error:", e);
    }
  };

  try {
    console.log("[anubhav-evaluate] Start: userId:", userId, "day:", dayNumber, "attempt:", effectiveAttempt);

    // 1. Fetch personality from DB
    const { data: personalityData } = await supabaseAdmin
      .from("ai_personalities")
      .select("personality_prompt")
      .eq("master_name", effectiveMasterName)
      .eq("context", "anubhav")
      .limit(1)
      .maybeSingle();

    const systemPrompt = personalityData?.personality_prompt
      ?? "You are a helpful English coach. Evaluate the student with care and precision.";

    // 2. Download audio files from writingRecordings and worldRecordings
    const audioBuffers: { base64: string; mime: string; label: string }[] = [];
    const allRecordings = [
      ...(writingRecordings ?? []).map((r: any, i: number) => ({ ...r, label: `writing_${i}` })),
      ...(worldRecordings ?? []).map((r: any, i: number) => ({ ...r, label: `world_${i}` })),
    ];

    // Build written text from writingRecordings
    const writtenSentences = (writingRecordings ?? []).map((r: any) => r.sentence).filter(Boolean);

    await Promise.all(
      allRecordings.map(async (rec: any) => {
        if (!rec.audioPath) return;
        try {
          const { data, error } = await supabaseAdmin.storage
            .from("anubhav-audio")
            .download(rec.audioPath);
          if (data && !error) {
            const buf = await data.arrayBuffer();
            if (buf.byteLength >= 500) {
              audioBuffers.push({
                base64: bufferToBase64(buf),
                mime: getAudioMimeType(rec.audioPath),
                label: rec.label,
              });
            }
          }
        } catch (e) {
          console.error("[anubhav-evaluate] Audio download error for", rec.audioPath, e);
        }
      })
    );

    console.log("[anubhav-evaluate] Downloaded", audioBuffers.length, "audio files");

    // 3. Gemini Call 1: Audio evaluation
    let avgWordClarity = 50;
    let avgSmoothness = 50;
    let avgNaturalSound = 50;
    let audioWordErrors: any[] = [];
    let audioEvalFailed = true;

    if (audioBuffers.length > 0) {
      try {
        const contentParts: any[] = [];
        contentParts.push({
          type: "text",
          text: `You are an English pronunciation evaluator for Indian students.
Student MTI Zone: ${mtiZone || "urban_neutral"}
Mother Tongue: ${motherTongue || "Hindi"}
Reference sentences: "${writtenSentences.join('. ')}"
There are ${audioBuffers.length} audio recordings. Evaluate all of them together.
Score using integers from 0 to 100 (not decimals). Max 3 word errors total.`,
        });

        for (const ab of audioBuffers) {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${ab.mime};base64,${ab.base64}` },
          });
        }

        const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: contentParts }],
            tools: [{
              type: "function",
              function: {
                name: "evaluate_audio",
                description: "Return structured pronunciation evaluation.",
                parameters: {
                  type: "object",
                  properties: {
                    wordClarityScore: { type: "number" },
                    smoothnessScore: { type: "number" },
                    naturalSoundScore: { type: "number" },
                    wordErrors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          word: { type: "string" },
                          heardAs: { type: "string" },
                          correction: { type: "string" },
                          example: { type: "string" },
                        },
                        required: ["word", "heardAs", "correction", "example"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["wordClarityScore", "smoothnessScore", "naturalSoundScore", "wordErrors"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "evaluate_audio" } },
            temperature: 0.3,
            max_tokens: 1200,
            stream: false,
          }),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const toolCall = geminiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            avgWordClarity = normalizeScore(parsed.wordClarityScore);
            avgSmoothness = normalizeScore(parsed.smoothnessScore);
            avgNaturalSound = normalizeScore(parsed.naturalSoundScore);
            audioWordErrors = (parsed.wordErrors || []).slice(0, 3);
            audioEvalFailed = false;
          }
        } else {
          console.error("[anubhav-evaluate] Gemini audio eval error:", geminiResponse.status);
        }
      } catch (e) {
        console.error("[anubhav-evaluate] Gemini audio eval exception:", e);
      }
    }

    const compositeScore = Math.round(
      (avgWordClarity * 0.4) + (avgSmoothness * 0.35) + (avgNaturalSound * 0.25)
    );

    // 4. Gemini Call 2: Feedback with personality
    let mastermessage = fallbackResult.mastermessage;
    let mastermessagevoice = fallbackResult.mastermessagevoice;
    let topErrorSummary = "";
    let wordErrors = audioWordErrors;
    let writingChecks: any[] = [];

    try {
      const userPrompt = `
STUDENT: ${effectiveFirstName}
DAY: ${dayNumber} of 60
ATTEMPT: ${effectiveAttempt} today
MASTER: ${masterName}
SELECTED WORLD: ${selectedWorld} (professional / casual / both)
MTI ZONE: ${mtiZone}
MOTHER TONGUE: ${motherTongue}
LESSON: ${lessonTitle}
GRAMMAR FOCUS: ${grammarPattern ?? 'not specified'}

WRITING RECORDINGS (what they wrote + spoke per sentence):
${JSON.stringify(writingRecordings ?? [])}

WORLD RECORDINGS (target sentences + their recording):
${JSON.stringify(worldRecordings ?? [])}

PRONUNCIATION SCORES:
- Word Clarity: ${avgWordClarity}/100
- Smoothness: ${avgSmoothness}/100
- Natural Sound: ${avgNaturalSound}/100
- Composite: ${compositeScore}/100

WORD ERRORS FROM AUDIO EVAL:
${JSON.stringify(audioWordErrors)}

SESSION HISTORY (last 5 sessions, newest first):
${JSON.stringify(sessionHistory ?? [])}

PROGRESS SUMMARY:
${JSON.stringify(progressSummary ?? {})}
`;

      const feedbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "evaluate_practice",
              description: "Return structured evaluation of the student's practice session.",
              parameters: {
                type: "object",
                properties: {
                  mastermessage: { type: "string", description: "Plain text feedback for display, max 100 words" },
                  mastermessagevoice: { type: "string", description: "Same content with UB voice cues like [PAUSE] for ElevenLabs" },
                  topErrorSummary: { type: "string", description: "1 line plain text summary of main issue" },
                  wordErrors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string" },
                        heardAs: { type: "string" },
                        correction: { type: "string", description: "UB Pronunciation Code format e.g. VE-ry" },
                        example: { type: "string", description: "Full sentence using this word" },
                      },
                      required: ["word", "heardAs", "correction", "example"],
                      additionalProperties: false,
                    },
                  },
                  writingChecks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sentence: { type: "string" },
                        issue: { type: "string" },
                        fix: { type: "string" },
                      },
                      required: ["sentence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["mastermessage", "mastermessagevoice", "topErrorSummary", "wordErrors", "writingChecks"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "evaluate_practice" } },
          temperature: 0.7,
          max_tokens: 1200,
          stream: false,
        }),
      });

      if (feedbackResponse.ok) {
        const fbData = await feedbackResponse.json();
        const toolCall = fbData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          mastermessage = parsed.mastermessage || mastermessage;
          mastermessagevoice = parsed.mastermessagevoice || mastermessage;
          topErrorSummary = parsed.topErrorSummary || "";
          if (parsed.wordErrors?.length > 0) wordErrors = parsed.wordErrors;
          writingChecks = parsed.writingChecks || [];
        }
      } else {
        console.error("[anubhav-evaluate] Feedback Gemini error:", feedbackResponse.status);
      }
    } catch (e) {
      console.error("[anubhav-evaluate] Feedback error:", e);
    }

    // 5. ElevenLabs voice generation
    let masterAudioUrl: string | null = null;
    try {
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      const voiceId = effectiveMasterName === "gyanu"
        ? Deno.env.get("GYANU_VOICE_ID")
        : Deno.env.get("GYANI_VOICE_ID");

      if (ELEVENLABS_API_KEY && voiceId) {
        const elevenLabsText = stripVoiceCues(mastermessagevoice);

        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: elevenLabsText,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const audioBytes = new Uint8Array(audioBuffer);
          const storagePath = `${userId}/${dayNumber}/master_${effectiveAttempt}.mp3`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from("anubhav-audio")
            .upload(storagePath, audioBytes, {
              upsert: true,
              contentType: "audio/mpeg",
            });

          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from("anubhav-audio")
              .getPublicUrl(storagePath);
            masterAudioUrl = urlData?.publicUrl || null;
          } else {
            console.error("[anubhav-evaluate] Audio upload error:", uploadError);
          }
        } else {
          console.error("[anubhav-evaluate] ElevenLabs error:", ttsResponse.status);
        }
      }
    } catch (e) {
      console.error("[anubhav-evaluate] ElevenLabs error:", e);
    }

    // 6. Save to practice_sessions
    const { data: existingSession } = await supabaseAdmin
      .from("practice_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", effectiveCourseId)
      .eq("day_number", dayNumber)
      .eq("attempt_number", effectiveAttempt)
      .maybeSingle();

    const sessionPayload = {
      user_id: userId,
      course_id: effectiveCourseId,
      day_number: dayNumber,
      status: "complete",
      word_clarity_score: avgWordClarity,
      smoothness_score: avgSmoothness,
      natural_sound_score: avgNaturalSound,
      composite_score: compositeScore,
      master_message: mastermessage,
      master_message_voice: mastermessagevoice,
      master_message_audio_url: masterAudioUrl,
      top_error_summary: topErrorSummary,
      word_errors: wordErrors,
      writing_checks: writingChecks,
      writing_recordings: writingRecordings ?? [],
      world_recordings: worldRecordings ?? [],
      selected_world: selectedWorld,
      attempt_number: effectiveAttempt,
      is_best_attempt: false,
      submitted_at: new Date().toISOString(),
    };

    if (existingSession) {
      await supabaseAdmin.from("practice_sessions")
        .update(sessionPayload)
        .eq("id", existingSession.id);
    } else {
      await supabaseAdmin.from("practice_sessions")
        .insert(sessionPayload);
    }

    // Update is_best_attempt
    await supabaseAdmin.from("practice_sessions")
      .update({ is_best_attempt: false })
      .eq("user_id", userId)
      .eq("course_id", effectiveCourseId)
      .eq("day_number", dayNumber)
      .eq("status", "complete");

    const { data: bestAttempt } = await supabaseAdmin
      .from("practice_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", effectiveCourseId)
      .eq("day_number", dayNumber)
      .eq("status", "complete")
      .not("composite_score", "is", null)
      .order("composite_score", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bestAttempt) {
      await supabaseAdmin.from("practice_sessions")
        .update({ is_best_attempt: true })
        .eq("id", bestAttempt.id);
    }

    // 7. Upsert progress
    const { data: progressRow } = await supabaseAdmin.from("progress")
      .select("id").eq("user_id", userId).eq("day_number", dayNumber).maybeSingle();
    if (progressRow) {
      await supabaseAdmin.from("progress").update({ anubhav_complete: true }).eq("id", progressRow.id);
    } else {
      await supabaseAdmin.from("progress").insert({
        user_id: userId, day_number: dayNumber,
        course_id: effectiveCourseId, anubhav_complete: true,
      });
    }

    // 8. Upsert student_progress
    try {
      const { data: allSessions } = await supabaseAdmin
        .from("practice_sessions")
        .select("day_number, composite_score, top_error_summary, submitted_at")
        .eq("user_id", userId)
        .eq("course_id", effectiveCourseId)
        .eq("status", "complete")
        .eq("is_best_attempt", true)
        .order("submitted_at", { ascending: true });

      if (allSessions && allSessions.length > 0) {
        const totalSessionsCompleted = allSessions.length;
        const distinctDays = new Set(allSessions.map(s => s.day_number));
        const totalDaysPracticed = distinctDays.size;
        const scores = allSessions.map(s => Number(s.composite_score) || 0);
        const latestScore = scores[scores.length - 1];
        const firstScore = scores[0];
        const bestScoreVal = Math.max(...scores);
        const worstScoreVal = Math.min(...scores);
        const bestDay = allSessions.find(s => Number(s.composite_score) === bestScoreVal)?.day_number;
        const worstDay = allSessions.find(s => Number(s.composite_score) === worstScoreVal)?.day_number;
        const last5 = scores.slice(-5);
        const first5 = scores.slice(0, 5);
        const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length;
        const first5Avg = first5.reduce((a, b) => a + b, 0) / first5.length;

        let scoreTrend = "insufficient_data";
        if (totalSessionsCompleted >= 10) {
          if (last5Avg > first5Avg + 10) scoreTrend = "rising";
          else if (last5Avg < first5Avg - 10) scoreTrend = "falling";
          else scoreTrend = "steady";
        }

        const errorCounts: Record<string, number> = {};
        allSessions.forEach(s => {
          if (s.top_error_summary) {
            errorCounts[s.top_error_summary] = (errorCounts[s.top_error_summary] || 0) + 1;
          }
        });
        const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);

        // Calendar streak
        const dateSet = new Set<string>();
        allSessions.forEach(s => {
          if (s.submitted_at) {
            const d = new Date(s.submitted_at);
            const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
            dateSet.add(istDate);
          }
        });
        const sortedDates = Array.from(dateSet).sort().reverse();
        const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
        let currentStreakVal = 0;
        let checkDate = todayIST;
        for (const d of sortedDates) {
          if (d === checkDate) {
            currentStreakVal++;
            const prev = new Date(checkDate);
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toISOString().split("T")[0];
          } else if (d < checkDate) {
            break;
          }
        }

        const { data: existing } = await supabaseAdmin
          .from("student_progress")
          .select("id, longest_streak_ever, first_session_score, first_session_date, first_5_avg_score")
          .eq("user_id", userId)
          .eq("course_id", effectiveCourseId)
          .maybeSingle();

        const progressData: any = {
          total_sessions_completed: totalSessionsCompleted,
          total_days_practiced: totalDaysPracticed,
          latest_session_score: latestScore,
          best_score_ever: bestScoreVal,
          best_score_day: bestDay,
          worst_score_ever: worstScoreVal,
          worst_score_day: worstDay,
          last_5_avg_score: Math.round(last5Avg * 10) / 10,
          score_trend: scoreTrend,
          top_error_1: sortedErrors[0]?.[0] || null,
          top_error_2: sortedErrors[1]?.[0] || null,
          top_error_3: sortedErrors[2]?.[0] || null,
          current_streak: currentStreakVal,
          latest_session_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          progressData.longest_streak_ever = Math.max(currentStreakVal, existing.longest_streak_ever || 0);
          if (!existing.first_session_score) {
            progressData.first_session_score = firstScore;
            progressData.first_session_date = allSessions[0].submitted_at;
          }
          if (!existing.first_5_avg_score && totalSessionsCompleted >= 5) {
            progressData.first_5_avg_score = Math.round(first5Avg * 10) / 10;
          }
          await supabaseAdmin.from("student_progress").update(progressData).eq("id", existing.id);
        } else {
          progressData.user_id = userId;
          progressData.course_id = effectiveCourseId;
          progressData.first_session_score = firstScore;
          progressData.first_session_date = allSessions[0].submitted_at;
          progressData.longest_streak_ever = currentStreakVal;
          if (totalSessionsCompleted >= 5) {
            progressData.first_5_avg_score = Math.round(first5Avg * 10) / 10;
          }
          await supabaseAdmin.from("student_progress").insert(progressData);
        }
      }
    } catch (e) {
      console.error("[anubhav-evaluate] student_progress upsert error:", e);
    }

    // 9. Return
    return new Response(
      JSON.stringify({
        wordClarityScore: avgWordClarity,
        smoothnessScore: avgSmoothness,
        naturalSoundScore: avgNaturalSound,
        compositeScore: compositeScore,
        mastermessage,
        mastermessagevoice,
        mastermessageaudiourl: masterAudioUrl,
        topErrorSummary: topErrorSummary,
        wordErrors: wordErrors,
        writingChecks: writingChecks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[anubhav-evaluate] Fatal error:", e);
    await safeMarkComplete();
    return new Response(
      JSON.stringify({
        ...fallbackResult,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
