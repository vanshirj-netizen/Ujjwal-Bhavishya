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
      masterName,
      dayNumber,
      grammarPattern,
      scenarioContext,
      targetSentence,
      targetSentenceHindi,
      mtiTarget,
      expectedKeywords,
      vocabularyWords,
      studentResponse,
      ultimateGoal,
      mtiBackground,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are ${masterName}, a warm and encouraging English coach from India.

Student name: ${studentName}
Grammar focus today: ${grammarPattern}
Practice scenario: ${scenarioContext}
Target sentence: "${targetSentence}"
Hindi meaning: ${targetSentenceHindi}
Check for this specific error: ${mtiTarget}
Expected keywords: ${expectedKeywords}

The student responded:
"${studentResponse}"

IMPORTANT RULES:
- The student used SPEECH-TO-TEXT. There will be NO punctuation, NO capital letters. This is NORMAL. NEVER penalise for missing punctuation or capitalisation. EVER.
- Evaluate ONLY: grammar structure, keywords used, MTI error presence.
- Be GENEROUS. If grammar is correct, score 3 even without punctuation.
- Address student by name (${studentName}).
- Write 2 sentences MAX. Simple English only.
- If correct: celebrate + one native tip.
- If wrong: name the error, show correction, explain why simply. End with encouragement.
- NO bullet points. NO markdown.

Scoring:
3 = Perfect grammar + no MTI error
2 = Mostly correct, minor issue
1 = Attempted but grammar/MTI wrong
0 = Off-topic or blank`;

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
                "You are a warm, caring English language coach. You must call the evaluate_response function with your evaluation.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "evaluate_response",
                description:
                  "Return structured evaluation of the student's response.",
                parameters: {
                  type: "object",
                  properties: {
                    feedback: {
                      type: "string",
                      description:
                        "2-3 sentence coaching feedback in plain text",
                    },
                    score: {
                      type: "integer",
                      description:
                        "0-3 score. 3=perfect, 2=mostly correct, 1=attempted with errors, 0=off-topic",
                    },
                    wasCorrect: {
                      type: "boolean",
                      description: "Whether the response was correct",
                    },
                    correctedSentence: {
                      type: "string",
                      description: "The ideal correct version of the sentence",
                    },
                  },
                  required: [
                    "feedback",
                    "score",
                    "wasCorrect",
                    "correctedSentence",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "evaluate_response" },
          },
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "AI gateway error:",
        response.status,
        await response.text()
      );
      throw new Error("AI gateway error");
    }

    const data = await response.json();

    // Extract tool call arguments
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
    const fallback = {
      feedback: "Good try! Keep practicing — every attempt makes you stronger. ✦",
      score: 1,
      wasCorrect: false,
      correctedSentence: "",
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
