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

/* ─── Challenge options ─── */
const challengeOptions = [
  { id: "pronunciation", label: "Pronunciation", emoji: "🗣️" },
  { id: "vocabulary", label: "Remembering words", emoji: "📚" },
  { id: "confidence", label: "Speaking confidently", emoji: "💪" },
  { id: "grammar", label: "Grammar", emoji: "✍️" },
  { id: "custom", label: "Something else...", emoji: "💭" },
];

const spokeChips = ["Introduced myself", "Described someone", "Asked questions", "Talked about today"];
const intentionChips = [
  "I will speak to someone in English",
  "I will use 3 new words",
  "I will practice for 10 minutes",
  "I will watch an English video",
];

const slideVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const FlamePage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<{ title: string; week_number: number | null } | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string;
    selected_master: string | null;
    current_streak: number | null;
  } | null>(null);
  const [existingFlame, setExistingFlame] = useState<any>(null);

  // Screen 0 = confidence rating (new), 1-3 = existing, 4 = generating, 5 = AI response, 6 = celebration
  const [currentScreen, setCurrentScreen] = useState(0);

  // Inputs
  const [confRating, setConfRating] = useState(0);
  const [spokeAbout, setSpokeAbout] = useState("");
  const [challenge, setChallenge] = useState("");
  const [customChallenge, setCustomChallenge] = useState("");
  const [intention, setIntention] = useState("");

  // AI
  const [aiResponse, setAiResponse] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const [lessonRes, profileRes, flameRes] = await Promise.all([
        supabase.from("lessons").select("title, week_number").eq("day_number", Number(dayNumber)).single(),
        supabase.from("profiles").select("full_name, selected_master, current_streak").eq("id", user.id).maybeSingle(),
        supabase.from("daily_flames").select("*").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
      ]);

      setLesson(lessonRes.data);
      setProfile(profileRes.data);

      if (flameRes.data) {
        setExistingFlame(flameRes.data);
        if ((flameRes.data as any).ai_response) {
          setAiResponse((flameRes.data as any).ai_response);
          setSpokeAbout((flameRes.data as any).spoke_about ?? "");
          setIntention((flameRes.data as any).tomorrows_intention ?? "");
          setConfRating((flameRes.data as any).confidence_rating ?? 0);
          setCurrentScreen(6);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [dayNumber, navigate]);

  // Normalize master name
  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";

  /* ─── Streak update helper ─── */
  const updateStreakAfterFlame = async (userId: string) => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const { data: prof } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_flame_date")
      .eq("id", userId)
      .single();

    let newStreak = 1;
    if (prof?.last_flame_date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      if (prof.last_flame_date === yStr) {
        newStreak = (prof.current_streak || 0) + 1;
      } else if (prof.last_flame_date === today) {
        newStreak = prof.current_streak || 1;
      }
    }

    const newLongest = Math.max(newStreak, prof?.longest_streak || 0);

    // Calculate next unlock: next 05:30 AM IST
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const unlock = new Date(nowIST);
    unlock.setHours(5, 30, 0, 0);
    if (nowIST >= unlock) {
      unlock.setDate(unlock.getDate() + 1);
    }

    await supabase.from("profiles").update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_flame_date: today,
      next_day_unlock_at: unlock.toISOString(),
    } as any).eq("id", userId);

    return newStreak;
  };

  /* ─── Generate AI Response ─── */
  const generateAIResponse = async () => {
    setCurrentScreen(4);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const finalChallenge = challenge === "custom"
      ? customChallenge
      : challengeOptions.find(c => c.id === challenge)?.label ?? challenge;

    try {
      const { data } = await supabase.functions.invoke("generate-flame-response", {
        body: {
          studentName: profile?.full_name ?? "Friend",
          dayNumber: Number(dayNumber),
          lessonTitle: lesson?.title ?? "",
          spokeAbout,
          biggestChallenge: finalChallenge,
          tomorrowsIntention: intention,
          masterName,
          confidenceRating: confRating,
        },
      });

      const responseText = data?.aiResponse ?? `${profile?.full_name ?? "Friend"}, you did amazing today. Keep going! ✦`;
      setAiResponse(responseText);

      // Save to DB
      const { data: existing } = await supabase.from("daily_flames")
        .select("id").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle();

      const payload = {
        spoke_about: spokeAbout,
        biggest_challenge: finalChallenge,
        tomorrows_intention: intention,
        confidence_rating: confRating,
        ai_response: responseText,
        ai_generated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("daily_flames").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("daily_flames").insert({
          user_id: user.id,
          day_number: Number(dayNumber),
          flame_date: new Date().toISOString().split("T")[0],
          submitted_at: new Date().toISOString(),
          ...payload,
        });
      }

      // Update streak
      const newStreak = await updateStreakAfterFlame(user.id);
      setProfile(prev => prev ? { ...prev, current_streak: newStreak } : prev);

      setCurrentScreen(5);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate response");
      setAiResponse("You showed up today. That alone is legendary. ✦");
      setCurrentScreen(5);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Play Voice ─── */
  const playVoice = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setAudioLoading(true);
    try {
      const { data } = await supabase.functions.invoke("generate-flame-voice", {
        body: { text: aiResponse, masterName },
      });

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
      utterance.pitch = 1.05;
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } finally {
      setAudioLoading(false);
    }
  };

  /* ─── WhatsApp Share ─── */
  const shareToWhatsApp = () => {
    const name = profile?.full_name ?? "I";
    const streak = profile?.current_streak ?? 1;
    const message =
      `🔥 Day ${dayNumber} Complete!\n\n` +
      `${name} just finished Day ${dayNumber} of the Aarambh English journey on Ujjwal Bhavishya!\n\n` +
      `🔥 ${streak} day streak\n✦ "${spokeAbout}"\n\n` +
      `Start your journey: ujjwalbhavishya.co.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="text-6xl animate-pulse">🔥</span>
        <p className="text-sm text-foreground/40 mt-4 font-body">Loading your flame...</p>
      </div>
    );
  }

  const Chip = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
    <button
      onClick={onSelect}
      className={`glass-card px-3 py-2 rounded-full text-sm font-body cursor-pointer border transition-colors ${
        selected ? "border-primary bg-primary/10 text-primary" : "border-foreground/10 hover:border-primary/40 text-foreground/70"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-foreground/40 font-body">← Back</button>
        <span className="font-display font-bold text-primary text-base">🔥 Daily Flame</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-body">Day {dayNumber}</span>
      </div>

      {/* Progress dots (screens 0-3) */}
      {currentScreen <= 3 && (
        <div className="flex items-center justify-center gap-2 pb-3">
          {[0, 1, 2, 3].map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === currentScreen ? "bg-primary" : s < currentScreen ? "bg-primary/60" : "bg-foreground/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {/* ─── SCREEN 0: Confidence Rating (NEW) ─── */}
          {currentScreen === 0 && (
            <motion.div key="s0" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">{masterName[0]}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-2 font-body">{masterName} asks...</p>
                <h2 className="font-display text-xl font-bold text-foreground text-center mt-3">How confident did you feel today?</h2>
                <p className="text-sm text-foreground/40 text-center mt-1 font-body">Be honest — this helps track your growth</p>
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
                onClick={() => setCurrentScreen(1)}
                className="w-full mt-8 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 1: Spoke About ─── */}
          {currentScreen === 1 && (
            <motion.div key="s1" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">{masterName[0]}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-2 font-body">{masterName} asks...</p>
                <h2 className="font-display text-xl font-bold text-foreground text-center mt-3">What did you speak about today?</h2>
                {lesson?.title && <p className="text-xs text-foreground/30 text-center mt-1 font-body">Lesson: {lesson.title}</p>}
              </div>

              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {spokeChips.map(chip => (
                  <Chip key={chip} label={chip} selected={spokeAbout === chip} onSelect={() => setSpokeAbout(chip)} />
                ))}
              </div>

              <textarea
                className="w-full mt-4 min-h-[100px] bg-foreground/5 rounded-2xl border border-foreground/10 focus:border-primary p-4 text-sm font-body text-foreground placeholder:text-foreground/30 outline-none resize-none transition-colors"
                placeholder="Or write in your own words... (in English or Hindi, anything works!)"
                value={spokeAbout}
                onChange={e => setSpokeAbout(e.target.value)}
              />

              <button
                disabled={!spokeAbout.trim()}
                onClick={() => setCurrentScreen(2)}
                className="w-full mt-4 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                Next →
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 2: Challenge ─── */}
          {currentScreen === 2 && (
            <motion.div key="s2" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <h2 className="font-display text-xl font-bold text-foreground text-center">What was your biggest challenge today?</h2>

              <div className="mt-4 flex flex-col gap-3">
                {challengeOptions.map(opt => (
                  <div key={opt.id}>
                    <button
                      onClick={() => setChallenge(opt.id)}
                      className={`w-full glass-card p-4 rounded-2xl cursor-pointer flex items-center gap-3 border transition-colors ${
                        challenge === opt.id ? "border-primary/60 bg-primary/5" : "border-foreground/10"
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <span className="text-sm font-body font-semibold text-foreground">{opt.label}</span>
                    </button>
                    <AnimatePresence>
                      {opt.id === "custom" && challenge === "custom" && (
                        <motion.textarea
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="w-full mt-2 bg-foreground/5 rounded-xl border border-foreground/10 focus:border-primary p-3 text-sm font-body text-foreground placeholder:text-foreground/30 outline-none resize-none"
                          placeholder="Tell me more..."
                          value={customChallenge}
                          onChange={e => setCustomChallenge(e.target.value)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <button
                disabled={!challenge || (challenge === "custom" && !customChallenge.trim())}
                onClick={() => setCurrentScreen(3)}
                className="w-full mt-4 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                Next →
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 3: Intention ─── */}
          {currentScreen === 3 && (
            <motion.div key="s3" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <h2 className="font-display text-xl font-bold text-foreground text-center">What will you practice tomorrow?</h2>
              <p className="text-sm text-foreground/40 text-center mt-1 font-body">One sentence. Your promise to yourself.</p>

              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {intentionChips.map(chip => (
                  <Chip key={chip} label={chip} selected={intention === chip} onSelect={() => setIntention(chip)} />
                ))}
              </div>

              <textarea
                className="w-full mt-3 min-h-[80px] bg-foreground/5 rounded-2xl border border-foreground/10 focus:border-primary p-4 text-sm font-body text-foreground placeholder:text-foreground/30 outline-none resize-none transition-colors"
                placeholder="Write your intention..."
                value={intention}
                onChange={e => setIntention(e.target.value)}
              />

              <div className="glass-card mt-4 p-4 rounded-2xl">
                <p className="text-xs font-body text-foreground/30 text-center italic">
                  ✦ Every intention you set becomes the foundation of tomorrow's confidence.
                </p>
              </div>

              <button
                disabled={!intention.trim()}
                onClick={generateAIResponse}
                className="w-full mt-4 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                Light My Flame 🔥
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 4: Generating ─── */}
          {currentScreen === 4 && (
            <motion.div key="s4" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }} className="flex flex-col items-center justify-center min-h-[50vh]">
              <motion.span
                className="text-7xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                🔥
              </motion.span>
              <p className="font-display text-lg font-bold text-primary text-center mt-6">{masterName} is reading your reflection...</p>
              <p className="text-sm text-foreground/40 text-center mt-2 font-body">Crafting your personal message</p>
              <div className="flex gap-2 justify-center mt-6">
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, delay: d, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── SCREEN 5: AI Response ─── */}
          {currentScreen === 5 && (
            <motion.div key="s5" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center" style={{ boxShadow: "0 0 20px hsl(44 99% 68% / 0.2)" }}>
                  <span className="text-2xl font-bold text-primary">{masterName[0]}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-2 text-center uppercase tracking-wider font-body">{masterName}'s Message for You</p>
              </div>

              <motion.div
                className="glass-card-gold mt-4 p-6 rounded-3xl"
                style={{ boxShadow: "0 0 30px rgba(254,209,65,0.1)" }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <p className="font-body text-base text-foreground leading-relaxed text-center">{aiResponse}</p>
              </motion.div>

              <div className="flex items-center justify-center mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={playVoice}
                  className="glass-card px-5 py-3 rounded-full text-sm font-body font-medium border border-primary/30 bg-primary/10 text-primary flex items-center gap-2"
                >
                  {audioLoading ? (
                    <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⏳</motion.span> Loading voice...</>
                  ) : isPlaying ? (
                    <>⏸ Pause {masterName}</>
                  ) : (
                    <>▶ Hear {masterName} Speak</>
                  )}
                </motion.button>
              </div>

              <button
                onClick={() => setCurrentScreen(6)}
                className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold text-base active:scale-[0.98] transition-transform"
              >
                Light My Flame 🔥
              </button>
            </motion.div>
          )}

          {/* ─── SCREEN 6: Flame is Lit ─── */}
          {currentScreen === 6 && (
            <motion.div key="s6" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
              <div
                className="relative flex flex-col items-center"
                style={{ background: "radial-gradient(ellipse at center, rgba(254,209,65,0.05) 0%, transparent 70%)" }}
              >
                <Particles />

                <motion.div
                  className="flex flex-col items-center relative z-10"
                  initial={{ scale: 0.8, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.7, delay: 0.2 }}
                >
                  <motion.span
                    className="text-[80px] text-center"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    🔥
                  </motion.span>

                  <h2 className="font-display text-3xl font-bold text-primary text-center mt-4" style={{ filter: "drop-shadow(0 0 20px #fed141)" }}>
                    Your Flame is Lit!
                  </h2>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-xl">🔥</span>
                    <span className="font-display text-xl font-bold text-primary">{profile?.current_streak ?? 1} day streak</span>
                    <span className="text-sm text-foreground/50 font-body">and growing ✦</span>
                  </div>

                  <div className="w-12 h-px bg-primary/30 mx-auto mt-5 mb-5" />

                  {spokeAbout && (
                    <div className="glass-card p-4 rounded-2xl mt-2 w-full">
                      <p className="text-[10px] text-foreground/30 uppercase tracking-wider font-body">You said:</p>
                      <p className="text-sm font-body text-foreground/70 italic mt-1 line-clamp-2">{spokeAbout}</p>
                    </div>
                  )}

                  {intention && (
                    <div className="glass-card p-4 rounded-2xl mt-3 w-full">
                      <p className="text-[10px] text-foreground/30 uppercase tracking-wider font-body">Tomorrow you will:</p>
                      <p className="text-sm font-body text-primary mt-1 line-clamp-2">{intention}</p>
                    </div>
                  )}

                  <button
                    onClick={shareToWhatsApp}
                    className="w-full mt-5 py-4 rounded-2xl font-body font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: "#25D366", color: "#fff" }}
                  >
                    📱 Share on WhatsApp
                  </button>

                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full mt-3 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl active:scale-[0.98] transition-transform"
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
