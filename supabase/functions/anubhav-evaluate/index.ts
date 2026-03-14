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

async function assessPronunciation(
  audioBuffer: ArrayBuffer,
  contentType: string,
  azureKey: string,
  azureRegion: string
): Promise<{
  wordClarity: number;
  smoothness: number;
  naturalSound: number;
  transcript: string;
  errors: Array<{ word: string; issue: string }>;
}> {
  const pronAssessment = btoa(JSON.stringify({
    ReferenceText: "",
    GradingSystem: "HundredMark",
    Granularity: "Word",
    EnableMiscue: true,
    EnableProsodyAssessment: true,
  }));

  const response = await fetch(
    `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-IN&format=detailed`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": contentType,
        "Pronunciation-Assessment": pronAssessment,
      },
      body: new Uint8Array(audioBuffer),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Azure error:", response.status, errText);
    return { wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [] };
  }

  const data = await response.json();
  const nBest = data.NBest?.[0];
  if (!nBest) {
    return { wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: data.DisplayText || "", errors: [] };
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
  };
}

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
    const { session_id, writing_id, master_name, lesson_topic, mti_zone } =
      await req.json();

    const AZURE_SPEECH_KEY = Deno.env.get("AZURE_SPEECH_KEY");
    const AZURE_SPEECH_REGION = Deno.env.get("AZURE_SPEECH_REGION");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error("Azure Speech credentials not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Admin client for storage access
    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    // Fetch writings
    const { data: writing } = await supabaseAdmin
      .from("anubhav_writings")
      .select("*")
      .eq("id", writing_id)
      .single();

    // Fetch session for audio paths
    const { data: session } = await supabaseAdmin
      .from("anubhav_practice_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    // Download audio files
    let sentencesResult = { wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [] as any[] };
    let freespeechResult = { wordClarity: 50, smoothness: 50, naturalSound: 50, transcript: "", errors: [] as any[] };

    if (session.audio_sentences_path) {
      try {
        const { data: audioData, error: dlErr } = await supabaseAdmin.storage
          .from("anubhav-audio")
          .download(session.audio_sentences_path);
        if (audioData && !dlErr) {
          const buf = await audioData.arrayBuffer();
          const ct = session.audio_sentences_path.endsWith(".mp4") ? "audio/mp4" : "audio/webm;codecs=opus";
          sentencesResult = await assessPronunciation(buf, ct, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        }
      } catch (e) {
        console.error("Sentences audio assessment error:", e);
      }
    }

    if (session.audio_freespeech_path) {
      try {
        const { data: audioData, error: dlErr } = await supabaseAdmin.storage
          .from("anubhav-audio")
          .download(session.audio_freespeech_path);
        if (audioData && !dlErr) {
          const buf = await audioData.arrayBuffer();
          const ct = session.audio_freespeech_path.endsWith(".mp4") ? "audio/mp4" : "audio/webm;codecs=opus";
          freespeechResult = await assessPronunciation(buf, ct, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        }
      } catch (e) {
        console.error("Freespeech audio assessment error:", e);
      }
    }

    // Average scores
    const avgWordClarity = Math.round((sentencesResult.wordClarity + freespeechResult.wordClarity) / 2);
    const avgSmoothness = Math.round((sentencesResult.smoothness + freespeechResult.smoothness) / 2);
    const avgNaturalSound = Math.round((sentencesResult.naturalSound + freespeechResult.naturalSound) / 2);

    // Combine errors, max 5
    const allErrors = [...sentencesResult.errors, ...freespeechResult.errors].slice(0, 5);

    // Collect written sentences
    const writtenSentences: string[] = [];
    if (writing) {
      for (let i = 1; i <= 5; i++) {
        const s = (writing as any)[`sentence_${i}`];
        if (s) writtenSentences.push(s);
      }
    }

    // Gemini feedback
    const ANUBHAV_MASTER_PROMPT = Deno.env.get("ANUBHAV_MASTER_PROMPT") || "You are an English language coach. Return valid JSON only.";

    const userMessage = `Student name: ${master_name === "gyanu" || master_name === "Gyanu" ? "Student" : "Student"}
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
        console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      }
    } catch (e) {
      console.error("Gemini feedback error:", e);
    }

    // Save results to anubhav_practice_sessions
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("anubhav-evaluate error:", e);
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
