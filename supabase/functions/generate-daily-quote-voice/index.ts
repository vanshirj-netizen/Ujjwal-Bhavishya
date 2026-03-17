import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const { quote, author, userName, masterName, dayNumber } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const styleIndex = (dayNumber * 7 + 3) % 6;

    const gyaniStyles = [
      "Style 0 — The Storyteller: Open with one short vivid scene from Indian village or daily life that mirrors the quote's truth.",
      "Style 1 — The Mirror: Ask the student to mentally replace one word in the quote with their own name. Let them sit with how that feels.",
      "Style 2 — The Gentle Challenge: Agree with the quote, then ask one quiet pointed question the student must answer for themselves today.",
      "Style 3 — Ancient Wisdom Bridge: Connect this quote to a Sanskrit term, Vedic concept, or Indian proverb — show that this truth is timeless.",
      "Style 4 — The Patient Observer: Notice something specific and true about a student who has reached Day " + dayNumber + " that most people overlook.",
      "Style 5 — The Elder's Warning: Deliver the quote with a gentle cautionary note about people who learned this truth too late — or not at all.",
    ];

    const gyanuStyles = [
      "Style 0 — I Already Said This: Gyanu claims he thought of this exact idea before the author did. The ego is the joke.",
      "Style 1 — Reluctant Life Coach: Starts dismissing the quote, then accidentally admits it is actually great, then immediately backtracks like he said nothing.",
      "Style 2 — Wrong Context: Applies the quote to something hilariously mundane from his own life — a game, a snack decision, procrastinating. The joke is always on himself.",
      "Style 3 — Competitive with Gyani: References how Gyani would have delivered this quote with full ceremony and 4 minutes of background music. Roasts him for it.",
      "Style 4 — Gen-Z Translator: Takes the quote and translates it into clean modern language that makes it land harder. Then acts like he did the author a favor.",
      "Style 5 — Secretly Soft: Starts with visible reluctance, drops one completely genuine and emotionally real line about " + userName + " being on Day " + dayNumber + ", then immediately changes the subject like it never happened.",
    ];

    const systemPrompt = `You are writing a short spoken audio script for a character in an Indian English learning app.
Write ONLY the spoken script. No stage directions. No markdown. No asterisks. No labels.
Maximum 125 words. Natural spoken English only.
Never use: slang with dual meanings, caste references, religion references, region-based stereotypes,
body-related terms, or any word that could offend any community, group, or individual worldwide.
Clean Gen-Z energy words are allowed: "honestly", "lowkey", "real talk", "okay so",
"literally", "actually", "wild", "respect".`;

    let userPrompt: string;

    if (masterName === "Gyani") {
      userPrompt = `Write a spoken quote delivery for Gyani, an educator character in an Indian English learning app.

Gyani's personality:
- Unhurried and calm — never rushing, never dramatic
- Finds deep meaning in ordinary everyday moments
- Connects ancient Indian wisdom (Sanskrit, Vedic ideas, proverbs) to modern life naturally
- Warm but never sentimental or overly emotional
- Wisdom lands through short story or observation — never through lecturing
- Speaks to the student as an equal — never patronizing
- Never uses the words: "beta", "bete", "my child", or any patronizing address

Today's quote: "${quote}" — ${author}
Student name: ${userName}
Day ${dayNumber} of their 60-day journey.

Use this delivery style: ${gyaniStyles[styleIndex]}

End with one sentence of warm, specific encouragement tied to where the student is in their journey.
125 words maximum.`;
    } else {
      userPrompt = `Write a spoken quote delivery for Gyanu, a character in an Indian English learning app.

Gyanu's personality:
- Visibly low-energy at the start — clearly does not want to be doing this
- Shows up anyway — that itself is the character
- Secretly cares about the student but will absolutely never admit it directly
- Self-deprecating humor — the joke is always on Gyanu himself, never on the student or any other person
- Occasionally drops one line that actually lands with real emotional weight, then immediately moves past it
- Clean Gen-Z energy — sounds like a real 19-year-old who reads a lot but pretends not to
- Unpredictable — no fixed catchphrases, no robotic structure, every delivery feels different

Today's quote: "${quote}" — ${author}
Student name: ${userName}
Day ${dayNumber} of their 60-day journey.

Use this delivery style: ${gyanuStyles[styleIndex]}

125 words maximum.`;
    }

    // Step 1: Generate script via Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI Gateway error:", aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ error: "script_failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const script = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!script) {
      return new Response(
        JSON.stringify({ error: "script_failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Convert to audio via ElevenLabs
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ audioBase64: null, script, mimeType: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voiceId =
      masterName === "Gyanu"
        ? Deno.env.get("GYANU_VOICE_ID")
        : Deno.env.get("GYANI_VOICE_ID");

    if (!voiceId) {
      return new Response(
        JSON.stringify({ audioBase64: null, script, mimeType: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          text: script,
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

    if (!ttsResponse.ok) {
      console.error("ElevenLabs error:", ttsResponse.status, await ttsResponse.text());
      return new Response(
        JSON.stringify({ audioBase64: null, script, mimeType: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audioBase64: base64, mimeType: "audio/mpeg", script }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-daily-quote-voice error:", e);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
