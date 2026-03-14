import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

/* ─── Particles ─── */
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

const FlamePage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<{ title: string; week_number: number | null } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [existingFlame, setExistingFlame] = useState<any>(null);
  const [anubhavComplete, setAnubhavComplete] = useState<boolean | null>(null);
  const [practiceSession, setPracticeSession] = useState<any>(null);

  // Screen: gate | 0 (confidence) | 1 (celebration) | 2 (streak)
  const [currentScreen, setCurrentScreen] = useState<"gate" | 0 | 1 | 2>("gate");

  const [confRating, setConfRating] = useState(0);
  const [aiResponse, setAiResponse] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const [lessonRes, profileRes, flameRes, progressRes, sessionRes] = await Promise.all([
        supabase.from("lessons").select("title, week_number").eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("profiles").select("full_name, selected_master, current_streak").eq("id", user.id).maybeSingle(),
        supabase.from("daily_flames").select("*").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("progress").select("anubhav_complete").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
        supabase.from("anubhav_practice_sessions").select("word_clarity_score, smoothness_score, natural_sound_score, top_error_summary").eq("user_id", user.id).eq("day_number", Number(dayNumber)).eq("status", "complete").order("submitted_at", { ascending: false }).maybeSingle(),
      ]);

      setLesson(lessonRes.data);
      setProfile(profileRes.data);
      setPracticeSession(sessionRes.data);

      const isComplete = progressRes.data?.anubhav_complete === true;
      setAnubhavComplete(isComplete);

      if (flameRes.data) {
        setExistingFlame(flameRes.data);
        if ((flameRes.data as any).ai_response) {
          setAiResponse((flameRes.data as any).ai_response);
          setConfRating((flameRes.data as any).confidence_rating ?? 0);
          setStreakCount(profileRes.data?.current_streak || 0);
          setCurrentScreen(2);
        } else if (isComplete) {
          setCurrentScreen(0);
        } else {
          setCurrentScreen("gate");
        }
      } else if (isComplete) {
        setCurrentScreen(0);
      } else {
        setCurrentScreen("gate");
      }

      setLoading(false);
    };
    fetchData();
  }, [dayNumber, navigate]);

  // Calculate streak from progress table
  const calculateStreak = async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from("progress")
      .select("day_number")
      .eq("user_id", userId)
      .eq("day_complete", true)
      .order("day_number", { ascending: false });

    if (!data || data.length === 0) return 1;

    let streak = 0;
    const days = data.map(d => d.day_number).sort((a, b) => b - a);
    for (let i = 0; i < days.length; i++) {
      if (i === 0) { streak = 1; continue; }
      if (days[i - 1] - days[i] === 1) { streak++; }
      else break;
    }
    return streak;
  };

  const generateCelebration = async () => {
    setSaving(true);
    setCurrentScreen(1);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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
            spokeAbout: "",
            biggestChallenge: "",
            tomorrowsIntention: "",
          }),
        }
      );

      const data = await response.json();
      const responseText = data?.aiResponse ?? `${profile?.full_name ?? "Friend"}, you did amazing today. Keep going! ✦`;
      setAiResponse(responseText);

      // Save flame
      const payload = {
        confidence_rating: confRating,
        ai_response: responseText,
        ai_generated_at: new Date().toISOString(),
      };

      if (existingFlame) {
        await supabase.from("daily_flames").update(payload).eq("id", existingFlame.id);
      } else {
        await supabase.from("daily_flames").insert({
          user_id: session.user.id,
          day_number: Number(dayNumber),
          flame_date: new Date().toISOString().split("T")[0],
          submitted_at: new Date().toISOString(),
          ...payload,
        });
      }

      setCurrentScreen(1);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate celebration");
      setAiResponse("You showed up today. That alone is legendary. ✦");
      setCurrentScreen(1);
    } finally {
      setSaving(false);
    }
  };

  const playVoice = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
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
          body: JSON.stringify({ text: aiResponse, masterName }),
        }
      );
      const data = await response.json();

      if (data?.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
      } else {
        throw new Error("No audio");
      }
    } catch {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(aiResponse);
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
      // Update progress: flame_complete + day_complete
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

      // Calculate streak and update profile
      const streak = await calculateStreak(user.id);
      const { data: prof } = await supabase.from("profiles")
        .select("longest_streak").eq("id", user.id).single();

      await supabase.from("profiles").update({
        current_streak: streak,
        longest_streak: Math.max(streak, prof?.longest_streak || 0),
        last_flame_date: new Date().toISOString().split("T")[0],
      } as any).eq("id", user.id);

      setStreakCount(streak);

      // Update enrollment
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
    if (streakCount >= 30) return "Halfway there! You are unstoppable. 💪";
    if (streakCount >= 14) return "Two weeks strong! 🌟";
    if (streakCount >= 7) return "One full week! 🎯";
    return `${streakCount} Days in a Row 🔥`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="text-6xl animate-pulse">🔥</span>
        <p className="text-sm text-foreground/40 mt-4 font-body">Loading your flame...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-foreground/40 font-body">← Back</button>
        <span className="font-display font-bold text-primary text-base">🔥 Daily Flame</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-body">Day {dayNumber}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {/* ─── GATE SCREEN ─── */}
          {currentScreen === "gate" && (
            <motion.div key="gate" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.span className="text-6xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔒</motion.span>
              <h2 className="font-display text-2xl font-bold text-foreground text-center mt-6">Your Flame is Waiting</h2>
              <p className="text-sm text-foreground/50 font-body text-center mt-2 max-w-[260px]">
                Complete today's practice first to earn your Flame reward.
              </p>
              <button
                onClick={() => navigate(`/anubhav/${dayNumber}`)}
                className="mt-8 bg-primary text-primary-foreground py-4 px-8 rounded-2xl font-body font-bold text-base"
              >
                Go to Practice 🎯
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 0: Confidence Rating ─── */}
          {currentScreen === 0 && (
            <motion.div key="s0" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">{masterName[0]}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-2 font-body">{masterName} asks...</p>
                <h2 className="font-display text-xl font-bold text-foreground text-center mt-3">How confident did you feel today?</h2>
                <p className="text-sm text-foreground/40 text-center mt-1 font-body">Be honest — this helps track your growth 😊</p>
              </div>

              <div className="flex justify-center mt-8 gap-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setConfRating(i)}
                    className="text-4xl cursor-pointer transition-transform hover:scale-110"
                  >
                    {i <= confRating ? <span className="text-primary">★</span> : <span className="text-foreground/20">☆</span>}
                  </motion.button>
                ))}
              </div>

              <button
                disabled={confRating === 0}
                onClick={generateCelebration}
                className="w-full mt-8 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 1: Master Celebration (loading + response) ─── */}
          {currentScreen === 1 && (
            <motion.div key="s1" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              {saving ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <img
                      src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png"
                      alt="UB"
                      className="w-14 h-auto"
                    />
                  </motion.div>
                  <p className="font-display text-lg font-bold text-primary text-center mt-6">{masterName} is celebrating with you...</p>
                  <div className="flex gap-2 mt-4">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <motion.div key={i} className="w-2 h-2 bg-primary rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center" style={{ boxShadow: "0 0 20px hsl(44 99% 68% / 0.2)" }}>
                    <span className="text-2xl font-bold text-primary">{masterName[0]}</span>
                  </div>
                  <p className="text-xs text-foreground/40 mt-2 text-center uppercase tracking-wider font-body">{masterName}'s Celebration</p>

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
                    onClick={playVoice}
                    className="mt-4 glass-card px-5 py-3 rounded-full text-sm font-body font-medium border border-primary/30 bg-primary/10 text-primary flex items-center gap-2"
                  >
                    {audioLoading ? "Loading voice..." : isPlaying ? `⏸ Pause ${masterName}` : `▶ Hear ${masterName} Celebrate`}
                  </motion.button>

                  <button
                    onClick={() => setCurrentScreen(2)}
                    className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── SCREEN 2: Streak Celebration ─── */}
          {currentScreen === 2 && (
            <motion.div key="s2" variants={slideVariants} initial="initial" animate="animate" exit="exit">
              <div className="relative flex flex-col items-center" style={{ background: "radial-gradient(ellipse at center, rgba(254,209,65,0.05) 0%, transparent 70%)" }}>
                <Particles />
                <motion.div className="flex flex-col items-center relative z-10" initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.7, delay: 0.2 }}>
                  <motion.span className="text-[80px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🔥</motion.span>
                  <h2 className="font-display text-3xl font-bold text-primary text-center mt-4" style={{ filter: "drop-shadow(0 0 20px #fed141)" }}>
                    {getStreakMessage()}
                  </h2>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-xl">🔥</span>
                    <span className="font-display text-xl font-bold text-primary">{streakCount || profile?.current_streak || 1} day streak</span>
                  </div>

                  <div className="w-12 h-px bg-primary/30 mx-auto mt-5 mb-5" />

                  <button
                    onClick={completeDay}
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40"
                  >
                    {saving ? "Completing..." : `Complete Day ${dayNumber} ✦`}
                  </button>

                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full mt-3 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl"
                  >
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
