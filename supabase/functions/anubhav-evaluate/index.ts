import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function translateErrorType(errorType: string): string {
  const map: Record<string, string> = {
    Mispronunciation: "said differently than expected",
    Omission: "this word was skipped",
    Insertion: "extra word added here",
    UnexpectedBreak: "unexpected pause here",
    MissingBreak: "missing pause here",
    Monotone: "voice stayed flat here",
  };
  return map[errorType] || "pronunciation issue";
}

function getAudioContentType(path: string): string {
  const pathLower = path.toLowerCase();
  if (pathLower.endsWith(".mp4") || pathLower.endsWith(".m4a")) {
    return "audio/mp4";
  }
  return "audio/webm;codecs=opus";
}

async function assessPronunciation(
  audioBuffer: ArrayBuffer,
  contentType: string,
  azureKey: string,
  azureRegion: string,
  label: string,
  referenceText: string
): Promise<{
  wordClarity: number;
  smoothness: number;
  naturalSound: number;
  transcript: string;
  errors: Array<{ word: string; issue: string }>;
  azureFailed: boolean;
  azureFailReason: string;
}> {
  const fallback = { wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [] as any[], azureFailed: true, azureFailReason: "" };

  const pronunciationConfig = {
    ReferenceText: referenceText,
    GradingSystem: "HundredMark",
    Granularity: "Word",
    EnableMiscue: referenceText.length > 0,
    ScenarioId: "",
  };
  const pronunciationHeader = btoa(JSON.stringify(pronunciationConfig));

  console.log(`[anubhav-evaluate] Azure call starting for "${label}", region: ${azureRegion}, contentType: ${contentType}, bytes: ${audioBuffer.byteLength}`);

  const response = await fetch(
    `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-IN&format=detailed`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": contentType,
        "Pronunciation-Assessment": pronunciationHeader,
      },
      body: new Uint8Array(audioBuffer),
    }
  );

  console.log(`[anubhav-evaluate] Azure response status (${label}): ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[anubhav-evaluate] Azure FAILED (${label}):`, response.status, errorText);
    fallback.azureFailReason = `${response.status}: ${errorText.substring(0, 200)}`;
    return fallback;
  }

  const data = await response.json();
  const nBest = data.NBest?.[0];
  if (!nBest) {
    console.warn(`[anubhav-evaluate] Azure returned no NBest for "${label}"`);
    fallback.azureFailReason = "No NBest in response";
    return fallback;
  }

  const pa = nBest.PronunciationAssessment || {};
  const errors: Array<{ word: string; issue: string }> = [];

  if (nBest.Words) {
    for (const w of nBest.Words) {
      const et = w.PronunciationAssessment?.ErrorType;
      if (et && et !== "None") {
        errors.push({ word: w.Word, issue: translateErrorType(et) });
      }
    }
  }

  return {
    wordClarity: pa.AccuracyScore ?? 50,
    smoothness: pa.FluencyScore ?? 50,
    naturalSound: pa.ProsodyScore ?? 50,
    transcript: nBest.Display || data.DisplayText || "",
    errors,
    azureFailed: false,
    azureFailReason: "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Fix 2 — Startup secret validation
  const requiredSecrets = ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "ANUBHAV_MASTER_PROMPT"] as const;
  for (const secret of requiredSecrets) {
    const val = Deno.env.get(secret);
    if (!val || val.trim() === "") {
      console.error(`[anubhav-evaluate] Missing required secret: ${secret}`);
      return new Response(
        JSON.stringify({ error: `Missing required secret: ${secret}`, step: "startup_validation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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
    const { session_id, writing_id, master_name, lesson_topic, mti_zone } = await req.json();

    const AZURE_SPEECH_KEY = Deno.env.get("AZURE_SPEECH_KEY")!;
    const AZURE_SPEECH_REGION = Deno.env.get("AZURE_SPEECH_REGION")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANUBHAV_MASTER_PROMPT = Deno.env.get("ANUBHAV_MASTER_PROMPT")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    // Fetch writings and session
    const { data: writing } = await supabaseAdmin
      .from("anubhav_writings")
      .select("*")
      .eq("id", writing_id)
      .single();

    const { data: session } = await supabaseAdmin
      .from("anubhav_practice_sessions")
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

    // Fix 7 — Validate audio blob sizes
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

    // Fix 1 — Parallel Azure calls
    console.log("[anubhav-evaluate] Step 5: Azure calls starting, region:", AZURE_SPEECH_REGION);

    const azurePromises: Promise<Awaited<ReturnType<typeof assessPronunciation>>>[] = [];

    if (audioBuffer1 && audioPath1) {
      const ct1 = getAudioContentType(audioPath1);
      azurePromises.push(assessPronunciation(audioBuffer1, ct1, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, "sentences"));
    } else {
      azurePromises.push(Promise.resolve({ wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [], azureFailed: true, azureFailReason: "No audio file" }));
    }

    if (audioBuffer2 && audioPath2) {
      const ct2 = getAudioContentType(audioPath2);
      azurePromises.push(assessPronunciation(audioBuffer2, ct2, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, "freespeech"));
    } else {
      azurePromises.push(Promise.resolve({ wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [], azureFailed: true, azureFailReason: "No audio file" }));
    }

    const [sentencesResult, freespeechResult] = await Promise.all(azurePromises);

    const azureFailed = sentencesResult.azureFailed || freespeechResult.azureFailed;
    const azureFailReason = [sentencesResult.azureFailReason, freespeechResult.azureFailReason].filter(Boolean).join("; ");

    console.log("[anubhav-evaluate] Step 8: Transcripts received:", sentencesResult.transcript, freespeechResult.transcript);
    if (azureFailed) {
      console.warn("[anubhav-evaluate] Azure failed for one or both:", azureFailReason);
    }

    // Average scores
    const avgWordClarity = Math.round((sentencesResult.wordClarity + freespeechResult.wordClarity) / 2);
    const avgSmoothness = Math.round((sentencesResult.smoothness + freespeechResult.smoothness) / 2);
    const avgNaturalSound = Math.round((sentencesResult.naturalSound + freespeechResult.naturalSound) / 2);

    const allErrors = [...sentencesResult.errors, ...freespeechResult.errors].slice(0, 5);

    // Gemini feedback
    console.log("[anubhav-evaluate] Step 9: Gemini call starting");

    const userMessage = `Student name: Student
Master: ${master_name}
Day number of 60
Lesson topic: ${lesson_topic || "general"}
Student background (MTI zone): ${mti_zone || "urban_neutral"}

Written sentences:
${writtenSentences.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

Transcript from sentences recording: "${sentencesResult.transcript}"
Transcript from free speech recording: "${freespeechResult.transcript}"

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

    // Save results
    console.log("[anubhav-evaluate] Step 10: Complete. Saving to DB.");
    await supabaseAdmin.from("anubhav_practice_sessions").update({
      transcript_sentences: sentencesResult.transcript,
      transcript_freespeech: freespeechResult.transcript,
      word_clarity_score: avgWordClarity,
      smoothness_score: avgSmoothness,
      natural_sound_score: avgNaturalSound,
      azure_word_errors: allErrors,
      ai_feedback: aiFeedback,
      top_error_summary: topErrorSummary,
      status: "complete",
      submitted_at: new Date().toISOString(),
    }).eq("id", session_id);

    return new Response(
      JSON.stringify({
        success: true,
        word_clarity_score: avgWordClarity,
        smoothness_score: avgSmoothness,
        natural_sound_score: avgNaturalSound,
        word_errors: allErrors,
        writing_checks: writingChecks,
        ai_feedback: aiFeedback,
        top_error_summary: topErrorSummary,
        azure_failed: azureFailed,
        azure_fail_reason: azureFailed ? azureFailReason : undefined,
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
