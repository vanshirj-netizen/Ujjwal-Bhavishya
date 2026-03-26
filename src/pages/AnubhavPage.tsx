import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_ID } from "@/lib/constants";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import BottomNav from "@/components/BottomNav";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import GoldCard from "@/components/ui/GoldCard";

type Phase = "world-select" | "write" | "speak" | "evaluating" | "results";
type WorldType = "professional" | "casual" | "both";

const PHASE_STEPS = [
  { key: "world-select", label: "🌍 World" },
  { key: "write", label: "✍️ Write" },
  { key: "speak", label: "🎤 Speak" },
  { key: "evaluating", label: "⏳ Evaluating" },
  { key: "results", label: "🏆 Results" },
];

const loadingTexts = [
  "Reading your sentences carefully...",
  "Listening to how you spoke...",
  "{masterName} is writing your feedback...",
  "Almost ready for you...",
];

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const toStars = (score: number) => {
  if (score >= 81) return 5;
  if (score >= 61) return 4;
  if (score >= 41) return 3;
  if (score >= 21) return 2;
  return 1;
};

function getTodayISTCutoff(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const date = istNow.getUTCDate();
  const hour = istNow.getUTCHours();
  const min = istNow.getUTCMinutes();
  const cutoffDate = (hour < 5 || (hour === 5 && min < 30))
    ? new Date(Date.UTC(year, month, date - 1, 0, 0, 0))
    : new Date(Date.UTC(year, month, date, 0, 0, 0));
  return cutoffDate.toISOString();
}

const AnubhavPage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReadOnly = searchParams.get("mode") === "readonly";

  const [profile, setProfile] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("world-select");
  const [selectedWorld, setSelectedWorld] = useState<WorldType | null>(null);

  // Write state
  const [sentences, setSentences] = useState<string[]>([]);
  const [writeCount, setWriteCount] = useState(3);
  const [grammarOpen, setGrammarOpen] = useState(true);
  const [exampleOpen, setExampleOpen] = useState(false);

  // Session state
  const [writingId, setWritingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // IST session limit
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);
  const [thisSessionEverDone, setThisSessionEverDone] = useState(false);

  // Session history + progress for eval payload
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any>({});

  // Speak state
  const [speakSentences, setSpeakSentences] = useState<any[]>([]);
  const [speakIndex, setSpeakIndex] = useState(0);
  const [redoUsed, setRedoUsed] = useState<boolean[]>([]);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "saving" | "done">("idle");
  const [tipSeen, setTipSeen] = useState(() => localStorage.getItem("anubhavTipSeen") === "true");
  const [tipDismissed, setTipDismissed] = useState(false);
  const audioRecorder = useAudioRecorder();
  const recordedBlobsRef = useRef<(Blob | null)[]>([]);

  // Individual upload paths
  const writingRecordingPathsRef = useRef<(string | null)[]>([]);
  const worldRecordingPathsRef = useRef<(string | null)[]>([]);

  // Results
  const [results, setResults] = useState<any>(null);
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [flameExists, setFlameExists] = useState(false);
  const [readonlyDate, setReadonlyDate] = useState<string | null>(null);

  const masterName = profile?.selected_master?.toLowerCase() === "gyanu" ? "Gyanu" : "Gyani";

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);

      // Lesson gate check
      if (!isReadOnly) {
        const { data: progressCheck } = await supabase
          .from("progress")
          .select("lesson_complete")
          .eq("user_id", user.id)
          .eq("day_number", Number(dayNumber))
          .maybeSingle();

        if (!progressCheck?.lesson_complete) {
          toast(`Complete Day ${dayNumber}'s lesson first 📖`);
          navigate(`/day/${dayNumber}`);
          return;
        }
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, selected_master, primary_goal, mti_zone, mother_tongue, childhood_state, chosen_world")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profileData);

      // READONLY MODE: fetch best attempt and skip to results
      if (isReadOnly) {
        const { data: bestAttempt } = await supabase
          .from("practice_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", COURSE_ID)
          .eq("day_number", Number(dayNumber))
          .eq("is_best_attempt", true)
          .eq("status", "complete")
          .maybeSingle();

        if (!bestAttempt) {
          // No best attempt found, redirect to normal flow
          navigate(`/anubhav/${dayNumber}`, { replace: true });
          return;
        }

        setResults({
          wordClarityScore: bestAttempt.word_clarity_score,
          smoothnessScore: bestAttempt.smoothness_score,
          naturalSoundScore: bestAttempt.natural_sound_score,
          compositeScore: bestAttempt.composite_score,
          writingCompositeScore: bestAttempt.writing_composite_score,
          mastermessage: bestAttempt.master_message,
          mastermessagevoice: bestAttempt.master_message_voice,
          mastermessageaudiourl: bestAttempt.master_message_audio_url,
          topErrorSummary: bestAttempt.top_error_summary,
          wordErrors: bestAttempt.word_errors,
          writingChecks: bestAttempt.writing_checks,
        });
        setReadonlyDate(bestAttempt.submitted_at ? new Date(bestAttempt.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null);
        setPhase("results");
        setLoading(false);
        return;
      }

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("day_number", Number(dayNumber))
        .maybeSingle();
      setLesson(lessonData);

      const count = lessonData?.write_sentence_count || 3;
      setWriteCount(count);
      setSentences(Array(count).fill(""));

      // Pre-select world from sessionStorage
      const saved = sessionStorage.getItem(`anubhavWorld_day${dayNumber}`);
      if (saved === "professional" || saved === "casual" || saved === "both") {
        setSelectedWorld(saved);
      }

      // IST session count (global across all days)
      const { count: todayCount } = await supabase
        .from("practice_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .eq("status", "complete")
        .gte("submitted_at", getTodayISTCutoff());

      setTodaySessionsCount(
        (todayCount === null || todayCount === undefined) ? 0 : todayCount
      );

      // Check if this specific day has EVER been practiced
      const { data: thisDaySession } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .eq("day_number", Number(dayNumber))
        .eq("status", "complete")
        .limit(1);

      setThisSessionEverDone((thisDaySession?.length ?? 0) > 0);

      // Session history: last 5 completed sessions
      const { data: historyData } = await supabase
        .from("practice_sessions")
        .select("day_number, composite_score, top_error_summary, submitted_at")
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .eq("status", "complete")
        .order("submitted_at", { ascending: false })
        .limit(5);
      setSessionHistory(historyData ?? []);

      // Progress summary
      const { data: progressSummaryData } = await supabase
        .from("student_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", COURSE_ID)
        .maybeSingle();
      setProgressSummary(progressSummaryData ?? {});

      setLoading(false);
    };
    fetchData();
  }, [dayNumber, navigate]);

  // Loading text rotation
  useEffect(() => {
    if (phase !== "evaluating") return;
    const interval = setInterval(() => {
      setLoadingTextIdx(i => (i + 1) % loadingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

  // Handle recording state from hook
  useEffect(() => {
    if (audioRecorder.isRecording && recordingState !== "recording") {
      setRecordingState("recording");
    }
  }, [audioRecorder.isRecording, recordingState]);

  // When recording completes, save the blob
  useEffect(() => {
    if (audioRecorder.audioBlob && recordingState === "recording") {
      setRecordingState("saving");
      recordedBlobsRef.current[speakIndex] = audioRecorder.audioBlob;
      setRecordingState("done");
    }
  }, [audioRecorder.audioBlob, recordingState, speakIndex]);

  const updateSentence = (idx: number, val: string) => {
    setSentences(prev => {
      const copy = [...prev];
      copy[idx] = val.slice(0, 120);
      return copy;
    });
  };

  const allFilled = sentences.every(s => s.trim().length >= 5);

  // WORLD SELECT
  const confirmWorld = () => {
    if (!selectedWorld) return;
    sessionStorage.setItem(`anubhavWorld_day${dayNumber}`, selectedWorld);
    setPhase("write");
  };

  // AUDIO UPLOAD (individual sentence)
  const uploadAudioFile = async (blob: Blob, pathSuffix: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = isIOS() ? "mp4" : "webm";
    const path = `${userId}/${dayNumber}/${pathSuffix}.${ext}`;
    const { error } = await supabase.storage
      .from("anubhav-audio")
      .upload(path, blob, { upsert: true, contentType: isIOS() ? "audio/mp4" : "audio/webm;codecs=opus" });
    if (error) { console.error("Upload error:", error); return null; }
    return path;
  };

  // WRITE SUBMIT
  const submitWriting = async () => {
    if (!userId) return;

    const payload: any = {
      user_id: userId,
      day_number: Number(dayNumber),
      lesson_topic: lesson?.title || "",
    };
    sentences.forEach((s, i) => {
      payload[`sentence_${i + 1}`] = s.trim() || null;
    });

    const { data: writingData, error: wErr } = await supabase
      .from("writing_submissions")
      .insert(payload)
      .select("id")
      .single();
    if (wErr) { toast.error("Could not save writing"); return; }
    setWritingId(writingData.id);

    const nextAttempt = todaySessionsCount + 1;

    const { data: sessionData, error: sErr } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: userId,
        day_number: Number(dayNumber),
        lesson_topic: lesson?.title || "",
        writing_id: writingData.id,
        status: "in_progress",
        attempt_number: nextAttempt,
        selected_world: selectedWorld,
      })
      .select("id")
      .single();
    if (sErr) { toast.error("Could not start session"); return; }
    setSessionId(sessionData.id);

    // Initialize recording path arrays
    writingRecordingPathsRef.current = Array(sentences.length).fill(null);

    // Fetch speak sentences
    const { data: sentenceData } = await supabase
      .from("practice_sentences")
      .select("sentence, sequence_order, world_type")
      .eq("lesson_day", Number(dayNumber))
      .order("sequence_order", { ascending: true });

    let filtered: any[] = [];
    if (sentenceData) {
      if (selectedWorld === "professional") {
        filtered = sentenceData.filter(s => s.world_type === "professional");
      } else if (selectedWorld === "casual") {
        filtered = sentenceData.filter(s => s.world_type === "casual");
      } else {
        const prof = sentenceData.filter(s => s.world_type === "professional").slice(0, 5);
        const cas = sentenceData.filter(s => s.world_type === "casual").slice(0, 5);
        for (let i = 0; i < Math.max(prof.length, cas.length); i++) {
          if (prof[i]) filtered.push(prof[i]);
          if (cas[i]) filtered.push(cas[i]);
        }
      }
    }
    setSpeakSentences(filtered);
    setSpeakIndex(0);
    setRedoUsed(Array(filtered.length).fill(false));
    recordedBlobsRef.current = Array(filtered.length).fill(null);
    worldRecordingPathsRef.current = Array(filtered.length).fill(null);
    setRecordingState("idle");

    setPhase("speak");
  };

  // SPEAK — record controls
  const startSpeakRecording = () => {
    audioRecorder.reset();
    setRecordingState("idle");
    audioRecorder.startRecording();
  };

  const stopSpeakRecording = () => {
    audioRecorder.stopRecording();
  };

  const handleRedo = () => {
    setRedoUsed(prev => { const n = [...prev]; n[speakIndex] = true; return n; });
    recordedBlobsRef.current[speakIndex] = null;
    audioRecorder.reset();
    setRecordingState("idle");
  };

  const handleNextSentence = async () => {
    // Upload current recording before moving on
    const blob = recordedBlobsRef.current[speakIndex];
    if (blob && userId) {
      const attemptNum = todaySessionsCount + 1;
      // Determine if this is a writing sentence or world sentence
      // First `sentences.length` speak items are writing reads, rest are world
      const isWritingSentence = speakIndex < sentences.length;
      const pathSuffix = isWritingSentence
        ? `writing_${speakIndex}_attempt${attemptNum}`
        : `world_${speakIndex - sentences.length}_attempt${attemptNum}`;
      const path = await uploadAudioFile(blob, pathSuffix);

      if (isWritingSentence) {
        writingRecordingPathsRef.current[speakIndex] = path;
      } else {
        worldRecordingPathsRef.current[speakIndex - sentences.length] = path;
      }
    }

    if (speakIndex + 1 < speakSentences.length) {
      setSpeakIndex(i => i + 1);
      audioRecorder.reset();
      setRecordingState("idle");
    } else {
      submitForEvaluation();
    }
  };

  // SUBMIT FOR EVALUATION
  const submitForEvaluation = async () => {
    setPhase("evaluating");
    setLoadingTextIdx(0);

    try {
      // Upload any remaining blobs that weren't uploaded yet
      const attemptNum = todaySessionsCount + 1;
      for (let i = 0; i < recordedBlobsRef.current.length; i++) {
        const blob = recordedBlobsRef.current[i];
        if (!blob || !userId) continue;
        const isWriting = i < sentences.length;
        const idx = isWriting ? i : i - sentences.length;
        const pathRef = isWriting ? writingRecordingPathsRef : worldRecordingPathsRef;
        if (pathRef.current[idx]) continue; // already uploaded

        const suffix = isWriting
          ? `writing_${idx}_attempt${attemptNum}`
          : `world_${idx}_attempt${attemptNum}`;
        const path = await uploadAudioFile(blob, suffix);
        pathRef.current[idx] = path;
      }

      // Build JSONB arrays
      const writingRecordings = sentences.map((sentence, i) => ({
        sentence,
        audioPath: writingRecordingPathsRef.current[i] ?? null,
      }));

      const worldRecordings = speakSentences.map((s, i) => ({
        expectedSentence: s.sentence,
        audioPath: worldRecordingPathsRef.current[i] ?? null,
        sequenceOrder: i + 1,
      }));

      // Save recordings to session
      if (sessionId) {
        await supabase.from("practice_sessions")
          .update({
            writing_recordings: writingRecordings,
            world_recordings: worldRecordings,
          })
          .eq("id", sessionId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in again"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anubhav-evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            userId: session.user.id,
            courseId: COURSE_ID,
            masterName: profile?.selected_master || "gyani",
            firstName: (profile?.full_name ?? "Friend").split(" ")[0],
            dayNumber: Number(dayNumber),
            attemptNumber: attemptNum,
            selectedWorld: selectedWorld || profile?.chosen_world || "both",
            mtiZone: profile?.mti_zone || "urban_neutral",
            motherTongue: profile?.mother_tongue ?? "Hindi",
            lessonTitle: lesson?.title ?? "",
            grammarPattern: lesson?.grammar_hint ?? "",
            writingRecordings,
            worldRecordings,
            sessionHistory,
            progressSummary,
          }),
        }
      );

      const data = await response.json();
      if (data.error && !data.mastermessage) toast.error(data.error);
      setResults(data);
      setPhase("results");

      // Check flame
      if (userId) {
        const { data: flame } = await supabase.from("reflection_sessions")
          .select("id").eq("user_id", userId).eq("day_number", Number(dayNumber)).maybeSingle();
        setFlameExists(!!flame);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      setResults({
        wordClarityScore: 50,
        smoothnessScore: 50,
        naturalSoundScore: 50,
        compositeScore: 50,
        wordErrors: [],
        writingChecks: [],
        mastermessage: "Good effort! Keep practicing every day.",
        topErrorSummary: "",
      });
      setPhase("results");
    }
  };

  // MARK DONE
  const markDone = async () => {
    if (!userId) return;
    const { data: existing } = await supabase.from("progress")
      .select("id").eq("user_id", userId).eq("day_number", Number(dayNumber)).maybeSingle();
    if (existing) {
      await supabase.from("progress").update({ anubhav_complete: true }).eq("id", existing.id);
    } else {
      await supabase.from("progress").insert({ user_id: userId, day_number: Number(dayNumber), anubhav_complete: true });
    }
    toast.success("Practice complete! 🔥");
    navigate(`/day/${dayNumber}`);
  };

  const playMasterVoice = async (text: string, audioUrl?: string | null) => {
    // If we have a pre-generated audio URL, play it directly
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.play();
        return;
      } catch { /* fall through to TTS */ }
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flame-voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ text, masterName }),
        }
      );
      const data = await response.json();
      if (data?.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audio.play();
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <span className="text-6xl">🎯</span>
        <p className="text-sm mt-4" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Loading practice...</p>
      </div>
    );
  }

  // MAX PRACTICE REACHED
  if (todaySessionsCount >= 3) {
    return (
      <div className="min-h-screen flex flex-col pb-20 bg-background">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <GlassButton onClick={() => navigate("/dashboard")} className="!px-3 !py-1.5 text-sm">← Back</GlassButton>
          <span className="font-bold text-base" style={{ fontFamily: "var(--fd)", color: "hsl(var(--primary))" }}>🎯 Anubhav</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", fontFamily: "var(--fa)" }}>Day {dayNumber}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <GoldCard padding="32px" glow className="max-w-[320px] mx-auto text-center">
            <span className="text-5xl">🧘</span>
            <h2 className="text-lg font-bold mt-4" style={{ fontFamily: "var(--fd)", color: "hsl(var(--foreground))" }}>
              Max Practice Reached for Today
            </h2>
            <p className="mt-3" style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "hsl(var(--foreground) / 0.5)", lineHeight: 1.7 }}>
              {masterName} says: Take a breath. Rest is part of the practice. Let your brain absorb what you learned today.
            </p>
            <p className="mt-2" style={{ fontFamily: "var(--fa)", fontSize: "0.75rem", color: "hsl(var(--primary))" }}>
              3 of 3 sessions used today
            </p>
          </GoldCard>
          <GlassButton onClick={() => navigate("/dashboard")} className="mt-6 w-full max-w-[320px]">
            ← Back to Home
          </GlassButton>
        </div>
        <BottomNav />
      </div>
    );
  }

  const isStarMode = Number(dayNumber) <= 15;
  const writePrompt = lesson?.writing_prompt_instruction
    ? lesson.writing_prompt_instruction.replace("{count}", String(writeCount))
    : lesson?.write_prompt
      ? lesson.write_prompt.replace("{count}", String(writeCount))
      : `Write ${writeCount} sentences from YOUR life using today's lesson.`;

  const phaseIndex = PHASE_STEPS.findIndex(p => p.key === phase);

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <GlassButton onClick={() => navigate("/dashboard")} className="!px-3 !py-1.5 text-sm">← Back</GlassButton>
        <span className="font-bold text-base" style={{ fontFamily: "var(--fd)", color: "hsl(var(--primary))" }}>🎯 Anubhav</span>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", fontFamily: "var(--fa)" }}>Day {dayNumber}</span>
      </div>

      {/* 5-Step Stepper */}
      <div className="flex items-center justify-center gap-1.5 px-5 pb-4">
        {PHASE_STEPS.map((p, i) => {
          const stepIdx = i;
          const isActive = p.key === phase;
          const isDone = stepIdx < phaseIndex;
          return (
            <React.Fragment key={p.key}>
              {i > 0 && <div className={`flex-1 h-[2px] ${isDone ? "bg-primary" : "bg-foreground/10"}`} />}
              <div className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap" style={{
                fontFamily: "var(--fa)",
                ...(isActive
                  ? { background: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))" }
                  : isDone
                    ? { background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary) / 0.6)" }
                    : { background: "hsl(var(--foreground) / 0.04)", color: "hsl(var(--foreground) / 0.3)" }),
              }}>
                {isDone && <span>✓</span>}
                {p.label}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        <AnimatePresence mode="wait">

          {/* WORLD SELECT */}
          {phase === "world-select" && (
            <motion.div key="world-select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-center font-bold" style={{ fontFamily: "var(--fd)", fontSize: "1.15rem", color: "hsl(var(--foreground))", fontWeight: 700 }}>
                Choose Your World Today
              </h2>
              <p className="text-center mt-2 mb-6" style={{ fontFamily: "var(--fb)", fontSize: "0.8rem", color: "hsl(var(--foreground) / 0.4)" }}>
                Your practice sentences come from your chosen world
              </p>

              {thisSessionEverDone && (
                <p className="text-center mb-4" style={{ fontFamily: "var(--fa)", fontSize: "0.75rem", color: "hsl(var(--primary))" }}>
                  Replay Practice · {todaySessionsCount} of 3 used today
                </p>
              )}

              <div className="flex flex-col gap-3">
                {([
                  { value: "professional" as WorldType, emoji: "💼", label: "Professional", sub: "Office, interviews, networking" },
                  { value: "casual" as WorldType, emoji: "☕", label: "Casual", sub: "Friends, college, daily life" },
                  { value: "both" as WorldType, emoji: "⚡", label: "Both", sub: "5 professional + 5 casual, mixed" },
                ]).map(w => {
                  const sel = selectedWorld === w.value;
                  return (
                    <div
                      key={w.value}
                      onClick={() => setSelectedWorld(w.value)}
                      className="cursor-pointer rounded-[16px] p-4 flex items-center gap-3 transition-all"
                      style={{
                        border: sel ? "1.5px solid hsl(var(--primary))" : "1px solid hsl(var(--foreground) / 0.08)",
                        background: sel ? "hsl(var(--primary) / 0.08)" : "hsl(var(--foreground) / 0.03)",
                      }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>{w.emoji}</span>
                      <div>
                        <p style={{ fontFamily: "var(--fd)", fontSize: "0.95rem", color: "hsl(var(--foreground))", fontWeight: 700 }}>{w.label}</p>
                        <p style={{ fontFamily: "var(--fb)", fontSize: "0.78rem", color: "hsl(var(--foreground) / 0.4)" }}>{w.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <GoldButton onClick={confirmWorld} disabled={!selectedWorld} fullWidth className="mt-6">
                {thisSessionEverDone ? "Replay Practice →" : "Start Practice →"}
              </GoldButton>
            </motion.div>
          )}

          {/* WRITE PHASE */}
          {phase === "write" && (
            <motion.div key="write" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {/* Grammar Reference */}
              {lesson?.grammar_hint && (
                <GoldCard padding="16px" className="mb-4">
                  <div className="flex items-center justify-between">
                    <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }}>
                      TODAY'S RULE
                    </p>
                    <button onClick={() => setGrammarOpen(!grammarOpen)} style={{ fontFamily: "var(--fa)", fontSize: "0.7rem", color: "hsl(var(--primary))", cursor: "pointer", background: "none", border: "none" }}>
                      {grammarOpen ? "▲ Hide" : "▼ Show"}
                    </button>
                  </div>
                  {grammarOpen && (
                    <p className="mt-2" style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "hsl(var(--foreground) / 0.7)", lineHeight: 1.8 }}>
                      {lesson.grammar_hint}
                    </p>
                  )}
                </GoldCard>
              )}

              <p style={{ fontFamily: "var(--fb)", fontSize: "0.9rem", color: "hsl(var(--foreground) / 0.8)", lineHeight: 1.7, margin: "20px 0" }}>
                {writePrompt}
              </p>

              <div className="flex flex-col gap-3">
                {sentences.map((s, i) => (
                  <div key={i} className="relative">
                    <p className="absolute top-3 left-4" style={{ fontFamily: "var(--fa)", fontSize: "0.65rem", color: "hsl(var(--primary))" }}>{i + 1}.</p>
                    <textarea
                      value={s}
                      onChange={e => updateSentence(i, e.target.value)}
                      placeholder="Write your sentence here..."
                      rows={2}
                      className="w-full pl-8 pr-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none"
                      style={{
                        fontFamily: "var(--fb)",
                        fontSize: "0.9rem",
                        minHeight: 52,
                        background: "hsl(var(--foreground) / 0.04)",
                        border: "1px solid hsl(var(--foreground) / 0.1)",
                        color: "hsl(var(--foreground))",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = "hsl(44 99% 68% / 0.4)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--foreground) / 0.1)"; }}
                      maxLength={120}
                    />
                    <p className="text-right mt-0.5" style={{ fontFamily: "var(--fa)", fontSize: "0.65rem", color: "hsl(var(--foreground) / 0.3)" }}>
                      {s.length}/120
                    </p>
                  </div>
                ))}
              </div>

              {lesson?.write_example && (
                <div className="mt-4">
                  <button
                    onClick={() => setExampleOpen(!exampleOpen)}
                    style={{ fontFamily: "var(--fa)", fontSize: "0.75rem", color: "hsl(var(--primary) / 0.6)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                  >
                    {exampleOpen ? "Hide example ▲" : "See an example ▼"}
                  </button>
                  {exampleOpen && (
                    <p className="mt-2" style={{ fontFamily: "var(--fb)", fontSize: "0.82rem", color: "hsl(var(--foreground) / 0.4)", fontStyle: "italic" }}>
                      {lesson.write_example}
                    </p>
                  )}
                </div>
              )}

              <GoldButton onClick={submitWriting} disabled={!allFilled} fullWidth className="mt-6">
                Save & Continue →
              </GoldButton>
            </motion.div>
          )}

          {/* SPEAK PHASE */}
          {phase === "speak" && (
            <motion.div key="speak" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {!tipSeen && !tipDismissed && speakIndex === 0 && (
                <GoldCard padding="20px" className="mb-4">
                  <p style={{ fontFamily: "var(--fd)", fontSize: "0.9rem", color: "hsl(var(--primary))" }}>🎧 For Best Results</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {["Speak in English only", "Use headphones if possible", "Find a quiet space before recording", "Speak clearly — normal pace, not fast"].map(t => (
                      <li key={t} style={{ fontFamily: "var(--fb)", fontSize: "0.8rem", color: "hsl(var(--foreground) / 0.6)" }}>• {t}</li>
                    ))}
                  </ul>
                  <GoldButton onClick={() => { setTipDismissed(true); localStorage.setItem("anubhavTipSeen", "true"); setTipSeen(true); }} className="mt-3 !py-2 !px-4 !text-xs">
                    Got it →
                  </GoldButton>
                </GoldCard>
              )}

              {speakSentences.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full" style={{
                      background: "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                      fontFamily: "var(--fa)",
                      fontSize: "0.7rem",
                    }}>
                      {speakSentences[speakIndex]?.world_type === "professional" ? "💼 Professional" : "☕ Casual"}
                    </span>
                    <span style={{ fontFamily: "var(--fa)", fontSize: "0.7rem", color: "hsl(var(--foreground) / 0.4)" }}>
                      {speakIndex + 1} of {speakSentences.length}
                    </span>
                  </div>

                  <GoldCard padding="24px" className="mb-5">
                    <p className="text-center" style={{ fontFamily: "var(--fd)", fontSize: "1.05rem", color: "hsl(var(--foreground))", lineHeight: 1.9 }}>
                      {speakSentences[speakIndex]?.sentence}
                    </p>
                  </GoldCard>

                  {recordingState === "idle" && (
                    <div className="flex flex-col items-center gap-3">
                      <motion.button
                        onClick={startSpeakRecording}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                        style={{ background: "hsl(var(--foreground) / 0.06)", border: "1.5px solid hsl(var(--foreground) / 0.15)" }}
                      >
                        <span className="text-2xl">🎤</span>
                      </motion.button>
                      <p style={{ fontFamily: "var(--fb)", fontSize: "0.8rem", color: "hsl(var(--foreground) / 0.5)" }}>Tap to Speak in English</p>
                      <p style={{ fontFamily: "var(--fb)", fontSize: "0.65rem", color: "hsl(var(--foreground) / 0.25)" }}>🔇 quiet space recommended</p>
                    </div>
                  )}

                  {recordingState === "recording" && (
                    <div className="flex flex-col items-center gap-3">
                      <motion.button
                        onClick={stopSpeakRecording}
                        whileTap={{ scale: 0.95 }}
                        className="w-[72px] h-[72px] rounded-full flex items-center justify-center relative"
                        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(44 99% 48%))" }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: "2px solid hsl(var(--primary))" }}
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-2xl">⏹</span>
                      </motion.button>
                      <p style={{ fontFamily: "var(--fb)", fontSize: "0.8rem", color: "hsl(var(--primary))" }}>Tap to Stop</p>
                      <p className="font-mono text-lg font-bold" style={{ color: "hsl(var(--primary))" }}>
                        {String(Math.floor(audioRecorder.durationSeconds / 60)).padStart(2, "0")}:{String(audioRecorder.durationSeconds % 60).padStart(2, "0")}
                      </p>
                    </div>
                  )}

                  {recordingState === "saving" && (
                    <div className="flex flex-col items-center gap-3">
                      <motion.div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ background: "hsl(var(--foreground) / 0.06)" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <span className="text-xl">⏳</span>
                      </motion.div>
                      <p style={{ fontFamily: "var(--fb)", fontSize: "0.8rem", color: "hsl(var(--foreground) / 0.5)" }}>Saving...</p>
                    </div>
                  )}

                  {recordingState === "done" && (
                    <div className="flex flex-col items-center gap-4">
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: "var(--fd)", fontSize: "0.9rem", color: "hsl(var(--primary))" }}>
                        Recorded ✓
                      </motion.p>
                      {audioRecorder.audioURL && (
                        <audio
                          controls
                          src={audioRecorder.audioURL}
                          className="w-full max-w-xs"
                          style={{ height: "36px", borderRadius: "8px" }}
                        />
                      )}
                      <div className="flex gap-3 w-full">
                        {!redoUsed[speakIndex] && (
                          <GlassButton onClick={handleRedo} className="flex-1">
                            🔁 Redo
                          </GlassButton>
                        )}
                        <GoldButton onClick={handleNextSentence} fullWidth className="flex-1">
                          {speakIndex + 1 < speakSentences.length ? "Next →" : "Submit →"}
                        </GoldButton>
                      </div>
                    </div>
                  )}
                </>
              )}

              {speakSentences.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "hsl(var(--foreground) / 0.5)" }}>No practice sentences found for this day.</p>
                  <GoldButton onClick={() => submitForEvaluation()} className="mt-4">Skip to Evaluation →</GoldButton>
                </div>
              )}
            </motion.div>
          )}

          {/* EVALUATING */}
          {phase === "evaluating" && (
            <motion.div key="evaluating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <GoldCard glow padding="40px 32px" className="max-w-[320px] mx-auto text-center">
                <motion.div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center overflow-hidden"
                  style={{ border: "2px solid hsl(var(--primary))" }}
                  animate={{ boxShadow: ["0 0 0px hsl(var(--primary) / 0.3)", "0 0 20px hsl(var(--primary) / 0.5)", "0 0 0px hsl(var(--primary) / 0.3)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-3xl">{masterName === "Gyanu" ? "⚡" : "🧙‍♂️"}</span>
                </motion.div>

                <p className="mt-3" style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }}>
                  {masterName === "Gyanu" ? "GYANU IS REVIEWING" : "GYANI IS REVIEWING"}
                </p>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingTextIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                    style={{ fontFamily: "var(--fd)", fontSize: "0.95rem", color: "hsl(var(--foreground))", lineHeight: 1.8, fontStyle: "italic" }}
                  >
                    {loadingTexts[loadingTextIdx].replace("{masterName}", masterName)}
                  </motion.p>
                </AnimatePresence>

                <div className="flex gap-2 mt-4 justify-center">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <motion.span key={i} style={{ color: "hsl(var(--primary))", fontSize: "1.2rem" }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: d }}>
                      •
                    </motion.span>
                  ))}
                </div>
              </GoldCard>
            </motion.div>
          )}

          {/* RESULTS */}
          {phase === "results" && results && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

              {/* Readonly badge */}
              {isReadOnly && (
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(253,193,65,0.15)", color: "#ffc300", fontFamily: "var(--fa)" }}>
                    Day {dayNumber} • Best Session{readonlyDate ? ` • ${readonlyDate}` : ""}
                  </span>
                </div>
              )}

              {/* 1. Score Cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Word Clarity", score: results.wordClarityScore ?? results.word_clarity_score },
                  { label: "Smoothness", score: results.smoothnessScore ?? results.smoothness_score },
                  { label: "Natural Sound", score: results.naturalSoundScore ?? results.natural_sound_score },
                ].filter(card => card.score != null).map(card => (
                  <GoldCard key={card.label} padding="16px">
                    <div className="text-center">
                      {isStarMode ? (
                        <p style={{ fontFamily: "var(--fd)", fontSize: "1.1rem", color: "hsl(var(--primary))", fontWeight: 700 }}>
                          {"⭐".repeat(toStars(card.score))}
                        </p>
                      ) : (
                        <p style={{ fontFamily: "var(--fd)", fontSize: "1.1rem", color: "hsl(var(--primary))", fontWeight: 700 }}>
                          {card.score}/100
                        </p>
                      )}
                      <p className="mt-1" style={{ fontFamily: "var(--fa)", fontSize: "0.58rem", color: "rgba(255,252,239,0.65)", textTransform: "uppercase", letterSpacing: "2px" }}>
                        {card.label}
                      </p>
                    </div>
                  </GoldCard>
                ))}
              </div>

              {/* Writing Score Card */}
              {(results.writingCompositeScore ?? results.writing_composite_score) != null && (
                <div className="mt-3">
                  <div
                    style={{
                      padding: "1.5px",
                      borderRadius: 20,
                      background: "linear-gradient(135deg, #FFFCEF, #F5F0D0, #FFFCEF)",
                    }}
                  >
                    <div style={{ borderRadius: 18.5, background: "var(--card-bg, rgba(0, 26, 16, 0.97))", padding: "16px" }}>
                      <div className="text-center">
                        {isStarMode ? (
                          <p style={{ fontFamily: "var(--fd)", fontSize: "1.1rem", color: "#FFFCEF", fontWeight: 700 }}>
                            {"⭐".repeat(toStars(results.writingCompositeScore ?? results.writing_composite_score))}
                          </p>
                        ) : (
                          <p style={{ fontFamily: "var(--fd)", fontSize: "1.1rem", color: "#FFFCEF", fontWeight: 700 }}>
                            {results.writingCompositeScore ?? results.writing_composite_score}/100
                          </p>
                        )}
                        <p className="mt-1" style={{ fontFamily: "var(--fa)", fontSize: "0.58rem", color: "rgba(255,252,239,0.65)", textTransform: "uppercase", letterSpacing: "2px" }}>
                          Writing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GYANU SAYS — Master's Message */}
              {(results.mastermessage || results.ai_feedback) && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">{masterName.toUpperCase()} SAYS</p>
                  <GoldCard padding="16px" glow>
                    <p style={{ fontFamily: "var(--fb)", fontSize: "0.88rem", color: "hsl(var(--foreground))", lineHeight: 1.7 }}>{results.mastermessage || results.ai_feedback}</p>
                  </GoldCard>
                  <GlassButton
                    onClick={() => playMasterVoice(results.mastermessage || results.ai_feedback, results.mastermessageaudiourl || results.master_message_audio_url)}
                    className="mt-3 mx-auto flex items-center gap-2 text-xs"
                  >
                    ▶ Hear it from {masterName}
                  </GlassButton>
                </div>
              )}

              {/* 3. PRONUNCIATION DRILL — Word Errors (new schema) */}
              {results.wordErrors?.length > 0 && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">PRONUNCIATION DRILL</p>
                  <div className="flex flex-col gap-3">
                    {results.wordErrors.slice(0, 3).map((err: any, i: number) => (
                      <GoldCard key={i} padding="16px">
                        <p style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "rgba(255,252,239,0.55)", textTransform: "uppercase", letterSpacing: "2px" }}>You said</p>
                        <p style={{ fontFamily: "var(--fd)", fontSize: "0.95rem", color: "hsl(var(--foreground))", fontWeight: 700 }}>{err.word}</p>

                        <p className="mt-2" style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "hsl(var(--primary) / 0.5)", textTransform: "uppercase", letterSpacing: "2px" }}>Sounds like</p>
                        <p style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "rgba(255,252,239,0.68)", fontStyle: "italic" }}>{err.heardAs}</p>

                        <p className="mt-2" style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "rgba(255,252,239,0.55)", textTransform: "uppercase", letterSpacing: "2px" }}>Say it as</p>
                        <p style={{ fontFamily: "var(--fd)", fontSize: "1rem", color: "hsl(var(--primary))", fontWeight: 700 }}>{err.correction}</p>

                        {err.example && (
                          <>
                            <p className="mt-2" style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "rgba(255,252,239,0.55)", textTransform: "uppercase", letterSpacing: "2px" }}>Try this sentence</p>
                            <p style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "rgba(255,252,239,0.72)", fontStyle: "italic" }}>{err.example}</p>
                          </>
                        )}
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy word_errors support */}
              {!results.wordErrors?.length && results.word_errors?.length > 0 && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">WHAT TO WORK ON</p>
                  <div className="flex flex-col gap-3">
                    {results.word_errors.slice(0, 5).map((err: any, i: number) => (
                      <GoldCard key={i} padding="16px">
                        <div className="flex items-center gap-2">
                          <span>🔴</span>
                          <span style={{ fontFamily: "var(--fd)", fontSize: "0.95rem", color: "hsl(var(--primary))", fontWeight: 700 }}>{err.word}</span>
                        </div>
                        {(err.issue || err.heardAs) && (
                          <p className="mt-1" style={{ fontFamily: "var(--fb)", fontSize: "0.82rem", color: "rgba(255,252,239,0.72)" }}>{err.issue || err.heardAs}</p>
                        )}
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {/* top_error_summary fallback */}
              {(!results.wordErrors?.length && !results.word_errors?.length) && (results.topErrorSummary || results.top_error_summary) && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">FOCUS AREAS</p>
                  <GoldCard padding="16px">
                    <p style={{ fontFamily: "var(--fb)", fontSize: "0.85rem", color: "rgba(255,252,239,0.72)", lineHeight: 1.7 }}>{results.topErrorSummary || results.top_error_summary}</p>
                  </GoldCard>
                </div>
              )}

              {/* 4. WRITING CHECK */}
              {results.writingChecks?.length > 0 && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">WRITING CHECK</p>
                  <div className="flex flex-col gap-2">
                    {results.writingChecks.map((wc: any, i: number) => (
                      <GoldCard key={i} padding="16px">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">{wc.isCorrect ? "✅" : "❌"}</span>
                          <div className="flex-1">
                            <p style={{ fontFamily: "var(--fb)", fontSize: "0.88rem", color: "hsl(var(--foreground))" }}>"{wc.sentence}"</p>
                            {!wc.isCorrect && wc.issue && (
                              <p className="mt-1.5" style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "rgba(255,252,239,0.55)", textTransform: "uppercase", letterSpacing: "2px" }}>
                                ISSUE <span style={{ fontFamily: "var(--fb)", fontSize: "0.82rem", color: "rgba(255,252,239,0.68)", textTransform: "none", letterSpacing: "normal" }}>{wc.issue}</span>
                              </p>
                            )}
                            {!wc.isCorrect && wc.correctedVersion && (
                              <p className="mt-1" style={{ fontFamily: "var(--fa)", fontSize: "0.55rem", color: "rgba(255,252,239,0.55)", textTransform: "uppercase", letterSpacing: "2px" }}>
                                FIX <span style={{ fontFamily: "var(--fd)", fontSize: "0.88rem", color: "#FFFCEF", textTransform: "none", letterSpacing: "normal", fontWeight: 700 }}>{wc.correctedVersion}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Also support legacy writing_checks format */}
              {!results.writingChecks?.length && results.writing_checks?.length > 0 && (
                <div className="mt-6">
                  <p style={{ fontFamily: "var(--fa)", fontSize: "0.6rem", color: "hsl(var(--primary))", textTransform: "uppercase", letterSpacing: "3px" }} className="mb-3">YOUR WRITING</p>
                  <div className="flex flex-col gap-2">
                    {results.writing_checks.map((wc: any, i: number) => (
                      <GoldCard key={i} padding="16px">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">{wc.correct ? "✅" : "❌"}</span>
                          <div className="flex-1">
                            <p style={{ fontFamily: "var(--fb)", fontSize: "0.88rem", color: "hsl(var(--foreground))" }}>{wc.sentence}</p>
                            {!wc.correct && wc.correction && (
                              <p className="mt-1.5" style={{ fontFamily: "var(--fb)", fontSize: "0.82rem", color: "hsl(var(--primary) / 0.8)" }}>→ {wc.correction}</p>
                            )}
                            {!wc.correct && (wc.simple_reason || wc.reason) && (
                              <p className="mt-1" style={{ fontFamily: "var(--fb)", fontSize: "0.78rem", color: "rgba(255,252,239,0.65)" }}>Why: {wc.simple_reason || wc.reason}</p>
                            )}
                          </div>
                        </div>
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Retake + Hero CTA */}
              <div className="mt-6 flex flex-col gap-3 pb-8">
                {isReadOnly ? (
                  <GlassButton onClick={() => navigate("/anubhav")} className="w-full border border-foreground/15">
                    ← Back to Anubhav
                  </GlassButton>
                ) : (
                  <>
                    {/* Retake button */}
                    {todaySessionsCount < 3 ? (
                      <GoldButton onClick={() => navigate(`/anubhav/${dayNumber}`)} className="w-full">
                        🔄 Retake Session ({todaySessionsCount}/3)
                      </GoldButton>
                    ) : (
                      <div className="text-center">
                        <GoldButton disabled className="w-full opacity-40 cursor-not-allowed">
                          Max sessions reached today (3/3)
                        </GoldButton>
                        <p className="text-xs mt-1.5" style={{ color: "rgba(255,252,239,0.60)" }}>Come back tomorrow 💪</p>
                      </div>
                    )}

                    {flameExists ? (
                      <GoldCard padding="14px">
                        <div className="flex items-center justify-between">
                          <p style={{ fontFamily: "var(--fb)", fontSize: "0.82rem", color: "rgba(255,252,239,0.72)" }}>🔥 Your Flame is already lit for today</p>
                          <button onClick={() => navigate("/flame")} style={{ fontFamily: "var(--fa)", fontSize: "0.75rem", color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer" }}>
                            View Flame →
                          </button>
                        </div>
                      </GoldCard>
                    ) : (
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <div
                          onClick={() => navigate(`/flame/${dayNumber}`)}
                          className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer"
                          style={{ border: "1.5px solid rgba(253,193,65,0.6)", background: "rgba(253,193,65,0.08)" }}
                        >
                          <span className="text-3xl">🔥</span>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-base" style={{ color: "hsl(var(--primary))" }}>Go Light Your Flame</span>
                            <span className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.70)" }}>Your reflection is waiting</span>
                            <span className="text-xs" style={{ color: "hsl(var(--primary))", opacity: 0.55 }}>Reflect · Rate · Earn your Flame</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* 6. Back to Home */}
                    <GlassButton onClick={() => navigate("/dashboard")} className="w-full border border-foreground/15">
                      ← Back to Home
                    </GlassButton>
                  </>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default AnubhavPage;
