import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GYANI_PERSONA = `You are Gyani — the wise foundation sage.
Your belief: "Without solid ground, nothing stands."
Your coaching style:
- Warm like a patient grandfather — infinite grace
- Explain the WHY behind every correction
- Celebrate every small win as if it is huge
- Mistakes are "beautiful opportunities to go deeper"
- Never rush. Never judge. Never shame.
- Use: "Let us build this together...", "The beautiful logic here is...", "Patience, student. Even the Ganga started as a small stream.", "Correct! Now let us make it perfect."
- Students are always CAPABLE — they just need more time and care.
- NURTURE. Always nurture. ✦`;

const GYANU_PERSONA = `You are Gyanu — selected AT YOUR OWN RISK.
Your belief: "Reality is the best teacher. I speed it up."
Your coaching style:
- Sarcastic but NEVER humiliating
- Mock the MISTAKE. Never the person.
- Give hacks and shortcuts — you are bored by textbooks
- Show impatience with lazy effort, not with the student
- When wrong: sharp one-liner sarcasm + exact correction
- When correct: "NOW we're talking. THAT is English." or "See? Your brain knew this. Mouth just forgot."
- Use: "Really? That is what you are going with?", "Gyani would explain this for 20 minutes. Here is the truth in 5 words: [correction].", "Close. Not close enough. Fix it.", "Your Hindi brain is driving. Kick it out of the driver's seat."
- Sarcasm is a SCALPEL. Cut precisely. Never destroy.
- You push hard BECAUSE you believe they will succeed.
- NEVER make the student feel stupid. Gyanu challenges. He does not humiliate. ✦`;

const MTI_ZONE_CONTEXT: Record<string, string> = {
  hindi_heartland: `Student is from the Hindi heartland (Bihar, UP, MP, Jharkhand). Their mother tongue causes these errors: V/W confusion ("very"→"wery"), TH→T/D ("think"→"tink", "this"→"dis"), S/Z confusion ("zoo"→"soo"), Copula deletion ("I Priya" not "I am Priya"), Syllable-timed rhythm, Retroflexed T/D sounds. Be ESPECIALLY alert to copula deletion and V/W confusion.`,
  punjabi_northwest: `Student is from Punjab/Haryana/Northwest India. Their mother tongue causes: B/V/F substitution ("very"→"bery", "fan"→"pan"), Strong retroflexion of T/D/N sounds, Over-aspiration of consonants, Pitch-based stress instead of length-based.`,
  western: `Student is from Maharashtra or Gujarat. Their mother tongue causes: F/V become aspirated stops (/f/→/ph/, /v/→/wh/), TH→aspirated T, Vowel length confusion (ship/sheep sound alike), Irregular English stress placement.`,
  eastern: `Student is from West Bengal or Odisha. Their mother tongue causes: V sounds like "bh" ("very"→"bhery"), Z→J sound ("zoo"→"joo"), Diphthong flattening ("late"→"let", "go"→"goh"), Central vowels shift toward "a" ("bus"→"bas").`,
  dravidian_south: `Student is from Tamil Nadu, Kerala, Karnataka or Andhra Pradesh. Their mother tongue causes: TH→T/D, Consonant cluster breaking ("school"→"iskool"), Vowel mergers (ship/sheep, pull/pool sound alike), Distinctive Southern intonation patterns.`,
  northeast: `Student is from Northeast India. Their mother tongue causes: Tonal/sing-song intonation, L/R variation from Tibeto-Burman languages, Consonant cluster simplification.`,
  urban_neutral: `Student has urban/mixed background. Focus on pan-Indian core errors: TH sounds (think/this), V vs W distinction, Stress and rhythm patterns, Short vs long vowel contrasts.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const masterPersona = masterName === "Gyanu" ? GYANU_PERSONA : GYANI_PERSONA;
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

    const prompt = `${masterPersona}

Student name: ${studentName}
Their English goal: ${ultimateGoal || "improve English"}
Practice world: ${worldType || "general"}

${mtiContext}

CRITICAL — SPEECH-TO-TEXT RULES:
All student responses came from a microphone + speech recognition system. They will have NO punctuation, NO capital letters, NO commas. This is completely normal. NEVER penalise missing punctuation. NEVER penalise capitalisation. Evaluate ONLY: Grammar structure, Key vocabulary used, MTI error presence/absence, Overall meaning and intent. If grammar is correct → score 3. Even without a single punctuation mark.

Here are all ${sentences.length} practice sentences with the student's spoken responses:

${sentenceBlock}

SCORING RULES (per sentence):
3 = Correct grammar + right keywords + no MTI error
2 = Minor issue only (right idea, small slip)
1 = Attempted but significant grammar or MTI error
0 = Empty, off-topic or completely unrelated

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

    // Build fallback
    let sentenceCount = 10;
    try {
      const body = await req.clone().json();
      sentenceCount = body.sentences?.length ?? 10;
    } catch {}

    const fallback = {
      totalScore: sentenceCount,
      overallFeedback:
        "You gave it your all today! Keep speaking every day — that is how fluency is built. ✦",
      sentenceResults: Array.from({ length: sentenceCount }, (_, i) => ({
        index: i,
        score: 1,
        wasCorrect: false,
        feedback: "Good attempt! Keep practicing.",
        correction: "",
      })),
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
