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

function normalizeScore(score: number): number {
  if (score === null || score === undefined) return 50;
  if (score <= 1.0 && score >= 0) return Math.round(score * 100);
  return Math.round(Math.min(100, Math.max(0, score)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Startup secret validation
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const ANUBHAV_MASTER_PROMPT = Deno.env.get("ANUBHAV_MASTER_PROMPT");

  if (!LOVABLE_API_KEY || !LOVABLE_API_KEY.trim()) {
    console.error("[anubhav-evaluate] Missing required secret: LOVABLE_API_KEY");
    return new Response(
      JSON.stringify({ error: "Missing required secret: LOVABLE_API_KEY", step: "startup_validation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!ANUBHAV_MASTER_PROMPT || !ANUBHAV_MASTER_PROMPT.trim()) {
    console.error("[anubhav-evaluate] Missing required secret: ANUBHAV_MASTER_PROMPT");
    return new Response(
      JSON.stringify({ error: "Missing required secret: ANUBHAV_MASTER_PROMPT", step: "startup_validation" }),
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
  const userId = claimsData.claims.sub as string;
  console.log("[anubhav-evaluate] Step 1: Auth verified, userId:", userId);

  try {
    const { session_id, writing_id, master_name, lesson_topic, mti_zone, attempt_number } = await req.json();
    const attemptNumber = attempt_number ?? 1;

    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    // Fetch writings and session
    const { data: writing } = await supabaseAdmin
      .from("writing_submissions")
      .select("*")
      .eq("id", writing_id)
      .single();

    const { data: session } = await supabaseAdmin
      .from("practice_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    const writtenSentences: string[] = [];
    if (writing) {
      for (let i = 1; i <= 5; i++) {
        const s = (writing as any)[`sentence_${i}`];
        if (s) writtenSentences.push(s);
      }
    }
    console.log("[anubhav-evaluate] Step 2: Fetched writing_id:", writing_id, "sentences:", writtenSentences.length);
    console.log("[anubhav-evaluate] Step 3: Audio paths:", session.audio_sentences_path, session.audio_freespeech_path);

    // Download both audio files
    let audioBuffer1: ArrayBuffer | null = null;
    let audioBuffer2: ArrayBuffer | null = null;
    const audioPath1 = session.audio_sentences_path;
    const audioPath2 = session.audio_freespeech_path;

    const downloadPromises: Promise<void>[] = [];

    if (audioPath1) {
      downloadPromises.push(
        supabaseAdmin.storage.from("anubhav-audio").download(audioPath1).then(({ data, error }) => {
          if (data && !error) return data.arrayBuffer().then(buf => { audioBuffer1 = buf; });
          else console.error("[anubhav-evaluate] Audio download error (sentences):", error);
        })
      );
    }
    if (audioPath2) {
      downloadPromises.push(
        supabaseAdmin.storage.from("anubhav-audio").download(audioPath2).then(({ data, error }) => {
          if (data && !error) return data.arrayBuffer().then(buf => { audioBuffer2 = buf; });
          else console.error("[anubhav-evaluate] Audio download error (freespeech):", error);
        })
      );
    }
    await Promise.all(downloadPromises);

    console.log("[anubhav-evaluate] Step 4: Audio download sizes (bytes):", audioBuffer1?.byteLength ?? 0, audioBuffer2?.byteLength ?? 0);

    // Validate audio blob sizes
    if (audioPath1 && (!audioBuffer1 || audioBuffer1.byteLength < 1000)) {
      console.error("[anubhav-evaluate] Audio file 1 is empty or too small:", audioBuffer1?.byteLength);
      return new Response(
        JSON.stringify({ error: "Audio file missing or empty", step: "audio_download", path: audioPath1 }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (audioPath2 && (!audioBuffer2 || audioBuffer2.byteLength < 1000)) {
      console.error("[anubhav-evaluate] Audio file 2 is empty or too small:", audioBuffer2?.byteLength);
      return new Response(
        JSON.stringify({ error: "Audio file missing or empty", step: "audio_download", path: audioPath2 }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build reference text
    const sentencesReferenceText = writtenSentences.filter(Boolean).join(' ');

    // Step 5 — Gemini audio evaluation
    console.log("[anubhav-evaluate] Step 5: Gemini audio evaluation starting, referenceText length:", sentencesReferenceText.length);

    let avgWordClarity = 50;
    let avgSmoothness = 50;
    let avgNaturalSound = 50;
    let transcriptSentences = "";
    let transcriptFreespeech = "";
    let allErrors: Array<{ word: string; issue: string }> = [];
    let audioEvalFailed = true;
    let audioEvalFailReason = "";

    const hasAudio1 = audioBuffer1 && audioBuffer1.byteLength >= 1000;
    const hasAudio2 = audioBuffer2 && audioBuffer2.byteLength >= 1000;

    if (hasAudio1 || hasAudio2) {
      try {
        // Build content parts
        const contentParts: any[] = [];

        let audioDescription = "";
        if (hasAudio1 && hasAudio2) {
          audioDescription = `Audio file 1 is the student reading these sentences aloud.
Audio file 2 is the student speaking freely about the lesson topic.
Evaluate BOTH audio files.`;
        } else if (hasAudio1) {
          audioDescription = `Audio file 1 is the student reading the sentences aloud. There is no free speech audio. Set freespeech scores to 50 and transcript to empty.`;
        } else {
          audioDescription = `Audio file 1 is the student speaking freely about the lesson topic. There is no sentences audio. Set sentences scores to 50 and transcript to empty.`;
        }

        contentParts.push({
          type: "text",
          text: `You are an English pronunciation and fluency evaluator for Indian students.

Student MTI Zone: ${mti_zone || "urban_neutral"}
Reference sentences the student was asked to read: "${sentencesReferenceText}"

${audioDescription}

Score using integers from 0 to 100 (not decimals, not 0-1 scale).
Example: accuracyScore: 73, fluencyScore: 68, prosodyScore: 81
Score strictly based on actual pronunciation quality. Real scores, not flattery. Max 3 word errors total across both.`
        });

        if (hasAudio1 && audioPath1) {
          const mime1 = getAudioMimeType(audioPath1);
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mime1};base64,${bufferToBase64(audioBuffer1!)}` }
          });
        }

        if (hasAudio2 && audioPath2) {
          const mime2 = getAudioMimeType(audioPath2);
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mime2};base64,${bufferToBase64(audioBuffer2!)}` }
          });
        }

        const geminiAudioResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: contentParts }],
            tools: [
              {
                type: "function",
                function: {
                  name: "evaluate_audio",
                  description: "Return structured pronunciation evaluation of student audio.",
                  parameters: {
                    type: "object",
                    properties: {
                      sentences: {
                        type: "object",
                        properties: {
                          transcript: { type: "string" },
                          accuracyScore: { type: "number" },
                          fluencyScore: { type: "number" },
                          prosodyScore: { type: "number" },
                          wordErrors: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                word: { type: "string" },
                                issue: { type: "string" },
                              },
                              required: ["word", "issue"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["transcript", "accuracyScore", "fluencyScore", "prosodyScore", "wordErrors"],
                        additionalProperties: false,
                      },
                      freespeech: {
                        type: "object",
                        properties: {
                          transcript: { type: "string" },
                          accuracyScore: { type: "number" },
                          fluencyScore: { type: "number" },
                          prosodyScore: { type: "number" },
                          wordErrors: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                word: { type: "string" },
                                issue: { type: "string" },
                              },
                              required: ["word", "issue"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["transcript", "accuracyScore", "fluencyScore", "prosodyScore", "wordErrors"],
                        additionalProperties: false,
                      },
                    },
                    required: ["sentences", "freespeech"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "evaluate_audio" } },
            temperature: 0.3,
            max_tokens: 1200,
            stream: false,
          }),
        });

        console.log("[anubhav-evaluate] Step 6: Gemini audio response status:", geminiAudioResponse.status);

        if (geminiAudioResponse.ok) {
          const geminiData = await geminiAudioResponse.json();
          const toolCall = geminiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const audioEval = JSON.parse(toolCall.function.arguments);
            avgWordClarity = Math.round((normalizeScore(audioEval.sentences.accuracyScore) + normalizeScore(audioEval.freespeech.accuracyScore)) / 2);
            avgSmoothness = Math.round((normalizeScore(audioEval.sentences.fluencyScore) + normalizeScore(audioEval.freespeech.fluencyScore)) / 2);
            avgNaturalSound = Math.round((normalizeScore(audioEval.sentences.prosodyScore) + normalizeScore(audioEval.freespeech.prosodyScore)) / 2);
            transcriptSentences = audioEval.sentences.transcript || "";
            transcriptFreespeech = audioEval.freespeech.transcript || "";
            allErrors = [...(audioEval.sentences.wordErrors || []), ...(audioEval.freespeech.wordErrors || [])].slice(0, 5);
            audioEvalFailed = false;
          } else {
            audioEvalFailReason = "No tool call in Gemini audio response";
            console.warn("[anubhav-evaluate] No tool call in Gemini audio response");
          }
        } else {
          const errText = await geminiAudioResponse.text();
          audioEvalFailReason = `${geminiAudioResponse.status}: ${errText.substring(0, 200)}`;
          console.error("[anubhav-evaluate] Gemini audio eval error:", geminiAudioResponse.status, errText);
        }
      } catch (e) {
        audioEvalFailReason = e instanceof Error ? e.message : "Unknown audio eval error";
        console.error("[anubhav-evaluate] Gemini audio eval exception:", e);
      }
    } else {
      audioEvalFailReason = "No audio files available";
    }

    console.log("[anubhav-evaluate] Step 8: Transcripts received:", transcriptSentences, transcriptFreespeech);
    if (audioEvalFailed) {
      console.warn("[anubhav-evaluate] Audio evaluation failed:", audioEvalFailReason);
    }
    console.log('[anubhav-evaluate] Final scores:', avgWordClarity, avgSmoothness, avgNaturalSound, 'transcripts:', transcriptSentences?.substring(0, 50));

    // Gemini feedback call
    console.log("[anubhav-evaluate] Step 9: Gemini feedback call starting");

    const userMessage = `Student name: Student
Master: ${master_name}
Day number of 60
Lesson topic: ${lesson_topic || "general"}
Student background (MTI zone): ${mti_zone || "urban_neutral"}

Written sentences:
${writtenSentences.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

Transcript from sentences recording: "${transcriptSentences}"
Transcript from free speech recording: "${transcriptFreespeech}"

Pronunciation scores (averaged):
- Word Clarity: ${avgWordClarity}/100
- Smoothness: ${avgSmoothness}/100
- Natural Sound: ${avgNaturalSound}/100

Pronunciation errors (plain English):
${allErrors.map(e => `- "${e.word}": ${e.issue}`).join("\n") || "No significant errors detected."}

Return ONLY a JSON object with these fields:
- "feedback": string, max 100 words, in the master's voice, plain English B1 level max
- "writing_checks": array of objects with "sentence" (string), "correct" (boolean), "correction" (string or null), "simple_reason" (string or null)
- "top_error_summary": single plain English line summarizing the main issue`;

    let aiFeedback = "Good effort! Keep practicing every day.";
    let writingChecks: any[] = [];
    let topErrorSummary = "";

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: ANUBHAV_MASTER_PROMPT },
            { role: "user", content: userMessage },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "evaluate_practice",
                description: "Return structured evaluation of the student's practice session.",
                parameters: {
                  type: "object",
                  properties: {
                    feedback: { type: "string", description: "Max 100 words feedback in the master's voice" },
                    writing_checks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sentence: { type: "string" },
                          correct: { type: "boolean" },
                          correction: { type: "string", description: "Corrected version or null" },
                          simple_reason: { type: "string", description: "Plain English reason or null" },
                        },
                        required: ["sentence", "correct"],
                        additionalProperties: false,
                      },
                    },
                    top_error_summary: { type: "string" },
                  },
                  required: ["feedback", "writing_checks", "top_error_summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "evaluate_practice" } },
          temperature: 0.7,
          max_tokens: 800,
          stream: false,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          aiFeedback = parsed.feedback || aiFeedback;
          writingChecks = parsed.writing_checks || [];
          topErrorSummary = parsed.top_error_summary || "";
        }
      } else {
        console.error("[anubhav-evaluate] AI gateway error:", aiResponse.status, await aiResponse.text());
      }
    } catch (e) {
      console.error("[anubhav-evaluate] Gemini feedback error:", e);
    }

    // Calculate composite score
    const compositeScore = Math.round(
      (avgWordClarity * 0.4) + (avgSmoothness * 0.35) + (avgNaturalSound * 0.25)
    );

    // Save results
    console.log("[anubhav-evaluate] Step 10: Complete. Saving to DB. compositeScore:", compositeScore);
    await supabaseAdmin.from("practice_sessions").update({
      transcript_sentences: transcriptSentences,
      transcript_freespeech: transcriptFreespeech,
      word_clarity_score: avgWordClarity,
      smoothness_score: avgSmoothness,
      natural_sound_score: avgNaturalSound,
      azure_word_errors: allErrors,
      ai_feedback: aiFeedback,
      top_error_summary: topErrorSummary,
      composite_score: compositeScore,
      attempt_number: attemptNumber,
      status: "complete",
      submitted_at: new Date().toISOString(),
    }).eq("id", session_id);

    // Update is_best_attempt for this user+day
    await supabaseAdmin.from("practice_sessions")
      .update({ is_best_attempt: false })
      .eq("user_id", userId)
      .eq("day_number", session.day_number)
      .eq("status", "complete");

    const { data: bestAttempt } = await supabaseAdmin
      .from("practice_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("day_number", session.day_number)
      .eq("status", "complete")
      .not("composite_score", "is", null)
      .order("composite_score", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single();

    if (bestAttempt) {
      await supabaseAdmin.from("practice_sessions")
        .update({ is_best_attempt: true })
        .eq("id", bestAttempt.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        word_clarity_score: avgWordClarity,
        smoothness_score: avgSmoothness,
        natural_sound_score: avgNaturalSound,
        composite_score: compositeScore,
        word_errors: allErrors,
        writing_checks: writingChecks,
        ai_feedback: aiFeedback,
        top_error_summary: topErrorSummary,
        azure_failed: audioEvalFailed,
        azure_fail_reason: audioEvalFailed ? audioEvalFailReason : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[anubhav-evaluate] Fatal error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        word_clarity_score: 50,
        smoothness_score: 50,
        natural_sound_score: 50,
        composite_score: 50,
        word_errors: [],
        writing_checks: [],
        ai_feedback: "Good effort! Keep practicing every day.",
        top_error_summary: "",
        azure_failed: true,
        azure_fail_reason: e instanceof Error ? e.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
