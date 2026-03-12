import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  try {
    const { text, masterName } = await req.json();

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const voiceId =
      masterName === "Gyanu"
        ? Deno.env.get("GYANU_VOICE_ID")
        : Deno.env.get("GYANI_VOICE_ID");

    if (!voiceId) {
      throw new Error("Voice ID not configured");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
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

    if (!response.ok) {
      console.error("ElevenLabs error:", response.status, await response.text());
      throw new Error("ElevenLabs API error");
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audioBase64: base64, mimeType: "audio/mpeg" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-flame-voice error:", e);
    return new Response(
      JSON.stringify({ audioBase64: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
