import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const COURSE_ID = "6a860163-ea3c-4205-89b3-74a3e9be098f";

const toEmbedUrl = (url: string): string => {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1`;
  }
  if (url.includes("watch?v=")) {
    const id = url.split("watch?v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1`;
  }
  return url;
};

const steps = [
  { id: 1, label: "Lesson" },
  { id: 2, label: "Gyani" },
  { id: 3, label: "Gyanu" },
  { id: 4, label: "Quiz" },
  { id: 5, label: "Score" },
  { id: 6, label: "🔥" },
];

const Particles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * 360;
      const distance = 120 + (i % 5) * 30;
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      const size = 4 + (i % 4) * 2;
      const delay = (i % 10) * 0.05;
      return (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary"
          style={{ width: size, height: size, left: "50%", top: "50%", marginLeft: -size / 2, marginTop: -size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x, y, opacity: [1, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
        />
      );
    })}
  </div>
);

const StepDot = ({ step, currentStep, completedSteps }: { step: typeof steps[0]; currentStep: number; completedSteps: number[] }) => {
  const isDone = completedSteps.includes(step.id);
  const isActive = currentStep === step.id;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        isDone
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary))]"
          : isActive
            ? "border-2 border-primary bg-primary/20"
            : "border border-foreground/20"
      }`}>
        {isDone ? (
          <span className="text-primary-foreground">✓</span>
        ) : isActive ? (
          <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        ) : (
          <span className="text-foreground/20 text-[10px]">{step.id}</span>
        )}
      </div>
      <span className={`text-[9px] font-body ${isDone || isActive ? "text-primary" : "text-foreground/20"}`}>{step.label}</span>
    </div>
  );
};

const StepConnector = ({ fromDone, toActive }: { fromDone: boolean; toActive: boolean }) => (
  <div className={`flex-1 h-[2px] mt-[-14px] ${fromDone ? "bg-primary" : "bg-foreground/10"}`} />
);

const DayScreen = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState("");
  const [quizConfidence, setQuizConfidence] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [nextDayLesson, setNextDayLesson] = useState<any>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const [rotatePromptDismissed, setRotatePromptDismissed] = useState(false);
  const streakRef = useRef<HTMLSpanElement>(null);

  // Hide bottom nav
  useEffect(() => {
    document.body.classList.add("hide-bottom-nav");
    return () => document.body.classList.remove("hide-bottom-nav");
  }, []);

  useEffect(() => {
    if (currentStep === 6) {
      document.body.classList.remove("hide-bottom-nav");
    }
  }, [currentStep]);

  // Orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    const isPortrait = window.innerWidth <= window.innerHeight;
    if (isPortrait && !rotatePromptDismissed) {
      const t = setTimeout(() => setShowRotatePrompt(true), 600);
      window.addEventListener("resize", check);
      return () => { clearTimeout(t); window.removeEventListener("resize", check); };
    }
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [rotatePromptDismissed]);

  useEffect(() => {
    if (isLandscape) setShowRotatePrompt(false);
  }, [isLandscape]);

  // Data fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth"); return; }

        const [lessonRes, nextRes, progressRes, enrollRes, profileRes] = await Promise.all([
          supabase.from("lessons").select("*").eq("day_number", Number(dayNumber)).eq("course_id", COURSE_ID).single(),
          supabase.from("lessons").select("day_number, title, week_number").eq("day_number", Number(dayNumber) + 1).eq("course_id", COURSE_ID).single(),
          supabase.from("progress").select("*").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle(),
          supabase.from("enrollments").select("current_day, payment_status, days_completed").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
          supabase.from("profiles").select("current_streak").eq("id", user.id).single(),
        ]);

        setLesson(lessonRes.data);
        setNextDayLesson(nextRes.data);
        setProgress(progressRes.data);
        setEnrollment(enrollRes.data);
        setCurrentStreak(profileRes.data?.current_streak ?? 0);

        // Resume logic — explicit 3-branch guard
        const p = progressRes.data;
        if (p && !p.day_complete) {
          const done: number[] = [];
          if (p.quiz_complete) { setCurrentStep(5); done.push(1, 2, 3, 4); }
          else if (p.gyanu_complete) { setCurrentStep(4); done.push(1, 2, 3); }
          else if (p.gyani_complete) { setCurrentStep(3); done.push(1, 2); }
          else if (p.gamma_complete) { setCurrentStep(2); done.push(1); }
          else { setCurrentStep(1); }
          setCompletedSteps(done);
        } else if (p?.day_complete) {
          setCurrentStep(6);
          setCompletedSteps([1, 2, 3, 4, 5]);
        } else {
          // No progress at all — fresh start
          setCurrentStep(1);
          setCompletedSteps([]);
        }
      } catch {
        toast.error("Could not load lesson");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dayNumber, navigate]);

  const completeStep = async (step: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const updateMap: Record<number, any> = {
        1: { gamma_complete: true },
        2: { gyani_complete: true, master_watched: true },
        3: { gyanu_complete: true },
        4: { quiz_complete: true },
      };
      const { data: existing } = await supabase.from("progress").select("id").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle();
      if (existing) {
        await supabase.from("progress").update(updateMap[step]).eq("id", existing.id);
      } else {
        await supabase.from("progress").insert({ user_id: user.id, day_number: Number(dayNumber), course_id: COURSE_ID, lesson_id: lesson?.id, ...updateMap[step] });
      }
      setCompletedSteps(prev => [...prev, step]);
      setCurrentStep(step + 1);
    } catch {
      toast.error("Could not save progress");
    } finally {
      setSaving(false);
    }
  };

  const completeDay = async () => {
    if (!quizScore) { toast.error("Please enter your score"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("progress").update({ quiz_score: Number(quizScore), day_complete: true, completed_at: new Date().toISOString() }).eq("user_id", user.id).eq("day_number", Number(dayNumber));
      const nextDay = Number(dayNumber) + 1;
      await supabase.from("enrollments").update({ current_day: nextDay, days_completed: Number(dayNumber) }).eq("user_id", user.id).eq("is_active", true);
      const { data: profileData } = await supabase.from("profiles").select("current_streak").eq("id", user.id).single();
      const newStreak = (profileData?.current_streak ?? 0) + 1;
      setCurrentStreak(newStreak);
      await supabase.from("profiles").update({ current_streak: newStreak }).eq("id", user.id);
      setCompletedSteps(prev => [...prev, 5]);
      setCurrentStep(6);
    } catch {
      toast.error("Could not complete day");
    } finally {
      setSaving(false);
    }
  };

  const cleanTitle = (title?: string) => title?.replace(/^Day\s*\d+:\s*/i, "") || "";

  // Loading
  if (loading) return (
    <div className="w-screen h-screen bg-background flex flex-col items-center justify-center">
      <motion.span className="text-4xl text-primary" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>✦</motion.span>
      <p className="text-sm text-foreground/40 mt-4">Loading your lesson...</p>
    </div>
  );

  // Free tier gate
  if (Number(dayNumber) > 5 && enrollment?.payment_status === "free") return (
    <div className="w-screen h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
        <motion.span className="text-6xl text-primary" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔒</motion.span>
        <h1 className="font-display text-2xl text-primary font-bold mt-4">Day {dayNumber} is Locked</h1>
        <p className="text-sm text-foreground/50 mt-2 max-w-[280px]">Upgrade to Aarambh Full Access to continue your transformation</p>
        <button className="w-full mt-6 py-4 rounded-2xl bg-primary text-primary-foreground font-body font-semibold glass-card-gold">Unlock All 60 Days →</button>
        <button onClick={() => navigate("/dashboard")} className="text-xs text-foreground/30 mt-4">← Back to Home</button>
      </motion.div>
    </div>
  );

  // Rotate prompt
  const rotateOverlay = (
    <AnimatePresence>
      {showRotatePrompt && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <motion.span className="text-7xl" animate={{ rotate: [0, 90, 90, 0, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.8 }}>📱</motion.span>
          <p className="font-display text-xl text-primary font-bold text-center mt-6">✦ Rotate for Full Experience</p>
          <p className="text-sm text-foreground/50 text-center mt-2 max-w-[260px] leading-relaxed">Landscape mode gives you wider lessons, cinematic videos, and a better quiz experience.</p>
          <button className="mt-8 bg-primary text-primary-foreground px-6 py-3 rounded-full font-body font-medium">I'll Rotate My Phone →</button>
          <button onClick={() => { setShowRotatePrompt(false); setRotatePromptDismissed(true); }} className="text-xs text-foreground/30 underline mt-4">Continue in portrait →</button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Step 6 — full celebration
  if (currentStep === 6) return (
    <div className="w-screen h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6">
      {rotateOverlay}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate("/dashboard")}
        className="absolute top-5 right-5 z-10 glass-card px-3 py-2 text-xs font-body text-foreground/50 hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        🏠 Home
      </motion.button>
      <Particles />
      <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, type: "spring" }} className="relative z-10 flex flex-col items-center text-center">
        <motion.span className="text-8xl text-primary font-display font-bold" style={{ filter: "drop-shadow(0 0 40px hsl(var(--primary)))" }} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ type: "spring", delay: 0.4 }}>✦</motion.span>
        <h1 className="font-display text-3xl font-bold text-foreground mt-4">Day {dayNumber} Complete!</h1>
        <div className="mt-4 flex items-center gap-2 justify-center">
          <span className="text-2xl">🔥</span>
          <span ref={streakRef} className="font-display text-2xl font-bold text-primary">{currentStreak}</span>
          <span className="text-sm text-foreground/50">day streak</span>
        </div>
        <div className="w-16 h-px bg-primary/30 mx-auto mt-6 mb-6" />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="glass-card-gold border border-primary/40 shadow-[0_0_20px_rgba(254,209,65,0.1)] p-5 rounded-2xl w-full">
          <div className="flex items-center gap-4">
            <motion.span className="text-4xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>🔥</motion.span>
            <div className="text-left">
              <p className="font-display font-bold text-primary">Your Daily Flame is Ready</p>
              <p className="text-xs text-foreground/40 mt-0.5">Reflect on today's learning</p>
            </div>
          </div>
          <button onClick={() => navigate("/flame/" + dayNumber)} className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-body font-semibold">Light My Flame →</button>
        </motion.div>
        {nextDayLesson && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }} onClick={() => navigate("/day/" + (Number(dayNumber) + 1))} className="glass-card p-4 rounded-2xl w-full mt-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] text-foreground/30 uppercase tracking-wider">Up Next</p>
                <p className="text-sm font-display font-bold text-foreground mt-0.5">Day {nextDayLesson.day_number}: {cleanTitle(nextDayLesson.title)}</p>
                <p className="text-[10px] text-foreground/30 mt-0.5">Week {nextDayLesson.week_number}</p>
              </div>
              <span className="text-xl text-primary">→</span>
            </div>
          </motion.div>
        )}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-sm font-body text-foreground/30 underline underline-offset-4 hover:text-foreground/60 transition-colors"
        >
          ← Back to Home
        </motion.button>
      </motion.div>
    </div>
  );

  // Button config per step
  const buttonConfig: Record<number, { label: string; onClick: () => void; disabled?: boolean } | null> = {
    1: { label: "I've Completed the Lesson ✦", onClick: () => completeStep(1) },
    2: { label: "I Watched Gyani ✦", onClick: () => completeStep(2) },
    3: { label: "I Watched Gyanu ✦", onClick: () => completeStep(3) },
    4: null,
    5: { label: "Submit & Complete Day 🔥", onClick: completeDay, disabled: !quizScore },
  };
  const btn = buttonConfig[currentStep];

  const stepContent = (
    <AnimatePresence mode="wait">
      <motion.div key={currentStep} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="flex-1 overflow-y-auto">
        {currentStep === 1 && (
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-foreground/10 shadow-[0_0_20px_rgba(254,209,65,0.08)]">
            <iframe src={lesson?.gamma_url || ""} className="w-full h-full border-none" style={{ minHeight: isLandscape ? "100%" : 400 }} allow="fullscreen" allowFullScreen title="Gamma Lesson" />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        )}
        {currentStep === 2 && (
          <div className="flex flex-col gap-3 h-full">
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center"><span className="text-primary font-display font-bold">G</span></div>
              <div><p className="text-sm font-display font-bold text-primary">Gyani's Perspective</p><p className="text-xs text-foreground/40 mt-0.5">Watch the full video for full marks</p></div>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden border border-foreground/10 shadow-[0_0_20px_rgba(254,209,65,0.08)] flex-1" style={{ minHeight: isLandscape ? 0 : 210 }}>
              <iframe src={toEmbedUrl(lesson?.gyani_youtube_url || "")} className="w-full h-full border-none" allow="autoplay; fullscreen" allowFullScreen title="Gyani Video" />
            </div>
            {!isLandscape && <p className="text-xs text-center text-foreground/30 mt-2">✦ Watch fully — Gyanu's video unlocks after this</p>}
          </div>
        )}
        {currentStep === 3 && (
          <div className="flex flex-col gap-3 h-full">
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center"><span className="text-primary font-display font-bold">G</span></div>
              <div><p className="text-sm font-display font-bold text-primary">Gyanu's Energy</p><p className="text-xs text-foreground/40 mt-0.5">Watch the full video for full marks</p></div>
            </div>
            <div className="relative w-full rounded-2xl overflow-hidden border border-foreground/10 shadow-[0_0_20px_rgba(254,209,65,0.08)] flex-1" style={{ minHeight: isLandscape ? 0 : 210 }}>
              <iframe src={toEmbedUrl(lesson?.gyanu_youtube_url || "")} className="w-full h-full border-none" allow="autoplay; fullscreen" allowFullScreen title="Gyanu Video" />
            </div>
          </div>
        )}
        {currentStep === 4 && (
          <div className="glass-card p-8 flex flex-col items-center justify-center gap-6 text-center h-full">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}><span className="text-6xl">🏆</span></motion.div>
            <h2 className="font-display text-xl font-bold text-foreground">Test Your Knowledge</h2>
            <p className="text-sm text-foreground/50 mt-1">Your Kahoot quiz for Day {dayNumber}</p>
            <button onClick={() => window.open(lesson?.wayground_quiz_url, "_blank")} className="w-full bg-primary text-primary-foreground font-body font-semibold py-4 rounded-xl text-base">Open Today's Quiz →</button>
            <p className="text-xs text-foreground/30 mt-3">After finishing, tap below to enter your score</p>
            <button onClick={() => completeStep(4)} className="glass-card border border-foreground/20 text-sm text-foreground/60 py-3 w-full rounded-xl mt-2">I Finished the Quiz →</button>
          </div>
        )}
        {currentStep === 5 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full inline-flex">Quiz Complete ✦</span>
            <h2 className="font-display text-xl font-bold text-center mt-4">How did you do?</h2>
            <p className="text-sm text-foreground/50 text-center">Enter your Kahoot score</p>
            <input inputMode="numeric" placeholder="0" value={quizScore} onChange={e => setQuizScore(e.target.value.replace(/\D/g, ""))} className="mt-6 w-full max-w-[200px] mx-auto block text-center text-3xl font-display font-bold text-primary bg-foreground/5 border-2 border-foreground/20 focus:border-primary transition-colors rounded-2xl py-4 outline-none" />
            <p className="text-xs text-foreground/30 text-center mt-1">points</p>
            <p className="text-sm text-foreground/60 text-center mt-6">How confident did you feel?</p>
            <div className="flex justify-center mt-2 gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => setQuizConfidence(i)} className="text-3xl cursor-pointer transition-transform hover:scale-110">
                  {i <= quizConfidence ? <span className="text-primary">★</span> : <span className="text-foreground/20">☆</span>}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const stepperRow = (
    <div className={`flex items-center gap-1 ${isLandscape ? "flex-col" : "justify-center px-4 py-3"}`}>
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <StepDot step={s} currentStep={currentStep} completedSteps={completedSteps} />
          {i < steps.length - 1 && (
            isLandscape
              ? <div className={`w-px h-4 ${completedSteps.includes(s.id) ? "bg-primary" : "bg-foreground/10"}`} />
              : <StepConnector fromDone={completedSteps.includes(s.id)} toActive={currentStep === steps[i + 1].id} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const actionButton = btn && (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      disabled={saving || btn.disabled}
      onClick={btn.onClick}
      className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-body font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(254,209,65,0.3)]"
    >
      {saving ? "Saving..." : btn.label}
    </motion.button>
  );

  return (
    <div className="w-screen h-screen bg-background overflow-hidden flex flex-col">
      {rotateOverlay}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-foreground/40 hover:text-foreground transition">← Back</button>
        <div className="text-center">
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Week {lesson?.week_number} · Day {dayNumber}</p>
          <p className="text-sm font-display font-bold text-foreground mt-0.5 max-w-[200px] truncate">{cleanTitle(lesson?.title)}</p>
        </div>
        <span className="text-xs text-primary font-bold">{completedSteps.length}/5</span>
      </div>

      {isLandscape ? (
        <div className="flex flex-row flex-1 overflow-hidden">
          <div className="flex-1 h-full overflow-hidden flex flex-col p-3">{stepContent}</div>
          <div className="w-72 h-full flex flex-col border-l border-foreground/10 px-5 py-6 gap-5 overflow-y-auto">
            <div>
              <p className="text-xs text-foreground/40 uppercase tracking-wider">Week {lesson?.week_number} · Day {dayNumber}</p>
              <p className="text-sm font-display font-bold text-foreground mt-1">{cleanTitle(lesson?.title)}</p>
            </div>
            {stepperRow}
            <div className="mt-auto">{actionButton}</div>
          </div>
        </div>
      ) : (
        <>
          {stepperRow}
          <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">{stepContent}</div>
          {btn && <div className="shrink-0 px-5 pb-6 pt-3">{actionButton}</div>}
        </>
      )}
    </div>
  );
};

export default DayScreen;
