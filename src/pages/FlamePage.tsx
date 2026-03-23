import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_ID } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import GoldCard from "@/components/ui/GoldCard";

const Particle = ({ delay, x, size }: { delay: number; x: number; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-primary/40"
    style={{ width: size, height: size, left: `${x}%`, bottom: -10 }}
    initial={{ opacity: 0, y: 0 }}
    animate={{ opacity: [0, 0.8, 0], y: -400, x: [0, (Math.random() - 0.5) * 60] }}
    transition={{ duration: 3 + Math.random() * 2, delay, repeat: Infinity, ease: "easeOut" }}
  />
);

const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 18 }).map((_, i) => (
      <Particle key={i} delay={i * 0.3} x={Math.random() * 100} size={3 + Math.random() * 5} />
    ))}
  </div>
);

const slideVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const loadingTexts = [
  "Reading your day carefully...",
  "Listening to your words and your voice...",
  "{masterName} is writing your summary...",
  "Almost ready for you...",
];

type FlameScreen = "loading" | "readonly" | "gate" | "reflection" | "master-loading" | "master" | "streak";

const FlamePage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnlyMode = searchParams.get("mode") === "readonly";

  const [screen, setScreen] = useState<FlameScreen>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [existingFlame, setExistingFlame] = useState<any>(null);
  const [practiceSession, setPracticeSession] = useState<any>(null);
  const [writings, setWritings] = useState<any>(null);
  const [progressSummary, setProgressSummary] = useState<any>({});

  const [confRating, setConfRating] = useState(0);
  const [spokeAbout, setSpokeAbout] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [tomorrowsIntention, setTomorrowsIntention] = useState("");

  // Manthan flow states
  const [recapPoints, setRecapPoints] = useState<string[]>([]);
  const [manthanQuestion, setManthanQuestion] = useState("");
  const [manthanAnswer, setManthanAnswer] = useState("");

  const [aiResponse, setAiResponse] = useState("");
  const [flameId, setFlameId] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const [profileRes, lessonRes, flameRes, progressRes, sessionRes, writingsRes, progressSummaryRes, lessonDetailRes] = await Promise.all([
        supabase.from("profiles").select("full_name, selected_master, current_streak, longest_streak, mother_tongue, mti_zone").eq("id", user.id).maybeSingle(),
        supabase.from("lessons").select("title, week_number, manthan_question").eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("reflection_sessions").select("*").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("progress").select("anubhav_complete, flame_complete").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("practice_sessions").select("word_clarity_score, smoothness_score, natural_sound_score, composite_score, top_error_summary, master_message_audio_url").eq("user_id", user.id).eq("day_number", Number(dayNumber)).eq("status", "complete").order("submitted_at", { ascending: false }).maybeSingle(),
        supabase.from("writing_submissions").select("sentence_1, sentence_2, sentence_3, sentence_4, sentence_5").eq("user_id", user.id).eq("day_number", Number(dayNumber)).order("created_at", { ascending: false }).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).eq("course_id", COURSE_ID).maybeSingle(),
        supabase.from("lessons").select("recap_point_1, recap_point_2, recap_point_3, manthan_question").eq("course_id", COURSE_ID).eq("day_number", Number(dayNumber)).maybeSingle(),
      ]);

      setProfile(profileRes.data);
      setLesson(lessonRes.data);
      setPracticeSession(sessionRes.data);
      setWritings(writingsRes.data);
      setProgressSummary(progressSummaryRes.data ?? {});

      // Set recap points and manthan question from lesson detail
      const ld = lessonDetailRes.data;
      if (ld) {
        setRecapPoints([ld.recap_point_1, ld.recap_point_2, ld.recap_point_3].filter(Boolean) as string[]);
        setManthanQuestion(ld.manthan_question ?? "");
      }
      const flameComplete = progressRes.data?.flame_complete === true;
      const anubhavComplete = progressRes.data?.anubhav_complete === true;

      if (isReadOnlyMode && flameRes.data) {
        // Readonly mode: skip directly to readonly screen
        setExistingFlame(flameRes.data);
        setAiResponse(flameRes.data.ai_response || "");
        setConfRating(flameRes.data.confidence_rating || 0);
        setSpokeAbout(flameRes.data.spoke_about || "");
        setBiggestChallenge(flameRes.data.biggest_challenge || "");
        setTomorrowsIntention(flameRes.data.tomorrows_intention || "");
        setStreakCount(profileRes.data?.current_streak || 0);
        setScreen("readonly");
      } else if (flameComplete && flameRes.data) {
        setExistingFlame(flameRes.data);
        setAiResponse(flameRes.data.ai_response || "");
        setConfRating(flameRes.data.confidence_rating || 0);
        setSpokeAbout(flameRes.data.spoke_about || "");
        setBiggestChallenge(flameRes.data.biggest_challenge || "");
        setTomorrowsIntention(flameRes.data.tomorrows_intention || "");
        setStreakCount(profileRes.data?.current_streak || 0);
        setScreen("readonly");
      } else if (!anubhavComplete) {
        setScreen("gate");
      } else {
        setScreen("reflection");
      }
    };
    fetchData();
  }, [dayNumber, navigate]);

  useEffect(() => {
    if (screen !== "master-loading") return;
    const interval = setInterval(() => {
      setLoadingTextIdx(i => (i + 1) % loadingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [screen]);

  const calculateStreak = async (userId: string): Promise<number> => {
    // Calendar-date streak from practice_sessions.submitted_at converted to IST
    const { data } = await supabase
      .from("practice_sessions")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("course_id", COURSE_ID)
      .eq("status", "complete")
      .eq("is_best_attempt", true)
      .order("submitted_at", { ascending: false })
      .limit(60);

    if (!data || data.length === 0) return 1;

    const dateSet = new Set<string>();
    data.forEach(s => {
      if (s.submitted_at) {
        const d = new Date(s.submitted_at);
        const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
        dateSet.add(istDate);
      }
    });

    const sortedDates = Array.from(dateSet).sort().reverse();
    const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];

    let streak = 0;
    let checkDate = todayIST;
    for (const d of sortedDates) {
      if (d === checkDate) {
        streak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else if (d < checkDate) {
        break;
      }
    }

    return Math.max(streak, 1);
  };

  const reflectionValid = confRating > 0 && manthanAnswer.trim().length > 0;

  const submitReflection = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("reflection_sessions").insert({
      user_id: user.id,
      day_number: Number(dayNumber),
      course_id: COURSE_ID,
      flame_date: new Date().toISOString().split("T")[0],
      confidence_rating: confRating,
      spoke_about: manthanAnswer.trim(),
      manthan_answer: manthanAnswer.trim(),
      submitted_at: new Date().toISOString(),
    }).select("id").single();

    if (error) {
      toast.error("Could not save reflection");
      setSaving(false);
      return;
    }

    setFlameId(data.id);
    setSaving(false);
    setScreen("master-loading");
    setLoadingTextIdx(0);
    generateMasterResponse(data.id);
  };

  const generateMasterResponse = async (fId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const sentencesList = [writings?.sentence_1, writings?.sentence_2, writings?.sentence_3, writings?.sentence_4, writings?.sentence_5]
      .filter(Boolean).join("; ");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flame-response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            studentName: (profile?.full_name ?? "Friend").split(" ")[0],
            dayNumber: Number(dayNumber),
            lessonTitle: lesson?.title ?? "",
            masterName,
            confidenceRating: confRating,
            feltScore: confRating * 20,
            streakCount: profile?.current_streak ?? 0,
            wordClarityScore: practiceSession?.word_clarity_score,
            smoothnessScore: practiceSession?.smoothness_score,
            naturalSoundScore: practiceSession?.natural_sound_score,
            compositeScore: practiceSession?.composite_score,
            topErrorSummary: practiceSession?.top_error_summary,
            motherTongue: profile?.mother_tongue ?? "Hindi",
            mtiZone: profile?.mti_zone ?? "hindi_heartland",
            progressSummary,
            spokeAbout,
            biggestChallenge,
            tomorrowsIntention,
            writtenSentences: sentencesList,
          }),
        }
      );

      const data = await response.json();
      const responseText = data?.aiResponse ?? `${(profile?.full_name ?? "Friend").split(" ")[0]}, you did amazing today. Keep going! ✦`;
      setAiResponse(responseText);

      await supabase.from("reflection_sessions").update({
        ai_response: responseText,
        master_message_voice: data?.mastermessagevoice ?? null,
        ai_generated_at: new Date().toISOString(),
      }).eq("id", fId);

      setScreen("master");
    } catch (err) {
      console.error(err);
      const fallback = "You showed up today. That alone is legendary. ✦";
      setAiResponse(fallback);
      await supabase.from("reflection_sessions").update({ ai_response: fallback }).eq("id", fId);
      setScreen("master");
    }
  };

  const playVoice = async (text?: string, savedUrl?: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // If we have a saved URL, play directly without API call
    if (savedUrl) {
      try {
        const audio = new Audio(savedUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
        return;
      } catch { /* fall through */ }
    }

    setAudioLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flame-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text: text || aiResponse, masterName }),
        }
      );
      const data = await response.json();

      if (data?.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);

        if (flameId) {
          await supabase.from("reflection_sessions").update({
            elevenlabs_audio_url: `data:audio/mpeg;base64,${data.audioBase64}`,
          }).eq("id", flameId);
        }
      } else {
        throw new Error("No audio");
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(text || aiResponse);
      utterance.lang = "en-IN";
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } finally {
      setAudioLoading(false);
    }
  };

  const completeDay = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: existing } = await supabase.from("progress")
        .select("id").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle();

      if (existing) {
        await supabase.from("progress").update({
          flame_complete: true,
          day_complete: true,
          completed_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("progress").insert({
          user_id: user.id,
          day_number: Number(dayNumber),
          flame_complete: true,
          day_complete: true,
          completed_at: new Date().toISOString(),
        });
      }

      const streak = await calculateStreak(user.id);
      const { data: prof } = await supabase.from("profiles")
        .select("longest_streak").eq("id", user.id).single();

      await supabase.from("profiles").update({
        current_streak: streak,
        longest_streak: Math.max(streak, prof?.longest_streak || 0),
        last_flame_date: new Date().toISOString().split("T")[0],
      } as any).eq("id", user.id);

      setStreakCount(streak);

      const nextDay = Number(dayNumber) + 1;
      const { data: enroll } = await supabase.from("enrollments")
        .select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      if (enroll) {
        await supabase.rpc('update_own_enrollment_safe', {
          p_enrollment_id: enroll.id,
          p_current_day: nextDay,
          p_days_completed: Number(dayNumber),
        });
      }

      toast.success(`🔥 Day ${dayNumber} complete! Streak: ${streak}`);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Could not complete day");
    } finally {
      setSaving(false);
    }
  };

  const getStreakMessage = () => {
    if (streakCount >= 60) return "SIXTY DAYS. You did it. 🏆";
    if (streakCount >= 30) return "Halfway there — you are unstoppable 💪";
    if (streakCount >= 14) return "Two weeks strong! 🌟";
    if (streakCount >= 7) return "One full week! 🎯";
    return `${streakCount} Days in a Row 🔥`;
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#000e09" }}>
        <span className="text-6xl">🔥</span>
        <p className="text-sm mt-4" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Loading your flame...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#000e09" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <GlassButton onClick={() => navigate("/dashboard")} className="!px-3 !py-1.5 text-sm">← Back</GlassButton>
        <span className="font-bold text-base" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>🔥 Daily Flame</span>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>Day {dayNumber}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">

          {/* READ-ONLY MEMORY */}
          {screen === "readonly" && existingFlame && (
            <motion.div key="readonly" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="pb-8">
              <h2 className="text-xl font-bold text-center" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>
                Day {dayNumber} — Complete ✦
              </h2>
              <p className="text-xs text-center mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>
                {existingFlame.submitted_at ? new Date(existingFlame.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>

              <div className="flex justify-center mt-6 gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className="text-2xl">{i <= confRating ? <span style={{ color: "#ffc300" }}>★</span> : <span style={{ color: "rgba(255,252,239,0.15)" }}>☆</span>}</span>
                ))}
              </div>
              <p className="text-xs text-center mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>Confidence Rating</p>

              <div className="mt-6 space-y-4">
                {[
                  { label: "What I spoke about", value: existingFlame.spoke_about },
                  { label: "My biggest challenge", value: existingFlame.biggest_challenge },
                  { label: "Tomorrow I will practice", value: existingFlame.tomorrows_intention },
                ].map(item => item.value && (
                  <GoldCard key={item.label} padding="16px">
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>{item.label}</p>
                    <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>{item.value}</p>
                  </GoldCard>
                ))}
              </div>

              {practiceSession && (
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { label: "Word Clarity", score: practiceSession.word_clarity_score },
                    { label: "Smoothness", score: practiceSession.smoothness_score },
                    { label: "Natural Sound", score: practiceSession.natural_sound_score },
                  ].map(s => (
                    <GoldCard key={s.label} padding="12px">
                      <div className="text-center">
                        <p className="text-xl font-bold" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>{Math.round(Number(s.score) || 0)}</p>
                        <p className="text-[10px] mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>{s.label}</p>
                      </div>
                    </GoldCard>
                  ))}
                </div>
              )}

              {aiResponse && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>{masterName}'s Summary</p>
                  <GoldCard padding="20px" glow>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--fb)", color: "#fffcef" }}>{aiResponse}</p>
                  </GoldCard>
                  <GlassButton
                    onClick={() => playVoice(aiResponse, existingFlame.elevenlabs_audio_url)}
                    className="mt-3 mx-auto flex items-center gap-2 text-xs"
                  >
                    {audioLoading ? "Loading..." : isPlaying ? `⏸ Pause` : `▶ Hear ${masterName} Again`}
                  </GlassButton>
                </div>
              )}

              <GlassButton onClick={() => navigate("/flame")} className="w-full mt-8">
                ← Back to Flame
              </GlassButton>
            </motion.div>
          )}

          {/* GATE */}
          {screen === "gate" && (
            <motion.div key="gate" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.span className="text-6xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔒</motion.span>
              <h2 className="text-2xl font-bold text-center mt-6" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Your Flame is Waiting</h2>
              <p className="text-sm text-center mt-2 max-w-[260px]" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>
                Complete today's practice first to earn your Flame reward.
              </p>
              <GoldButton onClick={() => navigate(`/anubhav/${dayNumber}`)} className="mt-8">
                Go to Practice 🎯
              </GoldButton>
            </motion.div>
          )}

          {/* REFLECTION */}
          {screen === "reflection" && (
            <motion.div key="reflection" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-bold text-center" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Your Daily Flame</h2>
              <p className="text-xs text-center mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Day {dayNumber}</p>

              <div className="mt-6">
                <label className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>How confident did you feel today?</label>
                <div className="flex justify-center mt-3 gap-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => setConfRating(i)} className="text-4xl cursor-pointer transition-transform hover:scale-110">
                      {i <= confRating ? <span style={{ color: "#ffc300" }}>★</span> : <span style={{ color: "rgba(255,252,239,0.2)" }}>☆</span>}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>What did you speak about today?</label>
                  <textarea
                    value={spokeAbout}
                    onChange={e => setSpokeAbout(e.target.value.slice(0, 150))}
                    className="w-full mt-2 p-3 rounded-xl text-sm resize-none min-h-[80px] outline-none"
                    style={{ fontFamily: "var(--fb)", background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.1)", color: "#fffcef" }}
                    maxLength={150}
                  />
                  <p className="text-[10px] text-right mt-0.5" style={{ color: "rgba(255,252,239,0.2)" }}>{spokeAbout.length}/150</p>
                </div>

                <div>
                  <label className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>What felt most difficult today?</label>
                  <textarea
                    value={biggestChallenge}
                    onChange={e => setBiggestChallenge(e.target.value.slice(0, 150))}
                    className="w-full mt-2 p-3 rounded-xl text-sm resize-none min-h-[80px] outline-none"
                    style={{ fontFamily: "var(--fb)", background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.1)", color: "#fffcef" }}
                    maxLength={150}
                  />
                  <p className="text-[10px] text-right mt-0.5" style={{ color: "rgba(255,252,239,0.2)" }}>{biggestChallenge.length}/150</p>
                </div>

                <div>
                  <label className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>What will you say in English tomorrow?</label>
                  <textarea
                    value={tomorrowsIntention}
                    onChange={e => setTomorrowsIntention(e.target.value.slice(0, 100))}
                    className="w-full mt-2 p-3 rounded-xl text-sm resize-none min-h-[60px] outline-none"
                    style={{ fontFamily: "var(--fb)", background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.1)", color: "#fffcef" }}
                    maxLength={100}
                  />
                  <p className="text-[10px] text-right mt-0.5" style={{ color: "rgba(255,252,239,0.2)" }}>{tomorrowsIntention.length}/100</p>
                </div>
              </div>

              <GoldButton
                disabled={!reflectionValid || saving}
                onClick={submitReflection}
                fullWidth
                className="mt-6"
              >
                {saving ? "Saving..." : "Continue →"}
              </GoldButton>
            </motion.div>
          )}

          {/* MASTER LOADING */}
          {screen === "master-loading" && (
            <motion.div key="master-loading" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(253,193,65,0.15)", border: "2px solid rgba(253,193,65,0.3)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <img src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png" alt="UB" className="w-14 h-auto" />
              </motion.div>
              <motion.p
                key={loadingTextIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold text-center mt-6"
                style={{ fontFamily: "var(--fd)", color: "#ffc300" }}
              >
                {loadingTexts[loadingTextIdx].replace("{masterName}", masterName)}
              </motion.p>
              <div className="flex gap-2 mt-4">
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div key={i} className="w-2 h-2 bg-primary rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, delay: d, repeat: Infinity }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* MASTER RESPONSE */}
          {screen === "master" && (
            <motion.div key="master" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(253,193,65,0.2)", border: "2px solid rgba(253,193,65,0.4)", boxShadow: "0 0 20px rgba(253,193,65,0.2)" }}>
                  <span className="text-2xl font-bold" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>{masterName[0]}</span>
                </div>
                <p className="text-xs mt-2 text-center uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.4)" }}>{masterName}'s Summary</p>

                <motion.div
                  className="mt-4 w-full"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <GoldCard padding="24px" glow>
                    <p className="text-base leading-relaxed text-center" style={{ fontFamily: "var(--fb)", color: "#fffcef" }}>{aiResponse}</p>
                  </GoldCard>
                </motion.div>

                <GlassButton
                  onClick={() => playVoice()}
                  className="mt-4 flex items-center gap-2 text-sm"
                >
                  {audioLoading ? "Loading voice..." : isPlaying ? `⏸ Pause ${masterName}` : `▶ Hear ${masterName}`}
                </GlassButton>

                <GoldButton
                  onClick={() => setScreen("streak")}
                  fullWidth
                  className="mt-6"
                >
                  Continue to Complete Day →
                </GoldButton>
              </div>
            </motion.div>
          )}

          {/* STREAK & COMPLETION */}
          {screen === "streak" && (
            <motion.div key="streak" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="relative flex flex-col items-center" style={{ background: "radial-gradient(ellipse at center, rgba(254,209,65,0.05) 0%, transparent 70%)" }}>
                <Particles />
                <motion.div className="flex flex-col items-center relative z-10" initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.7, delay: 0.2 }}>
                  <motion.span className="text-[80px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🔥</motion.span>
                  <h2 className="text-3xl font-bold text-center mt-4" style={{ fontFamily: "var(--fd)", color: "#ffc300", filter: "drop-shadow(0 0 20px #fed141)" }}>
                    {getStreakMessage()}
                  </h2>

                  <div className="w-12 h-px mx-auto mt-5 mb-5" style={{ background: "rgba(253,193,65,0.3)" }} />

                  <GoldButton
                    onClick={completeDay}
                    disabled={saving}
                    fullWidth
                  >
                    {saving ? "Completing..." : `Complete Day ${dayNumber} ✦`}
                  </GoldButton>

                  <GlassButton onClick={() => navigate("/dashboard")} className="w-full mt-3">
                    ← Back to Home
                  </GlassButton>
                </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default FlamePage;
