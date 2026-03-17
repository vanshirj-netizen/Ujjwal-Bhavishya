import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_ID } from "@/lib/constants";
import AudioRecorderButton from "@/components/AudioRecorderButton";
import BottomNav from "@/components/BottomNav";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import GoldCard from "@/components/ui/GoldCard";

type Phase = "write" | "speak-sentences" | "speak-free" | "evaluating" | "results";

const loadingTexts = [
  "Listening to your voice carefully...",
  "Checking every word you spoke...",
  "Looking at how naturally you spoke...",
  "{masterName} is preparing your feedback...",
  "Almost ready for you...",
];

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const AnubhavPage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("write");

  const [sentences, setSentences] = useState<string[]>([]);
  const [writeCount, setWriteCount] = useState(3);

  const [writingId, setWritingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [showSentences, setShowSentences] = useState(true);
  const [countdown, setCountdown] = useState(5);

  const [results, setResults] = useState<any>(null);

  const [loadingTextIdx, setLoadingTextIdx] = useState(0);

  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";
  const masterEmoji = masterName === "Gyanu" ? "🔥" : "🧙‍♂️";

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, selected_master, primary_goal, mti_zone")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("day_number", Number(dayNumber))
        .maybeSingle();

      setLesson(lessonData);
      const count = lessonData?.write_sentence_count || 3;
      setWriteCount(count);
      setSentences(Array(count).fill(""));
      setLoading(false);
    };
    fetchData();
  }, [dayNumber, navigate]);

  useEffect(() => {
    if (phase === "speak-sentences" && showSentences && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "speak-sentences" && countdown === 0) {
      setShowSentences(false);
    }
  }, [phase, showSentences, countdown]);

  useEffect(() => {
    if (phase !== "evaluating") return;
    const interval = setInterval(() => {
      setLoadingTextIdx(i => (i + 1) % loadingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

  const updateSentence = (idx: number, val: string) => {
    setSentences(prev => {
      const copy = [...prev];
      copy[idx] = val.slice(0, 100);
      return copy;
    });
  };

  const allFilled = sentences.every(s => s.trim().length >= 3);

  const submitWriting = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload: any = {
      user_id: user.id,
      day_number: Number(dayNumber),
      lesson_topic: lesson?.title || "",
    };
    sentences.forEach((s, i) => {
      payload[`sentence_${i + 1}`] = s.trim() || null;
    });

    const { data: writingData, error: wErr } = await supabase
      .from("anubhav_writings")
      .insert(payload)
      .select("id")
      .single();

    if (wErr) { toast.error("Could not save writing"); return; }
    setWritingId(writingData.id);

    const { data: sessionData, error: sErr } = await supabase
      .from("anubhav_practice_sessions")
      .insert({
        user_id: user.id,
        day_number: Number(dayNumber),
        lesson_topic: lesson?.title || "",
        writing_id: writingData.id,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (sErr) { toast.error("Could not start session"); return; }
    setSessionId(sessionData.id);

    setPhase("speak-sentences");
    setShowSentences(true);
    setCountdown(5);
  };

  const uploadAudio = async (blob: Blob, pathSuffix: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = isIOS() ? "mp4" : "webm";
    const path = `${user.id}/${dayNumber}/${pathSuffix}.${ext}`;

    const { error } = await supabase.storage
      .from("anubhav-audio")
      .upload(path, blob, { upsert: true, contentType: isIOS() ? "audio/mp4" : "audio/webm;codecs=opus" });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Could not upload audio");
      return null;
    }
    return path;
  };

  const onSentencesRecorded = async (blob: Blob, duration: number) => {
    const path = await uploadAudio(blob, "sentences");
    if (path && sessionId) {
      await supabase.from("anubhav_practice_sessions")
        .update({ audio_sentences_path: path })
        .eq("id", sessionId);
    }
    setPhase("speak-free");
  };

  const onFreeSpeechRecorded = async (blob: Blob, duration: number) => {
    const path = await uploadAudio(blob, "freespeech");
    if (path && sessionId) {
      await supabase.from("anubhav_practice_sessions")
        .update({ audio_freespeech_path: path })
        .eq("id", sessionId);
    }
  };

  const submitForEvaluation = async () => {
    setPhase("evaluating");
    setLoadingTextIdx(0);

    try {
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
            user_id: session.user.id,
            day_number: Number(dayNumber),
            session_id: sessionId,
            writing_id: writingId,
            master_name: profile?.selected_master || "gyani",
            lesson_topic: lesson?.title || "",
            mti_zone: profile?.mti_zone || "urban_neutral",
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      }
      setResults(data);
      setPhase("results");
    } catch (err) {
      console.error("Evaluation error:", err);
      setResults({
        success: false,
        word_clarity_score: 50,
        smoothness_score: 50,
        natural_sound_score: 50,
        word_errors: [],
        writing_checks: [],
        ai_feedback: "Good effort! Keep practicing every day.",
        top_error_summary: "",
      });
      setPhase("results");
    }
  };

  const retryFromSpeak = async () => {
    if (sessionId) {
      await supabase.from("anubhav_practice_sessions")
        .update({ retry_count: (results?.retry_count || 0) + 1 })
        .eq("id", sessionId);
    }
    setPhase("speak-sentences");
    setShowSentences(true);
    setCountdown(5);
    setResults(null);
  };

  const markDone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase.from("progress")
      .select("id").eq("user_id", user.id).eq("day_number", Number(dayNumber)).maybeSingle();

    if (existing) {
      await supabase.from("progress").update({ anubhav_complete: true }).eq("id", existing.id);
    } else {
      await supabase.from("progress").insert({
        user_id: user.id,
        day_number: Number(dayNumber),
        anubhav_complete: true,
      });
    }

    toast.success("Practice complete! Your Flame awaits 🔥");
    setTimeout(() => navigate(`/flame/${dayNumber}`), 1500);
  };

  const playMasterVoice = async (text: string) => {
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

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#000e09" }}>
        <span className="text-6xl">🎯</span>
        <p className="text-sm mt-4" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Loading practice...</p>
      </div>
    );
  }

  const writePrompt = lesson?.write_prompt
    ? lesson.write_prompt.replace("{count}", String(writeCount))
    : `Write ${writeCount} sentences from YOUR life using today's lesson.`;

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#000e09" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <GlassButton onClick={() => navigate("/dashboard")} className="!px-3 !py-1.5 text-sm">← Back</GlassButton>
        <span className="font-bold text-base" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>🎯 Anubhav</span>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>Day {dayNumber}</span>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 px-5 pb-4">
        {[
          { key: "write", label: "✍️ Write", phases: ["write"] },
          { key: "speak", label: "🎤 Speak", phases: ["speak-sentences", "speak-free"] },
          { key: "results", label: "📊 Results", phases: ["results"] },
        ].map((p, i) => {
          const isActive = p.phases.includes(phase) || (phase === "evaluating" && p.key === "results");
          const isDone = (p.key === "write" && phase !== "write") ||
            (p.key === "speak" && (phase === "evaluating" || phase === "results"));
          return (
            <React.Fragment key={p.key}>
              {i > 0 && <div className={`flex-1 h-[2px] ${isDone ? "bg-primary" : "bg-foreground/10"}`} />}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={{
                fontFamily: "var(--fa)",
                ...(isActive
                  ? { background: "rgba(253,193,65,0.2)", color: "#ffc300" }
                  : isDone
                    ? { background: "rgba(253,193,65,0.1)", color: "rgba(255,193,0,0.6)" }
                    : { background: "rgba(255,252,239,0.04)", color: "rgba(255,252,239,0.3)" }),
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
          {/* WRITE PHASE */}
          {phase === "write" && (
            <motion.div key="write" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Day {dayNumber}: {lesson?.title?.replace(/^Day\s*\d+:\s*/i, "") || "Practice"}</h2>
              <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{writePrompt}</p>

              {lesson?.grammar_hint && (
                <GoldCard padding="16px" className="mt-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <p className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>{lesson.grammar_hint}</p>
                  </div>
                </GoldCard>
              )}

              <div className="mt-4 flex flex-col gap-3">
                {sentences.map((s, i) => (
                  <div key={i}>
                    <label className="text-xs mb-1 block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>Sentence {i + 1}</label>
                    <input
                      value={s}
                      onChange={e => updateSentence(i, e.target.value)}
                      placeholder="Write your sentence here..."
                      className="w-full p-3 rounded-xl text-sm outline-none transition-colors"
                      style={{ fontFamily: "var(--fb)", background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.1)", color: "#fffcef" }}
                      maxLength={100}
                    />
                    <p className="text-[10px] text-right mt-0.5" style={{ color: "rgba(255,252,239,0.2)" }}>{s.length}/100</p>
                  </div>
                ))}
              </div>

              {lesson?.write_example && (
                <GoldCard padding="12px" className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>Example</p>
                  <p className="text-sm italic mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{lesson.write_example}</p>
                </GoldCard>
              )}

              <GoldButton
                onClick={submitWriting}
                disabled={!allFilled}
                fullWidth
                className="mt-6"
              >
                Next: Time to Speak →
              </GoldButton>
            </motion.div>
          )}

          {/* SPEAK SENTENCES */}
          {phase === "speak-sentences" && (
            <motion.div key="speak-sentences" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-xl font-bold text-center" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Now speak your sentences</h2>

              <AnimatePresence>
                {showSentences && (
                  <motion.div exit={{ opacity: 0, scale: 0.95 }} className="mt-4">
                    <GoldCard padding="16px" glow>
                      <p className="text-xs text-center mb-3" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>
                        Hiding in {countdown}...
                      </p>
                      <div className="flex flex-col gap-2">
                        {sentences.filter(s => s.trim()).map((s, i) => (
                          <p key={i} className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>{i + 1}. {s}</p>
                        ))}
                      </div>
                    </GoldCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {lesson?.speak_example && !showSentences && (
                <GoldCard padding="12px" className="mt-3">
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>Hint</p>
                  <p className="text-xs italic mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>{lesson.speak_example}</p>
                </GoldCard>
              )}

              <div className="mt-6">
                <AudioRecorderButton
                  onRecordingComplete={onSentencesRecorded}
                  minDurationSeconds={lesson?.speak_min_seconds || 10}
                  maxDurationSeconds={lesson?.speak_max_seconds || 120}
                  promptText={lesson?.speak_prompt || "Speak your sentences aloud"}
                  showWaveform
                />
              </div>
            </motion.div>
          )}

          {/* FREE SPEAKING */}
          {phase === "speak-free" && (
            <motion.div key="speak-free" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-xl font-bold text-center" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Free Speaking Challenge</h2>

              {lesson?.free_speak_context && (
                <GoldCard padding="16px" glow className="mt-4">
                  <p className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>{lesson.free_speak_context}</p>
                </GoldCard>
              )}

              <div className="flex justify-center mt-3">
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>
                  {lesson?.speak_min_seconds || 30}–{lesson?.speak_max_seconds || 120}s
                </span>
              </div>

              <div className="mt-6">
                <AudioRecorderButton
                  onRecordingComplete={onFreeSpeechRecorded}
                  minDurationSeconds={lesson?.speak_min_seconds || 30}
                  maxDurationSeconds={lesson?.speak_max_seconds || 120}
                  promptText="Speak freely about the topic above"
                  showWaveform
                />
              </div>

              <GoldButton
                onClick={submitForEvaluation}
                fullWidth
                className="mt-6"
              >
                Submit for Evaluation →
              </GoldButton>
            </motion.div>
          )}

          {/* EVALUATING */}
          {phase === "evaluating" && (
            <motion.div key="evaluating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.div
                className="w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{ background: "rgba(253,193,65,0.15)", border: "2px solid rgba(253,193,65,0.3)" }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <img
                  src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png"
                  alt="UB"
                  className="w-16 h-auto"
                />
              </motion.div>
              <motion.p
                key={loadingTextIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold text-center mt-6"
                style={{ fontFamily: "var(--fd)", color: "#fffcef" }}
              >
                {loadingTexts[loadingTextIdx].replace("{masterName}", masterName)}
              </motion.p>
              <div className="flex gap-2 mt-6">
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div key={i} className="w-3 h-3 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: d }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {phase === "results" && results && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Word Clarity", score: results.word_clarity_score, emoji: "🎯" },
                  { label: "Smoothness", score: results.smoothness_score, emoji: "🌊" },
                  { label: "Natural Sound", score: results.natural_sound_score, emoji: "🎶" },
                ].map((card) => (
                  <GoldCard key={card.label} padding="12px">
                    <div className="text-center">
                      <span className="text-xl">{card.emoji}</span>
                      <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>{card.score ?? 0}</p>
                      <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,252,239,0.1)" }}>
                        <motion.div
                          className={`h-full rounded-full ${getScoreColor(card.score ?? 0)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${card.score ?? 0}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                      <p className="text-[10px] mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>{card.label}</p>
                    </div>
                  </GoldCard>
                ))}
              </div>

              {results.writing_checks?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>Your Writing</p>
                  <div className="flex flex-col gap-2">
                    {results.writing_checks.map((wc: any, i: number) => (
                      <GoldCard key={i} padding="12px">
                        <div className="flex items-start gap-2">
                          <span className="text-base mt-0.5">{wc.correct ? "✅" : "⚠️"}</span>
                          <div className="flex-1">
                            <p className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>{wc.sentence}</p>
                            {!wc.correct && wc.correction && (
                              <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "#ffc300" }}>→ {wc.correction}</p>
                            )}
                            {!wc.correct && wc.simple_reason && (
                              <p className="text-xs mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>{wc.simple_reason}</p>
                            )}
                          </div>
                        </div>
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {results.word_errors?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>Let's Fix This</p>
                  <div className="flex flex-col gap-3">
                    {results.word_errors.slice(0, 2).map((err: any, i: number) => (
                      <GoldCard key={i} padding="16px">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>You said</p>
                          <p className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>"{err.word}"</p>
                          <p className="text-xs mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>Because</p>
                          <p className="text-sm" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{err.issue}</p>
                        </div>
                      </GoldCard>
                    ))}
                  </div>
                </div>
              )}

              {results.ai_feedback && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "var(--fa)", color: "rgba(255,252,239,0.3)" }}>{masterName} says</p>
                  <GoldCard padding="16px" glow>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--fb)", color: "#fffcef" }}>{results.ai_feedback}</p>
                  </GoldCard>
                  <GlassButton
                    onClick={() => playMasterVoice(results.ai_feedback)}
                    className="mt-3 mx-auto flex items-center gap-2 text-xs"
                  >
                    ▶ Hear {masterName} Say This
                  </GlassButton>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 pb-8">
                <GlassButton
                  onClick={retryFromSpeak}
                  className="w-full"
                >
                  Retry Speaking 🔄
                </GlassButton>
                <GoldButton
                  onClick={markDone}
                  fullWidth
                >
                  Light Your Flame 🔥
                </GoldButton>
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
