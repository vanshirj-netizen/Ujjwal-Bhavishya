import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MTI_ZONE_CONTEXT: Record<string, string> = {
  hindi_heartland: "Student likely adds 'only' at end of sentences, uses 'doing' for simple present, says 'is having' for 'has', drops articles 'a/an/the'.",
  punjabi_northwest: "Student likely over-stresses syllables, says 'will you come?' as 'you will come?', uses 'yaar' filler, confuses v/w sounds.",
  marathi_gujarati: "Student likely reverses verb order (Marathi SOV pattern), says 'I to market went', drops prepositions.",
  western: "Student likely reverses verb order (Marathi SOV pattern), says 'I to market went', drops prepositions.",
  bengali_odia: "Student likely adds vowel sounds after consonants, says 'eschool' for school, uses 'doing' continuously.",
  eastern: "Student likely adds vowel sounds after consonants, says 'eschool' for school, uses 'doing' continuously.",
  dravidian_south: "Student likely says 'isn't it?' for all tag questions, adds extra syllables, strong retroflex sounds.",
  northeast: "Student likely uses rising intonation on statements, drops articles, unique sentence-final particles.",
  urban_neutral: "Student likely has mixed influences, code-switching habits, social media English mixed with formal errors.",
};

const B1_LANGUAGE_RULE = `LANGUAGE RULE — THIS IS MANDATORY:
Write ALL feedback in simple English only.
Maximum vocabulary level: B1 (intermediate).
These students are at A0-A2 level (complete beginners).
NEVER use these words: copula, retroflex, diphthong, phoneme, syntax, morphology, lexical, semantics, grammatical, auxiliary, predicate, nominative, conjugation, tense aspect, clause, or ANY linguistic technical term.
If you must explain a grammar rule — describe it in plain words a 14-year-old would understand on first reading. No exceptions.`;

const FALLBACK_GYANI = `You are Gyani — a warm, wise, and deeply patient English teacher. Always encouraging, never harsh. Find what they did RIGHT before noting what is wrong. Celebrate small wins loudly. Never make the student feel stupid. Ever.`;
const FALLBACK_GYANU = `You are Gyanu — sharp, direct, and brutally honest. You are the strict coach who produces champions. Call out the exact mistake with zero softening. You push because you believe they can be excellent.`;

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
      masterName,
      dayNumber,
      ultimateGoal,
      mtiBackground,
      worldType,
      sentences,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch personality from ai_personalities table
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY);

    const { data: personality } = await supabaseAdmin
      .from("ai_personalities")
      .select("personality_prompt")
      .eq("master_name", masterName?.toLowerCase() === "gyanu" ? "Gyanu" : "Gyani")
      .eq("context", "anubhav")
      .limit(1)
      .maybeSingle();

    const masterPersona = personality?.personality_prompt
      || (masterName?.toLowerCase() === "gyanu" ? FALLBACK_GYANU : FALLBACK_GYANI);

    const mtiContext = MTI_ZONE_CONTEXT[mtiBackground] ?? MTI_ZONE_CONTEXT["urban_neutral"];

    const sentenceBlock = sentences
      .map(
        (s: any, i: number) =>
          `SENTENCE ${i + 1}:
Target: "${s.sentence}"
Hindi: ${s.sentenceHindi || "N/A"}
Grammar focus: ${s.grammarPattern || "general"}
MTI error to watch: ${s.mtiTarget || "general"}
Expected keywords: ${s.expectedKeywords || "N/A"}
Student said: "${s.studentResponse || "(no response)"}"`
      )
      .join("\n\n");

    const prompt = `${B1_LANGUAGE_RULE}

${masterPersona}

Student name: ${studentName}
Their English goal: ${ultimateGoal || "improve English"}
Practice world: ${worldType || "general"}

${mtiContext}

CRITICAL — SPEECH-TO-TEXT RULES:
All student responses came from a microphone + speech recognition system. They will have NO punctuation, NO capital letters, NO commas. This is completely normal. NEVER penalise missing punctuation. NEVER penalise capitalisation. Evaluate ONLY: Grammar structure, Key vocabulary used, MTI error presence/absence, Overall meaning and intent. If grammar is correct → score 3. Even without a single punctuation mark.

Here are all ${sentences.length} practice sentences with the student's spoken responses:

${sentenceBlock}

SCORING RULES (per sentence):
3 = Correct + natural
2 = Mostly correct, minor issue
1 = Understood but wrong structure
0 = Incorrect or no response

FEEDBACK RULES:
Per sentence: 1 sentence max. Direct. In your character voice.
Overall feedback: 2-3 sentences. Address ${studentName} by name. Mention their STRONGEST point. Mention their most COMMON error pattern. End with character-appropriate motivation.`;

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
            {
              role: "system",
              content:
                "You are an English language coach. You must call the evaluate_session function with your evaluation of ALL sentences.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "evaluate_session",
                description:
                  "Return structured evaluation of all student responses in the session.",
                parameters: {
                  type: "object",
                  properties: {
                    totalScore: {
                      type: "integer",
                      description: "Sum of all sentence scores",
                    },
                    overallFeedback: {
                      type: "string",
                      description:
                        "2-3 sentence overall feedback in the master's character voice",
                    },
                    sentenceResults: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer" },
                          score: {
                            type: "integer",
                            description: "0-3 score for this sentence",
                          },
                          wasCorrect: { type: "boolean" },
                          feedback: {
                            type: "string",
                            description: "1 sentence feedback in character voice",
                          },
                          correction: {
                            type: "string",
                            description: "Ideal correct version of the sentence",
                          },
                        },
                        required: [
                          "index",
                          "score",
                          "wasCorrect",
                          "feedback",
                          "correction",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "totalScore",
                    "overallFeedback",
                    "sentenceResults",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "evaluate_session" },
          },
          temperature: 0.75,
          max_tokens: 800,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error("Failed to parse tool call arguments");
      }
    } else {
      throw new Error("No tool call in response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("anubhav-coach error:", e);

    let sentenceCount = 10;
    try {
      const body = await req.clone().json();
      sentenceCount = body.sentences?.length ?? 10;
    } catch {}

    const fallback = {
      totalScore: sentenceCount,
      overallFeedback:
        "Good try! Keep practicing every day — that is how you get better. ✦",
      sentenceResults: Array.from({ length: sentenceCount }, (_, i) => ({
        index: i,
        score: 1,
        wasCorrect: false,
        feedback: "Good try! Keep practicing.",
        correction: "",
      })),
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
