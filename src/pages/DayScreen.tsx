import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_URL, COURSE_ID } from "@/lib/constants";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import GoldCard from "@/components/ui/GoldCard";

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

const StepDot = ({ step, currentStep, completedSteps, compact }: { step: typeof steps[0]; currentStep: number; completedSteps: number[]; compact?: boolean }) => {
  const isDone = completedSteps.includes(step.id);
  const isActive = currentStep === step.id;
  const dotSize = compact ? "w-6 h-6" : "w-7 h-7";
  const fontSize = compact ? "text-[9px]" : "text-xs";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${dotSize} rounded-full flex items-center justify-center ${fontSize} font-bold transition-all ${
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
      <span className={`${compact ? "text-[8px]" : "text-[9px]"} ${isDone || isActive ? "text-primary" : "text-foreground/20"}`} style={{ fontFamily: "var(--fb)" }}>{step.label}</span>
    </div>
  );
};

const StepConnector = ({ fromDone }: { fromDone: boolean; toActive: boolean }) => (
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
  const [isReplay, setIsReplay] = useState(false);
  const streakRef = useRef<HTMLSpanElement>(null);

  // Practice attempt tracking for Step 6 conditional display
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);
  const [thisDayHasSession, setThisDayHasSession] = useState(false);
  const [practiceAttemptLoading, setPracticeAttemptLoading] = useState(false);

  useEffect(() => {
    if (currentStep !== 6) return;
    const fetchAttempts = async () => {
      setPracticeAttemptLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPracticeAttemptLoading(false); return; }

      // Helper: get today's 5:30 AM IST cutoff as UTC ISO string
      const getTodayISTCutoff = (): string => {
        const now = new Date();
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffsetMs);
        let year = istNow.getUTCFullYear();
        let month = istNow.getUTCMonth();
        let date = istNow.getUTCDate();
        const istHour = istNow.getUTCHours();
        const istMin = istNow.getUTCMinutes();
        // If before 5:30 AM IST, reset belongs to previous day
        if (istHour < 5 || (istHour === 5 && istMin < 30)) {
          const prev = new Date(Date.UTC(year, month, date));
          prev.setUTCDate(prev.getUTCDate() - 1);
          year = prev.getUTCFullYear();
          month = prev.getUTCMonth();
          date = prev.getUTCDate();
        }
        // 5:30 AM IST = 00:00 UTC on the same calendar date
        return new Date(Date.UTC(year, month, date, 0, 0, 0)).toISOString();
      };

      const cutoff = getTodayISTCutoff();

      // Query 1: Count ALL completed sessions today (across all days)
      const { count, error: countError } = await supabase
        .from("practice_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .eq("status", "complete")
        .gte("submitted_at", cutoff);

      // On error or null → default to 0 (NEVER block the student)
      if (countError || count === null || count === undefined) {
        setTodaySessionsCount(0);
      } else {
        setTodaySessionsCount(count);
      }

      // Query 2: Check if THIS specific day has any completed session ever
      const { data: dayData } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("day_number", Number(dayNumber))
        .eq("status", "complete")
        .limit(1);

      setThisDayHasSession(!!(dayData && dayData.length > 0));
      setPracticeAttemptLoading(false);
    };
    fetchAttempts();
  }, [currentStep, dayNumber]);

  useEffect(() => {
    document.body.classList.add("hide-bottom-nav");
    return () => document.body.classList.remove("hide-bottom-nav");
  }, []);

  useEffect(() => {
    if (currentStep === 6) {
      document.body.classList.remove("hide-bottom-nav");
    }
  }, [currentStep]);

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
          supabase.from("profiles").select("current_streak").eq("id", user.id).maybeSingle(),
        ]);

        setLesson(lessonRes.data);
        setNextDayLesson(nextRes.data);
        setProgress(progressRes.data);
        setEnrollment(enrollRes.data);
        setCurrentStreak(profileRes.data?.current_streak ?? 0);

        const p = progressRes.data;
        if (p && !p.day_complete) {
          const done: number[] = [];
          if (p.quiz_complete) { setCurrentStep(5); done.push(1, 2, 3, 4); }
          else if (p.gyanu_complete) { setCurrentStep(4); done.push(1, 2, 3); }
          else if (p.gyani_complete) { setCurrentStep(3); done.push(1, 2); }
          else if (p.gamma_complete) { setCurrentStep(2); done.push(1); }
          else { setCurrentStep(1); }
          setCompletedSteps(done);
          setIsReplay(false);
        } else if (p?.day_complete) {
          setCurrentStep(6);
          setCompletedSteps([1, 2, 3, 4, 5]);
          setIsReplay(false);
        } else {
          setCurrentStep(1);
          setCompletedSteps([]);
          setIsReplay(false);
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

      const { data: existingEnroll } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      if (existingEnroll) {
        await supabase.rpc('update_own_enrollment_safe', {
          p_enrollment_id: existingEnroll.id,
          p_current_day: nextDay,
          p_days_completed: Number(dayNumber),
        });
      } else {
        await supabase.from("enrollments").insert({ user_id: user.id, current_day: nextDay, days_completed: Number(dayNumber), is_active: true, course_id: COURSE_ID });
      }

      setCompletedSteps(prev => [...prev, 5]);
      setCurrentStep(6);
    } catch {
      toast.error("Could not complete day");
    } finally {
      setSaving(false);
    }
  };

  const replayCompleteDay = async () => {
    if (!quizScore) { toast.error("Please enter your score"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("progress").update({
        quiz_score: Number(quizScore),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("day_number", Number(dayNumber));
      setIsReplay(false);
      setCurrentStep(6);
      setCompletedSteps([1, 2, 3, 4, 5]);
      toast.success("Score updated ✦");
    } catch {
      toast.error("Could not update score");
    } finally {
      setSaving(false);
    }
  };

  const cleanTitle = (title?: string) => title?.replace(/^Day\s*\d+:\s*/i, "") || "";

  if (loading) return (
    <div className="w-screen h-screen flex flex-col items-center justify-center" style={{ background: "#000e09" }}>
      <motion.span className="text-4xl text-primary" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>✦</motion.span>
      <p className="text-sm mt-4" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Loading your lesson...</p>
    </div>
  );

  const isFreeUser = enrollment?.payment_status === "free" || enrollment?.payment_status === null || !enrollment;
  const isLockedDay = isFreeUser && Number(dayNumber) > 5;

  if (isLockedDay) return (
    <div className="w-screen h-screen flex flex-col items-center justify-center px-6" style={{ background: "#000e09" }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center">
        <motion.span className="text-6xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🔒</motion.span>
        <h1 className="text-2xl font-bold text-center mt-6" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>Day {dayNumber} is Locked</h1>
        <p className="text-sm text-center mt-3 max-w-[280px] leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>
          You've completed your free preview. Upgrade to unlock all 60 days and continue your transformation.
        </p>
        <GoldButton onClick={() => window.open(PAYMENT_URL, "_blank")} fullWidth className="mt-8">
          Unlock All 60 Days →
        </GoldButton>
        <GlassButton onClick={() => navigate("/dashboard")} className="mt-4 text-sm">← Back to Home</GlassButton>
      </motion.div>
    </div>
  );

  const rotateOverlay = (
    <AnimatePresence>
      {showRotatePrompt && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6" style={{ background: "#000e09" }}>
          <motion.span className="text-7xl" animate={{ rotate: [0, 90, 90, 0, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.8 }}>📱</motion.span>
          <p className="text-xl font-bold text-center mt-6" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>✦ Rotate for Full Experience</p>
          <p className="text-sm text-center mt-2 max-w-[260px] leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Landscape mode gives you wider lessons, cinematic videos, and a better quiz experience.</p>
          <GoldButton className="mt-8">I'll Rotate My Phone →</GoldButton>
          <GlassButton onClick={() => { setShowRotatePrompt(false); setRotatePromptDismissed(true); }} className="mt-4 text-xs">Continue in portrait →</GlassButton>
        </motion.div>
      )}
    </AnimatePresence>
  );


  const maxReached = todaySessionsCount >= 3;
  const remainingToday = 3 - todaySessionsCount;


  if (currentStep === 6) return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center px-6" style={{ background: "#000e09" }}>
      {rotateOverlay}
      <GlassButton
        onClick={() => navigate("/dashboard")}
        className="absolute top-5 right-5 z-10 !px-3 !py-2 text-xs flex items-center gap-1.5"
      >
        🏠 Home
      </GlassButton>
      <Particles />
      <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, type: "spring" }} className="relative z-10 flex flex-col items-center text-center">
        <motion.span className="text-8xl font-bold" style={{ fontFamily: "var(--fd)", color: "#ffc300", filter: "drop-shadow(0 0 40px hsl(var(--primary)))" }} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ type: "spring", delay: 0.4 }}>✦</motion.span>
        <h1 className="text-3xl font-bold mt-4" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Day {dayNumber} Complete!</h1>
        <div className="mt-4 text-center">
          <span className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.72)" }}>Day {dayNumber} of 60 ✓</span>
        </div>
        <div className="w-16 h-px mx-auto mt-6 mb-6" style={{ background: "rgba(253,193,65,0.3)" }} />

        {/* Practice card — based on global daily limit */}
        {!practiceAttemptLoading && !maxReached && !thisDayHasSession && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <GoldCard padding="20px" glow>
              <div onClick={() => navigate(`/anubhav/${dayNumber}`)} className="cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🎯</span>
                  <div className="text-left">
                    <p className="font-bold text-base" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Start Your Practice</p>
                    <p className="text-xs mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Write → Speak → Get AI feedback from your Master</p>
                    <p className="text-xs font-semibold mt-2" style={{ fontFamily: "var(--fa)", color: "#ffc300" }}>Write · Record · Scored · AI Feedback</p>
                  </div>
                </div>
              </div>
            </GoldCard>
          </motion.div>
        )}

        {!practiceAttemptLoading && !maxReached && thisDayHasSession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="w-full flex flex-col items-center">
            <GoldButton onClick={() => navigate("/dashboard")} fullWidth className="mt-2">
              ← Back to Home
            </GoldButton>
            <p
              onClick={() => navigate(`/anubhav/${dayNumber}`)}
              className="text-center mt-3"
              style={{ fontFamily: "var(--fb)", fontSize: "0.75rem", color: "rgba(255,252,239,0.3)", padding: 12, cursor: "pointer" }}
            >
              ↺ Replay Practice · {remainingToday} of 3 remaining today
            </p>
          </motion.div>
        )}

        {!practiceAttemptLoading && maxReached && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="w-full flex flex-col items-center">
            <GoldButton onClick={() => navigate("/dashboard")} fullWidth className="mt-2">
              ← Back to Home
            </GoldButton>
            <p
              className="text-center mt-3"
              style={{ fontFamily: "var(--fb)", fontSize: "0.75rem", color: "rgba(255,252,239,0.3)", padding: 12, cursor: "default" }}
            >
              ✓ Max practice reached for today
            </p>
          </motion.div>
        )}

        {!practiceAttemptLoading && !maxReached && !thisDayHasSession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <GlassButton onClick={() => navigate("/dashboard")} className="mt-4 text-sm border border-foreground/15">← Back to Home</GlassButton>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <GlassButton
            onClick={() => {
              setIsReplay(true);
              setCurrentStep(1);
              setCompletedSteps([]);
            }}
            className="mt-3 text-sm border border-foreground/15"
          >
            ↺ Replay Day {dayNumber}
          </GlassButton>
        </motion.div>
      </motion.div>
    </div>
  );

  const buttonConfig: Record<number, { label: string; onClick: () => void; disabled?: boolean } | null> = {
    1: { label: "I've Completed the Lesson ✦", onClick: () => completeStep(1) },
    2: { label: "I Watched Gyani ✦", onClick: () => completeStep(2) },
    3: { label: "I Watched Gyanu ✦", onClick: () => completeStep(3) },
    4: null,
    5: {
      label: isReplay ? "Update My Score ✦" : "Submit & Complete Day 🔥",
      onClick: isReplay ? replayCompleteDay : completeDay,
      disabled: !quizScore,
    },
  };
  const btn = buttonConfig[currentStep];

  const stepContent = (
    <AnimatePresence mode="wait">
      <motion.div key={currentStep} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="flex-1 overflow-y-auto">
        {currentStep === 1 && (
          <div className={isLandscape ? "relative w-full h-full overflow-hidden" : "relative w-full h-full rounded-2xl overflow-hidden"} style={!isLandscape ? { border: "1px solid rgba(255,252,239,0.1)", boxShadow: "0 0 20px rgba(254,209,65,0.08)" } : {}}>
            <iframe src={lesson?.gamma_url || ""} className="w-full h-full border-none block" style={{ minHeight: isLandscape ? "100%" : 400 }} allow="fullscreen" allowFullScreen title="Gamma Lesson" />
            {!isLandscape && <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ background: "linear-gradient(to top, #000e09, transparent)" }} />}
          </div>
        )}
        {currentStep === 2 && (
          <div className="flex flex-col gap-3 h-full">
            {!isLandscape && (
              <GoldCard padding="12px 16px">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(253,193,65,0.2)", border: "1px solid rgba(253,193,65,0.4)" }}><span style={{ fontFamily: "var(--fd)", fontWeight: 700, color: "#ffc300" }}>G</span></div>
                  <div><p className="text-sm font-bold" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>Gyani's Perspective</p><p className="text-xs mt-0.5" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Watch the full video for full marks</p></div>
                </div>
              </GoldCard>
            )}
            <div className={isLandscape ? "relative w-full flex-1 overflow-hidden" : "relative w-full rounded-2xl overflow-hidden flex-1"} style={!isLandscape ? { border: "1px solid rgba(255,252,239,0.1)", boxShadow: "0 0 20px rgba(254,209,65,0.08)", minHeight: 210 } : { minHeight: 0 }}>
              <iframe src={toEmbedUrl(lesson?.gyani_youtube_url || "")} className="w-full h-full border-none" style={isLandscape ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" } : undefined} allow="autoplay; fullscreen" allowFullScreen title="Gyani Video" />
            </div>
            {!isLandscape && <p className="text-xs text-center mt-2" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>✦ Watch fully — Gyanu's video unlocks after this</p>}
          </div>
        )}
        {currentStep === 3 && (
          <div className="flex flex-col gap-3 h-full">
            {!isLandscape && (
              <GoldCard padding="12px 16px">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(253,193,65,0.2)", border: "1px solid rgba(253,193,65,0.4)" }}><span style={{ fontFamily: "var(--fd)", fontWeight: 700, color: "#ffc300" }}>G</span></div>
                  <div><p className="text-sm font-bold" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>Gyanu's Energy</p><p className="text-xs mt-0.5" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Watch the full video for full marks</p></div>
                </div>
              </GoldCard>
            )}
            <div className={isLandscape ? "relative w-full flex-1 overflow-hidden" : "relative w-full rounded-2xl overflow-hidden flex-1"} style={!isLandscape ? { border: "1px solid rgba(255,252,239,0.1)", boxShadow: "0 0 20px rgba(254,209,65,0.08)", minHeight: 210 } : { minHeight: 0 }}>
              <iframe src={toEmbedUrl(lesson?.gyanu_youtube_url || "")} className="w-full h-full border-none" style={isLandscape ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" } : undefined} allow="autoplay; fullscreen" allowFullScreen title="Gyanu Video" />
            </div>
          </div>
        )}
        {currentStep === 4 && (
          <GoldCard padding="32px" className="flex flex-col items-center justify-center gap-6 text-center h-full">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}><span className="text-6xl">🏆</span></motion.div>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Test Your Knowledge</h2>
            <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Your Kahoot quiz for Day {dayNumber}</p>
            <GoldButton onClick={() => window.open(lesson?.wayground_quiz_url, "_blank")} fullWidth>Open Today's Quiz →</GoldButton>
            <p className="text-xs mt-3" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>After finishing, tap below to enter your score</p>
            <GlassButton onClick={() => completeStep(4)} className="w-full">I Finished the Quiz →</GlassButton>
          </GoldCard>
        )}
        {currentStep === 5 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <span className="text-xs px-3 py-1 rounded-full inline-flex" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>Quiz Complete ✦</span>
            <h2 className="text-xl font-bold text-center mt-4" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>How did you do?</h2>
            <p className="text-sm text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Enter your Kahoot score</p>
            <input inputMode="numeric" placeholder="0" value={quizScore} onChange={e => setQuizScore(e.target.value.replace(/\D/g, ""))} className="mt-6 w-full max-w-[200px] mx-auto block text-center text-3xl font-bold rounded-2xl py-4 outline-none transition-colors" style={{ fontFamily: "var(--fd)", color: "#ffc300", background: "rgba(255,252,239,0.04)", border: "2px solid rgba(255,252,239,0.15)" }} />
            <p className="text-xs text-center mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>points</p>
            <p className="text-sm text-center mt-6" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>How confident did you feel?</p>
            <div className="flex justify-center mt-2 gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => setQuizConfidence(i)} className="text-3xl cursor-pointer transition-transform hover:scale-110">
                  {i <= quizConfidence ? <span style={{ color: "#ffc300" }}>★</span> : <span style={{ color: "rgba(255,252,239,0.2)" }}>☆</span>}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const stepperRow = (
    <div className={`flex items-center gap-1 ${isLandscape ? "flex-col gap-2" : "justify-center px-4 py-3"}`}>
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <StepDot step={s} currentStep={currentStep} completedSteps={completedSteps} compact={isLandscape} />
          {i < steps.length - 1 && (
            isLandscape
              ? <div className={`w-px h-3 ${completedSteps.includes(s.id) ? "bg-primary" : "bg-foreground/10"}`} />
              : <StepConnector fromDone={completedSteps.includes(s.id)} toActive={currentStep === steps[i + 1].id} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const actionButton = btn && (
    <GoldButton
      disabled={saving || btn.disabled}
      onClick={btn.onClick}
      fullWidth
      className={isLandscape ? "py-3 text-sm" : "py-4 text-base"}
    >
      {saving ? "Saving..." : btn.label}
    </GoldButton>
  );

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#000e09" }}>
      {rotateOverlay}
      <div className={isLandscape ? "hidden" : "flex items-center justify-between px-4 py-3 shrink-0"} style={{ borderBottom: "1px solid rgba(255,252,239,0.1)" }}>
        <GlassButton onClick={() => navigate("/dashboard")} className="!px-3 !py-1.5 text-sm">← Back</GlassButton>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.4)" }}>Week {lesson?.week_number} · Day {dayNumber}</p>
          <p className="text-sm font-bold mt-0.5 max-w-[200px] truncate" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>{cleanTitle(lesson?.title)}</p>
        </div>
        <span className="text-xs font-bold" style={{ fontFamily: "var(--fa)", color: "#ffc300" }}>{completedSteps.length}/5</span>
      </div>

      {isLandscape ? (
        <div className="flex flex-row flex-1 overflow-hidden">
          <div className="flex-1 h-full overflow-hidden flex flex-col p-0">{stepContent}</div>
          <div className="w-[26%] min-w-[180px] max-w-[210px] h-full flex flex-col px-3 py-3 gap-3 overflow-y-auto shrink-0" style={{ borderLeft: "1px solid rgba(255,252,239,0.1)" }}>
            <div className="mb-2 pb-2" style={{ borderBottom: "1px solid rgba(255,252,239,0.1)" }}>
              <GlassButton onClick={() => navigate("/dashboard")} className="!px-2 !py-1 text-[10px] mb-2">← Home</GlassButton>
              <p className="text-[9px] uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>W{lesson?.week_number} · Day {dayNumber}</p>
              <p className="text-xs font-semibold leading-tight mt-0.5 line-clamp-2" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>{cleanTitle(lesson?.title)}</p>
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
