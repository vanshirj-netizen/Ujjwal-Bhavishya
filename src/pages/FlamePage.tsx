import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

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

  const [screen, setScreen] = useState<FlameScreen>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [existingFlame, setExistingFlame] = useState<any>(null);
  const [practiceSession, setPracticeSession] = useState<any>(null);
  const [writings, setWritings] = useState<any>(null);

  // Reflection inputs
  const [confRating, setConfRating] = useState(0);
  const [spokeAbout, setSpokeAbout] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [tomorrowsIntention, setTomorrowsIntention] = useState("");

  // Master response
  const [aiResponse, setAiResponse] = useState("");
  const [flameId, setFlameId] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);

  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Loading text cycling
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const [profileRes, lessonRes, flameRes, progressRes, sessionRes, writingsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, selected_master, current_streak, longest_streak").eq("id", user.id).maybeSingle(),
        supabase.from("lessons").select("title, week_number").eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("daily_flames").select("*").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("progress").select("anubhav_complete, flame_complete").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("anubhav_practice_sessions").select("word_clarity_score, smoothness_score, natural_sound_score, top_error_summary").eq("user_id", user.id).eq("day_number", Number(dayNumber)).eq("status", "complete").order("submitted_at", { ascending: false }).maybeSingle(),
        supabase.from("anubhav_writings").select("sentence_1, sentence_2, sentence_3, sentence_4, sentence_5").eq("user_id", user.id).eq("day_number", Number(dayNumber)).order("created_at", { ascending: false }).maybeSingle(),
      ]);

      setProfile(profileRes.data);
      setLesson(lessonRes.data);
      setPracticeSession(sessionRes.data);
      setWritings(writingsRes.data);

      const flameComplete = progressRes.data?.flame_complete === true;
      const anubhavComplete = progressRes.data?.anubhav_complete === true;

      if (flameComplete && flameRes.data) {
        // Read-only memory
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

  // Loading text cycling for master screen
  useEffect(() => {
    if (screen !== "master-loading") return;
    const interval = setInterval(() => {
      setLoadingTextIdx(i => (i + 1) % loadingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [screen]);

  const calculateStreak = async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from("progress")
      .select("day_number")
      .eq("user_id", userId)
      .eq("day_complete", true)
      .order("day_number", { ascending: false });

    if (!data || data.length === 0) return 1;
    const days = data.map(d => d.day_number).sort((a, b) => b - a);
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i - 1] - days[i] === 1) streak++;
      else break;
    }
    return streak;
  };

  const reflectionValid = confRating > 0 && spokeAbout.trim().length > 0 && biggestChallenge.trim().length > 0 && tomorrowsIntention.trim().length > 0;

  const submitReflection = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("daily_flames").insert({
      user_id: user.id,
      day_number: Number(dayNumber),
      flame_date: new Date().toISOString().split("T")[0],
      confidence_rating: confRating,
      spoke_about: spokeAbout.trim(),
      biggest_challenge: biggestChallenge.trim(),
      tomorrows_intention: tomorrowsIntention.trim(),
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

    // Build written sentences string
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
            studentName: profile?.full_name ?? "Friend",
            dayNumber: Number(dayNumber),
            lessonTitle: lesson?.title ?? "",
            masterName,
            confidenceRating: confRating,
            streak_count: streakCount,
            word_clarity_score: practiceSession?.word_clarity_score,
            smoothness_score: practiceSession?.smoothness_score,
            natural_sound_score: practiceSession?.natural_sound_score,
            top_error_summary: practiceSession?.top_error_summary,
            spokeAbout,
            biggestChallenge,
            tomorrowsIntention,
            written_sentences: sentencesList,
          }),
        }
      );

      const data = await response.json();
      const responseText = data?.aiResponse ?? `${profile?.full_name ?? "Friend"}, you did amazing today. Keep going! ✦`;
      setAiResponse(responseText);

      // Save to daily_flames
      await supabase.from("daily_flames").update({
        ai_response: responseText,
        ai_generated_at: new Date().toISOString(),
      }).eq("id", fId);

      setScreen("master");
    } catch (err) {
      console.error(err);
      const fallback = "You showed up today. That alone is legendary. ✦";
      setAiResponse(fallback);
      await supabase.from("daily_flames").update({ ai_response: fallback }).eq("id", fId);
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

    // If we have a saved ElevenLabs URL, play that directly
    if (savedUrl) {
      try {
        const audio = new Audio(savedUrl);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
        return;
      } catch { /* fall through to generate */ }
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

        // Save elevenlabs URL to flame if we have a flameId
        if (flameId) {
          await supabase.from("daily_flames").update({
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
        await supabase.from("enrollments").update({
          current_day: nextDay,
          days_completed: Number(dayNumber),
        }).eq("id", enroll.id);
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="text-6xl animate-pulse">🔥</span>
        <p className="text-sm text-foreground/40 mt-4 font-body">Loading your flame...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-foreground/40 font-body">← Back</button>
        <span className="font-display font-bold text-primary text-base">🔥 Daily Flame</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-body">Day {dayNumber}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">

          {/* ─── READ-ONLY MEMORY ─── */}
          {screen === "readonly" && existingFlame && (
            <motion.div key="readonly" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="pb-8">
              <h2 className="font-display text-xl font-bold text-foreground text-center">
                Day {dayNumber} — Complete ✦
              </h2>
              <p className="text-xs text-foreground/30 text-center mt-1 font-body">
                {existingFlame.submitted_at ? new Date(existingFlame.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </p>

              {/* Confidence stars */}
              <div className="flex justify-center mt-6 gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className="text-2xl">{i <= confRating ? <span className="text-primary">★</span> : <span className="text-foreground/15">☆</span>}</span>
                ))}
              </div>
              <p className="text-xs text-foreground/30 text-center mt-1 font-body">Confidence Rating</p>

              {/* Reflection answers */}
              <div className="mt-6 space-y-4">
                {[
                  { label: "What I spoke about", value: existingFlame.spoke_about },
                  { label: "My biggest challenge", value: existingFlame.biggest_challenge },
                  { label: "Tomorrow I will practice", value: existingFlame.tomorrows_intention },
                ].map(item => item.value && (
                  <div key={item.label} className="glass-card p-4 rounded-xl">
                    <p className="text-[10px] text-foreground/30 uppercase tracking-wider font-body">{item.label}</p>
                    <p className="text-sm text-foreground/70 font-body mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Anubhav scores */}
              {practiceSession && (
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { label: "Word Clarity", score: practiceSession.word_clarity_score },
                    { label: "Smoothness", score: practiceSession.smoothness_score },
                    { label: "Natural Sound", score: practiceSession.natural_sound_score },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-3 rounded-xl text-center">
                      <p className="font-display text-xl font-bold text-foreground">{Math.round(Number(s.score) || 0)}</p>
                      <p className="text-[10px] text-foreground/40 font-body mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Master feedback */}
              {aiResponse && (
                <div className="mt-6">
                  <p className="text-xs text-foreground/30 uppercase tracking-widest font-body mb-3">{masterName}'s Summary</p>
                  <div className={`p-5 rounded-2xl border ${masterName === "Gyani" ? "border-primary/40 glass-card-gold" : "border-blue-400/40 glass-card"}`}>
                    <p className="text-sm font-body text-foreground leading-relaxed">{aiResponse}</p>
                  </div>
                  <button
                    onClick={() => playVoice(aiResponse, existingFlame.elevenlabs_audio_url)}
                    className="mt-3 glass-card px-4 py-2 rounded-full text-xs font-body border border-primary/30 text-primary flex items-center gap-2 mx-auto"
                  >
                    {audioLoading ? "Loading..." : isPlaying ? `⏸ Pause` : `▶ Hear ${masterName} Again`}
                  </button>
                </div>
              )}

              <button onClick={() => navigate("/dashboard")} className="w-full mt-8 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl">
                ← Back to Home
              </button>
            </motion.div>
          )}

          {/* ─── GATE ─── */}
          {screen === "gate" && (
            <motion.div key="gate" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.span className="text-6xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔒</motion.span>
              <h2 className="font-display text-2xl font-bold text-foreground text-center mt-6">Your Flame is Waiting</h2>
              <p className="text-sm text-foreground/50 font-body text-center mt-2 max-w-[260px]">
                Complete today's practice first to earn your Flame reward.
              </p>
              <button onClick={() => navigate(`/anubhav/${dayNumber}`)} className="mt-8 bg-primary text-primary-foreground py-4 px-8 rounded-2xl font-body font-bold text-base">
                Go to Practice 🎯
              </button>
            </motion.div>
          )}

          {/* ─── REFLECTION ─── */}
          {screen === "reflection" && (
            <motion.div key="reflection" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <h2 className="font-display text-xl font-bold text-foreground text-center">Your Daily Flame</h2>
              <p className="text-xs text-foreground/40 text-center font-body mt-1">Day {dayNumber}</p>

              {/* Confidence stars */}
              <div className="mt-6">
                <label className="text-sm font-body text-foreground/60">How confident did you feel today?</label>
                <div className="flex justify-center mt-3 gap-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => setConfRating(i)} className="text-4xl cursor-pointer transition-transform hover:scale-110">
                      {i <= confRating ? <span className="text-primary">★</span> : <span className="text-foreground/20">☆</span>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Text inputs */}
              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-sm font-body text-foreground/60">What did you speak about today?</label>
                  <textarea
                    value={spokeAbout}
                    onChange={e => setSpokeAbout(e.target.value.slice(0, 150))}
                    className="w-full mt-2 p-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:border-primary outline-none font-body text-sm text-foreground resize-none min-h-[80px]"
                    maxLength={150}
                  />
                  <p className="text-[10px] text-foreground/20 text-right mt-0.5">{spokeAbout.length}/150</p>
                </div>

                <div>
                  <label className="text-sm font-body text-foreground/60">What felt most difficult today?</label>
                  <textarea
                    value={biggestChallenge}
                    onChange={e => setBiggestChallenge(e.target.value.slice(0, 150))}
                    className="w-full mt-2 p-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:border-primary outline-none font-body text-sm text-foreground resize-none min-h-[80px]"
                    maxLength={150}
                  />
                  <p className="text-[10px] text-foreground/20 text-right mt-0.5">{biggestChallenge.length}/150</p>
                </div>

                <div>
                  <label className="text-sm font-body text-foreground/60">What will you say in English tomorrow?</label>
                  <textarea
                    value={tomorrowsIntention}
                    onChange={e => setTomorrowsIntention(e.target.value.slice(0, 100))}
                    className="w-full mt-2 p-3 rounded-xl bg-foreground/5 border border-foreground/10 focus:border-primary outline-none font-body text-sm text-foreground resize-none min-h-[60px]"
                    maxLength={100}
                  />
                  <p className="text-[10px] text-foreground/20 text-right mt-0.5">{tomorrowsIntention.length}/100</p>
                </div>
              </div>

              <button
                disabled={!reflectionValid || saving}
                onClick={submitReflection}
                className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40"
              >
                {saving ? "Saving..." : "Continue →"}
              </button>
            </motion.div>
          )}

          {/* ─── MASTER LOADING ─── */}
          {screen === "master-loading" && (
            <motion.div key="master-loading" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.div
                className="w-20 h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <img src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png" alt="UB" className="w-14 h-auto" />
              </motion.div>
              <motion.p
                key={loadingTextIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-lg font-bold text-primary text-center mt-6"
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

          {/* ─── MASTER RESPONSE ─── */}
          {screen === "master" && (
            <motion.div key="master" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center" style={{ boxShadow: "0 0 20px hsl(44 99% 68% / 0.2)" }}>
                  <span className="text-2xl font-bold text-primary">{masterName[0]}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-2 text-center uppercase tracking-wider font-body">{masterName}'s Summary</p>

                <motion.div
                  className={`mt-4 p-6 rounded-3xl w-full ${masterName === "Gyani" ? "glass-card-gold" : "glass-card border border-blue-400/40"}`}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <p className="font-body text-base text-foreground leading-relaxed text-center">{aiResponse}</p>
                </motion.div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playVoice()}
                  className="mt-4 glass-card px-5 py-3 rounded-full text-sm font-body font-medium border border-primary/30 bg-primary/10 text-primary flex items-center gap-2"
                >
                  {audioLoading ? "Loading voice..." : isPlaying ? `⏸ Pause ${masterName}` : `▶ Hear ${masterName}`}
                </motion.button>

                <button
                  onClick={() => setScreen("streak")}
                  className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base"
                >
                  Continue to Complete Day →
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STREAK & COMPLETION ─── */}
          {screen === "streak" && (
            <motion.div key="streak" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="relative flex flex-col items-center" style={{ background: "radial-gradient(ellipse at center, rgba(254,209,65,0.05) 0%, transparent 70%)" }}>
                <Particles />
                <motion.div className="flex flex-col items-center relative z-10" initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.7, delay: 0.2 }}>
                  <motion.span className="text-[80px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🔥</motion.span>
                  <h2 className="font-display text-3xl font-bold text-primary text-center mt-4" style={{ filter: "drop-shadow(0 0 20px #fed141)" }}>
                    {getStreakMessage()}
                  </h2>

                  <div className="w-12 h-px bg-primary/30 mx-auto mt-5 mb-5" />

                  <button
                    onClick={completeDay}
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40"
                  >
                    {saving ? "Completing..." : `Complete Day ${dayNumber} ✦`}
                  </button>

                  <button onClick={() => navigate("/dashboard")} className="w-full mt-3 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl">
                    ← Back to Home
                  </button>
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
