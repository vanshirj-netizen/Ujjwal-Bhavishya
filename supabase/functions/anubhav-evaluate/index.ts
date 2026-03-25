import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function normalizeScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
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

  const userId = authUserId;
  const effectiveCourseId = courseId || "6a860163-ea3c-4205-89b3-74a3e9be098f";
  const effectiveMasterName = (masterName ?? "gyani").toLowerCase();
  const effectiveAttempt = attemptNumber ?? 1;
  const effectiveFirstName = firstName || "Friend";

  // Fallback response — null scores, never fake numbers
  const fallbackResult = {
    wordClarityScore: null as number | null,
    smoothnessScore: null as number | null,
    naturalSoundScore: null as number | null,
    compositeScore: null as number | null,
    mastermessage: "You showed up and practiced. That is the foundation.",
    mastermessagevoice: "You showed up and practiced. PAUSE That is the foundation.",
    mastermessageaudiourl: null as string | null,
    topErrorSummary: "",
    wordErrors: [] as any[],
    writingChecks: [] as any[],
    grammar_score: null as number | null,
    completeness_score: null as number | null,
    writing_composite_score: null as number | null,
    ai_summary: null as string | null,
    coaching_focus: null as string | null,
  };

  // Safety: always mark complete even on error
  const safeMarkComplete = async () => {
    try {
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

    // 2. Fetch lesson data for enriched context (Phase 2 — Changes 7, 8)
    let lessonData: any = null;
    try {
      const { data } = await supabaseAdmin
        .from("lessons")
        .select("title, write_prompt, writing_prompt_type, write_sentence_count, grammar_hint, gyani_transcript, gyanu_transcript, grammar_topics_summary")
        .eq("day_number", dayNumber)
        .eq("course_id", effectiveCourseId)
        .limit(1)
        .maybeSingle();
      lessonData = data;
    } catch (e) {
      console.error("[anubhav-evaluate] Lesson fetch error:", e);
    }

    // 3. Fetch student_progress for full context (Phase 3 — Change 12)
    let studentProgressData: any = null;
    try {
      const { data } = await supabaseAdmin
        .from("student_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", effectiveCourseId)
        .maybeSingle();
      studentProgressData = data;
    } catch (e) {
      console.error("[anubhav-evaluate] student_progress fetch error:", e);
    }

    // 4. Fetch last 3 AI log entries (Phase 3 — Change 11)
    let aiLogEntries: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from("anubhav_ai_log")
        .select("day_number, attempt_number, composite_score, ai_summary, coaching_focus, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      aiLogEntries = data ?? [];
    } catch (e) {
      console.error("[anubhav-evaluate] AI log fetch error:", e);
    }

    // 5. Download audio files — ONLY worldRecordings (Change 1)
    const audioBuffers: { base64: string; mime: string; label: string }[] = [];
    const allRecordings = [
      ...(worldRecordings ?? []).map((r: any, i: number) => ({ ...r, label: `world_${i}` })),
    ];

    // Build written text from writingRecordings (text only, no audio)
    const writtenSentences = (writingRecordings ?? []).map((r: any) => r.sentence).filter(Boolean);

    // Build world reference sentences for Call 1
    const worldReferenceSentences = (worldRecordings ?? []).map((r: any) => r.sentence || r.expectedSentence).filter(Boolean);

    // Change 6: Skip audio download entirely if no world recordings
    const hasWorldRecordings = allRecordings.length > 0;

    if (hasWorldRecordings) {
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
    }

    console.log("[anubhav-evaluate] Downloaded", audioBuffers.length, "audio files");

    // 6. Gemini Call 1: Audio evaluation — ONLY world recordings
    let avgWordClarity: number | null = null;
    let avgSmoothness: number | null = null;
    let avgNaturalSound: number | null = null;
    let audioWordErrors: any[] = [];
    let audioEvalSkipped = true;

    // Change 6: Only run Call 1 if we have actual audio buffers
    if (audioBuffers.length > 0) {
      try {
        const contentParts: any[] = [];
        contentParts.push({
          type: "text",
          text: `You are an English pronunciation evaluator for Indian students.
Student MTI Zone: ${mtiZone || "urban_neutral"}
Mother Tongue: ${motherTongue || "Hindi"}
Reference sentences: "${worldReferenceSentences.join('. ')}"
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
            audioEvalSkipped = false;
          }
        } else {
          console.error("[anubhav-evaluate] Gemini audio eval error:", geminiResponse.status);
        }
      } catch (e) {
        console.error("[anubhav-evaluate] Gemini audio eval exception:", e);
      }
    }

    // Compute composite only when scores are non-null
    const compositeScore = (avgWordClarity !== null && avgSmoothness !== null && avgNaturalSound !== null)
      ? Math.round((avgWordClarity * 0.4) + (avgSmoothness * 0.35) + (avgNaturalSound * 0.25))
      : null;

    // 7. Build Call 2 user message with full context

    // Change 2: Clean written sentences — text only, no audioPath
    let writtenSentencesBlock: string;
    if (writtenSentences.length > 0) {
      const numberedList = writtenSentences.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
      writtenSentencesBlock = `WRITTEN SENTENCES (student's writing — evaluate grammar, completeness, and scenario fit — no audio for these):\n${numberedList}`;
    } else {
      writtenSentencesBlock = "WRITTEN SENTENCES: None submitted this session.";
    }

    // Change 5: Scores block depends on audioEvalSkipped
    let scoresBlock: string;
    if (audioEvalSkipped) {
      scoresBlock = "SPEAKING EVALUATION: Audio unavailable this session. Evaluate writing only.";
    } else {
      scoresBlock = `PRONUNCIATION SCORES:
- Word Clarity: ${avgWordClarity}/100
- Smoothness: ${avgSmoothness}/100
- Natural Sound: ${avgNaturalSound}/100
- Composite: ${compositeScore}/100

WORD ERRORS FROM AUDIO EVAL:
${JSON.stringify(audioWordErrors)}`;
    }

    // Change 7: Lesson writing context
    let lessonWritingBlock = "";
    if (lessonData) {
      const parts: string[] = [];
      if (lessonData.write_prompt) parts.push(`WRITING PROMPT: ${lessonData.write_prompt}`);
      if (lessonData.writing_prompt_type) parts.push(`PROMPT TYPE: ${lessonData.writing_prompt_type}`);
      if (lessonData.write_sentence_count) parts.push(`EXPECTED SENTENCE COUNT: ${lessonData.write_sentence_count}`);
      if (parts.length > 0) lessonWritingBlock = "\n" + parts.join("\n");
    }

    // Change 8: Transcript context
    let transcriptBlock = "";
    if (lessonData?.gyani_transcript) {
      transcriptBlock += `\nGYANI LESSON TRANSCRIPT (your own words from today's lesson — use this to understand what the student was taught today):\n${lessonData.gyani_transcript}`;
    }
    if (lessonData?.gyanu_transcript) {
      transcriptBlock += `\nGYANU LESSON TRANSCRIPT (today's Gyanu grammar video):\n${lessonData.gyanu_transcript}`;
    }

    // Change 12: Full progress summary
    let progressBlock: string;
    if (studentProgressData) {
      const sp = studentProgressData;
      const parts: string[] = [];
      if (sp.total_sessions_completed != null) parts.push(`Total sessions: ${sp.total_sessions_completed}`);
      if (sp.score_trend) parts.push(`Trend: ${sp.score_trend}`);
      if (sp.first_session_score != null) parts.push(`First score: ${sp.first_session_score}`);
      if (sp.latest_session_score != null) parts.push(`Latest score: ${sp.latest_session_score}`);
      if (sp.best_score_ever != null) parts.push(`Best score: ${sp.best_score_ever} (Day ${sp.best_score_day ?? '?'})`);
      if (sp.worst_score_ever != null) parts.push(`Worst score: ${sp.worst_score_ever} (Day ${sp.worst_score_day ?? '?'})`);
      if (sp.first_5_avg_score != null) parts.push(`First 5 avg: ${sp.first_5_avg_score}`);
      if (sp.last_5_avg_score != null) parts.push(`Last 5 avg: ${sp.last_5_avg_score}`);
      const errors = [sp.top_error_1, sp.top_error_2, sp.top_error_3].filter(Boolean);
      if (errors.length > 0) parts.push(`Top errors: ${errors.join(", ")}`);
      if (sp.current_streak != null) parts.push(`Current streak: ${sp.current_streak} days`);
      if (sp.longest_streak_ever != null) parts.push(`Longest streak: ${sp.longest_streak_ever} days`);
      if (sp.total_days_practiced != null) parts.push(`Days practiced: ${sp.total_days_practiced}`);
      if (sp.current_focus_area) parts.push(`Current focus: ${sp.current_focus_area}`);
      if (sp.student_personality_notes) parts.push(`Personality notes: ${sp.student_personality_notes}`);
      progressBlock = `PROGRESS SUMMARY:\n${parts.join("\n")}`;
    } else {
      progressBlock = "PROGRESS SUMMARY: First session — no previous data.";
    }

    // Change 11: AI log entries
    let aiLogBlock = "";
    if (aiLogEntries.length > 0) {
      const entries = aiLogEntries.map(e =>
        `Day ${e.day_number} | Attempt ${e.attempt_number} | Speaking Score: ${e.composite_score ?? "N/A"}\nSummary: ${e.ai_summary || "none"}\nNext focus: ${e.coaching_focus || "none"}`
      ).join("\n---\n");
      aiLogBlock = `\nAI LOG (your last ${aiLogEntries.length} clinical notes — newest first):\n${entries}`;
    }

    const userPrompt = `STUDENT: ${effectiveFirstName}
DAY: ${dayNumber} of 60
ATTEMPT: ${effectiveAttempt} today
MASTER: ${effectiveMasterName}
SELECTED WORLD: ${selectedWorld} (professional / casual / both)
MTI ZONE: ${mtiZone}
MOTHER TONGUE: ${motherTongue}
LESSON: ${lessonTitle || lessonData?.title || 'not specified'}
GRAMMAR FOCUS: ${grammarPattern || lessonData?.grammar_hint || 'not specified'}
${lessonData?.grammar_topics_summary ? `GRAMMAR TOPICS SUMMARY: ${lessonData.grammar_topics_summary}` : ''}
${lessonWritingBlock}
${transcriptBlock}

${writtenSentencesBlock}

WORLD RECORDINGS (target sentences the student practiced speaking):
${JSON.stringify((worldRecordings ?? []).map((r: any) => ({ sentence: r.sentence || r.expectedSentence })))}

${scoresBlock}

SESSION HISTORY (last 5 sessions, newest first):
${JSON.stringify(sessionHistory ?? [])}

${progressBlock}
${aiLogBlock}`;

    // 8. Gemini Call 2: Feedback with personality — Change 4 updated schema
    let mastermessage = fallbackResult.mastermessage;
    let mastermessagevoice = fallbackResult.mastermessagevoice;
    let topErrorSummary = "";
    let wordErrors = audioWordErrors;
    let writingChecks: any[] = [];
    let grammarScore: number | null = null;
    let completenessScore: number | null = null;
    let writingCompositeScore: number | null = null;
    let aiSummary: string | null = null;
    let coachingFocus: string | null = null;

    try {
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
                        isCorrect: { type: "boolean", description: "true if sentence is grammatically correct, false if it has issues" },
                        issue: { type: "string", description: "Empty string if isCorrect is true" },
                        fix: { type: "string", description: "Empty string if isCorrect is true" },
                        correctedVersion: { type: "string", description: "Corrected sentence if isCorrect is false, empty string if correct" },
                      },
                      required: ["sentence", "isCorrect", "issue", "fix", "correctedVersion"],
                      additionalProperties: false,
                    },
                  },
                  grammar_score: { type: "number", description: "0-100 integer. How grammatically correct are the written sentences as a group." },
                  completeness_score: { type: "number", description: "0-100 integer. Did the student write the required number of sentences and address the writing prompt adequately." },
                  writing_composite_score: { type: "number", description: "0-100 integer. Overall writing quality. Weighted: grammar_score 60% + completeness_score 40%." },
                  ai_summary: { type: "string", description: "2-3 sentence clinical session note. Format: Day X | Attempt Y | Writing: [score] | Speaking: [score]. Primary pattern: [description] — STATUS: new / persistent / improving / resolved. Fix given: [what was told to the student]. Student applied it: yes / partially / not yet." },
                  coaching_focus: { type: "string", description: "ONE sentence only. What to focus on in the next session." },
                },
                required: ["mastermessage", "mastermessagevoice", "topErrorSummary", "wordErrors", "writingChecks", "grammar_score", "completeness_score", "writing_composite_score", "ai_summary", "coaching_focus"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "evaluate_practice" } },
          temperature: 0.7,
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
          // Writing scores — store exactly what Gemini returns, no normalizeScore
          grammarScore = parsed.grammar_score ?? null;
          completenessScore = parsed.completeness_score ?? null;
          writingCompositeScore = parsed.writing_composite_score ?? null;
          aiSummary = parsed.ai_summary || null;
          coachingFocus = parsed.coaching_focus || null;
        }
      } else {
        console.error("[anubhav-evaluate] Feedback Gemini error:", feedbackResponse.status);
      }
    } catch (e) {
      console.error("[anubhav-evaluate] Feedback error:", e);
    }

    // 9. ElevenLabs voice generation
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

    // 10. Save to practice_sessions (Change 9: include writing scores)
    const { data: existingSession } = await supabaseAdmin
      .from("practice_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", effectiveCourseId)
      .eq("day_number", dayNumber)
      .eq("attempt_number", effectiveAttempt)
      .maybeSingle();

    const sessionPayload: any = {
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
      grammar_score: grammarScore,
      completeness_score: completenessScore,
      writing_composite_score: writingCompositeScore,
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

    // 11. Upsert progress
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

    // 12. Change 10: Insert into anubhav_ai_log
    try {
      await supabaseAdmin.from("anubhav_ai_log").insert({
        user_id: userId,
        course_id: effectiveCourseId,
        day_number: dayNumber,
        attempt_number: effectiveAttempt,
        composite_score: compositeScore,
        ai_summary: aiSummary,
        coaching_focus: coachingFocus,
      });
    } catch (e) {
      console.error("[anubhav-evaluate] anubhav_ai_log insert error:", e);
    }

    // 13. Upsert student_progress
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
        const validScores = allSessions.filter(s => s.composite_score != null);
        const scores = validScores.map(s => Number(s.composite_score));
        const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;
        const firstScore = scores.length > 0 ? scores[0] : null;
        const bestScoreVal = scores.length > 0 ? Math.max(...scores) : null;
        const worstScoreVal = scores.length > 0 ? Math.min(...scores) : null;
        const bestDay = bestScoreVal != null ? validScores.find(s => Number(s.composite_score) === bestScoreVal)?.day_number : null;
        const worstDay = worstScoreVal != null ? validScores.find(s => Number(s.composite_score) === worstScoreVal)?.day_number : null;
        const last5 = scores.slice(-5);
        const first5 = scores.slice(0, 5);
        const last5Avg = last5.length > 0 ? last5.reduce((a, b) => a + b, 0) / last5.length : null;
        const first5Avg = first5.length > 0 ? first5.reduce((a, b) => a + b, 0) / first5.length : null;

        let scoreTrend = "insufficient_data";
        if (scores.length >= 10 && last5Avg != null && first5Avg != null) {
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
          last_5_avg_score: last5Avg != null ? Math.round(last5Avg * 10) / 10 : null,
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
          if (!existing.first_session_score && firstScore != null) {
            progressData.first_session_score = firstScore;
            progressData.first_session_date = allSessions[0].submitted_at;
          }
          if (!existing.first_5_avg_score && scores.length >= 5 && first5Avg != null) {
            progressData.first_5_avg_score = Math.round(first5Avg * 10) / 10;
          }
          await supabaseAdmin.from("student_progress").update(progressData).eq("id", existing.id);
        } else {
          progressData.user_id = userId;
          progressData.course_id = effectiveCourseId;
          progressData.first_session_score = firstScore;
          progressData.first_session_date = allSessions[0].submitted_at;
          progressData.longest_streak_ever = currentStreakVal;
          if (scores.length >= 5 && first5Avg != null) {
            progressData.first_5_avg_score = Math.round(first5Avg * 10) / 10;
          }
          await supabaseAdmin.from("student_progress").insert(progressData);
        }
      }
    } catch (e) {
      console.error("[anubhav-evaluate] student_progress upsert error:", e);
    }

    // 14. Return
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
        grammar_score: grammarScore,
        completeness_score: completenessScore,
        writing_composite_score: writingCompositeScore,
        ai_summary: aiSummary,
        coaching_focus: coachingFocus,
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
