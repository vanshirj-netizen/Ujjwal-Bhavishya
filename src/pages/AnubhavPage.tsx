import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

type Screen = "select" | "practice" | "evaluating" | "result";

const AnubhavPage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [sentences, setSentences] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [worldType, setWorldType] = useState<"professional" | "casual" | null>(null);
  const [responses, setResponses] = useState<string[]>([]);
  const [sessionResult, setSessionResult] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [fallbackVisible, setFallbackVisible] = useState(false);

  const responseRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const [sessionScore, setSessionScore] = useState(0);
  const [screen, setScreen] = useState<Screen>("select");
  const [loading, setLoading] = useState(true);
  const [noSentences, setNoSentences] = useState(false);

  // Quick Flame state
  const [flameRating, setFlameRating] = useState(0);
  const [flameSubmitted, setFlameSubmitted] = useState(false);
  const [submittingFlame, setSubmittingFlame] = useState(false);

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
      setLoading(false);
    };
    fetchData();
  }, [dayNumber]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  // Check existing flame when result screen shows
  useEffect(() => {
    if (screen === "result") {
      const checkFlame = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("daily_flames")
          .select("id")
          .eq("user_id", user.id)
          .eq("day_number", Number(dayNumber))
          .maybeSingle();
        if (data) setFlameSubmitted(true);
      };
      checkFlame();
    }
  }, [screen, dayNumber]);

  // Normalize master name
  const masterName = (profile?.selected_master?.toLowerCase() === "gyanu") ? "Gyanu" : "Gyani";
  const masterEmoji = masterName === "Gyanu" ? "🔥" : "🧙‍♂️";

  const startListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Mic not supported. Use the text box below.");
      setFallbackVisible(true);
      return;
    }
    responseRef.current = "";
    setCaptured(false);
    isListeningRef.current = true;
    setIsListening(true);

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          responseRef.current += " " + event.results[i][0].transcript;
        }
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); }
        catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      isListeningRef.current = false;
      setIsListening(false);
      if (event.error !== "aborted") {
        toast.error("Mic issue. Tap again or use text box.");
        setFallbackVisible(true);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); }
    catch {
      isListeningRef.current = false;
      setIsListening(false);
      toast.error("Could not start mic. Try tapping again.");
    }
  };

  const stopAndCapture = () => {
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    const spokenText = responseRef.current.trim();
    if (!spokenText && !manualInput.trim()) {
      setIsListening(false);
      toast.error("Nothing captured. Please speak or type.");
      return;
    }
    const finalText = spokenText || manualInput.trim();
    setIsListening(false);
    const updated = [...responses, finalText];
    setResponses(updated);
    setCaptured(true);
    setManualInput("");
    setTimeout(() => {
      setCaptured(false);
      responseRef.current = "";
      if (currentIndex >= sentences.length - 1) {
        evaluateSession(updated);
      } else {
        setCurrentIndex(i => i + 1);
        setFallbackVisible(false);
      }
    }, 900);
  };

  const handleManualSubmit = () => {
    const text = manualInput.trim();
    if (!text) return;
    const updatedResponses = [...responses, text];
    setResponses(updatedResponses);
    setManualInput("");
    setFallbackVisible(false);
    if (currentIndex >= sentences.length - 1) {
      evaluateSession(updatedResponses);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const evaluateSession = async (allResponses: string[]) => {
    setScreen("evaluating");
    setIsEvaluating(true);

    try {
      const { data } = await supabase.functions.invoke("anubhav-coach", {
        body: {
          studentName: profile?.full_name ?? "Friend",
          masterName,
          dayNumber: Number(dayNumber),
          ultimateGoal: profile?.primary_goal ?? "",
          mtiBackground: profile?.mti_zone ?? "hindi_heartland",
          worldType,
          sentences: sentences.map((s, i) => ({
            sentence: s.sentence,
            sentenceHindi: s.sentence_hindi,
            grammarPattern: s.grammar_pattern,
            mtiTarget: s.mti_target,
            expectedKeywords: s.expected_keywords,
            studentResponse: allResponses[i] ?? "",
          })),
        },
      });

      setSessionResult(data);
      setSessionScore(data?.totalScore ?? 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && sessionId) {
        await supabase
          .from("anubhav_sessions")
          .update({
            score: data?.totalScore ?? 0,
            total_attempted: sentences.length,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        const attempts = sentences.map((s, i) => ({
          session_id: sessionId,
          user_id: user.id,
          day_number: Number(dayNumber),
          sentence: s.sentence,
          student_response: allResponses[i] ?? "",
          ai_feedback: data?.sentenceResults?.[i]?.feedback ?? "",
          mti_target: s.mti_target,
          was_correct: data?.sentenceResults?.[i]?.wasCorrect ?? false,
          score_awarded: data?.sentenceResults?.[i]?.score ?? 0,
        }));

        await supabase.from("anubhav_attempts").insert(attempts);
      }

      setScreen("result");
    } catch (err) {
      console.error("Evaluation error:", err);
      setSessionResult(null);
      setScreen("result");
    } finally {
      setIsEvaluating(false);
    }
  };

  const fetchSentences = async (type: "professional" | "casual") => {
    setWorldType(type);
    const { data } = await supabase
      .from("practice_sentences")
      .select("*")
      .eq("lesson_day", Number(dayNumber))
      .eq("world_type", type)
      .eq("is_active", true)
      .order("sequence_order", { ascending: true });

    if (!data || data.length === 0) {
      setNoSentences(true);
      return;
    }

    setSentences(data);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: session } = await supabase
      .from("anubhav_sessions")
      .insert({ user_id: user.id, day_number: Number(dayNumber), world_type: type })
      .select()
      .single();
    setSessionId(session?.id ?? null);
    setScreen("practice");
  };

  const resetSession = () => {
    setScreen("select");
    setCurrentIndex(0);
    setSessionScore(0);
    setSentences([]);
    setSessionId(null);
    setWorldType(null);
    setResponses([]);
    setSessionResult(null);
    setNoSentences(false);
    setCaptured(false);
    setFallbackVisible(false);
    setManualInput("");
    setFlameRating(0);
    setFlameSubmitted(false);
  };

  const getStars = (total?: number, max?: number) => {
    const t = total ?? sessionScore;
    const m = max ?? (sentences.length * 3);
    if (m === 0) return 1;
    const pct = t / m;
    if (pct >= 0.95) return 5;
    if (pct >= 0.8) return 4;
    if (pct >= 0.6) return 3;
    if (pct >= 0.4) return 2;
    return 1;
  };

  const submitQuickFlame = async () => {
    setSubmittingFlame(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert to daily_flames
      const { data: existing } = await supabase
        .from("daily_flames")
        .select("id")
        .eq("user_id", user.id)
        .eq("day_number", Number(dayNumber))
        .maybeSingle();

      const payload = {
        user_id: user.id,
        day_number: Number(dayNumber),
        flame_date: new Date().toISOString().split("T")[0],
        confidence_rating: flameRating,
        submitted_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from("daily_flames").update({ confidence_rating: flameRating }).eq("id", existing.id);
      } else {
        await supabase.from("daily_flames").insert(payload);
      }

      // Update streak (calendar-based)
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      const { data: prof } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, last_flame_date")
        .eq("id", user.id)
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
      } as any).eq("id", user.id);

      setFlameSubmitted(true);
      toast.success(`🔥 Day ${dayNumber} Flame Ignited! Streak: ${newStreak} 🔥`);
    } catch (err) {
      console.error(err);
      toast.error("Could not save flame. Try again.");
    } finally {
      setSubmittingFlame(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="text-6xl">🎯</span>
        <p className="text-sm text-foreground/40 mt-4">Loading practice...</p>
      </div>
    );
  }

  const current = sentences[currentIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-foreground/40">← Back</button>
        <span className="font-display font-bold text-primary text-base">🎯 Anubhav</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
          {screen === "practice" && sentences.length > 0
            ? `${currentIndex + 1} / ${sentences.length}`
            : `Day ${dayNumber}`}
        </span>
      </div>

      {/* Progress bar for practice */}
      {screen === "practice" && sentences.length > 0 && (
        <div className="px-5">
          <div className="h-[3px] w-full bg-foreground/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(currentIndex / sentences.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {/* ═══ SELECT SCREEN ═══ */}
          {screen === "select" && !noSentences && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(254,209,65,0.15)]">
                <span className="text-2xl">{masterEmoji}</span>
              </div>
              <h1 className="font-display text-xl font-bold text-foreground text-center mt-4">
                {masterName} is ready to practice!
              </h1>
              <p className="text-sm text-foreground/40 text-center mt-1">Day {dayNumber} — Choose your world</p>

              <div className="mt-8 flex flex-col gap-4 w-full">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fetchSentences("professional")} className="glass-card p-6 rounded-3xl cursor-pointer border border-foreground/10 hover:border-primary/40 flex items-center gap-4 text-left">
                  <span className="text-3xl">💼</span>
                  <div>
                    <p className="font-display font-bold text-foreground text-lg">Professional World</p>
                    <p className="text-sm text-foreground/40 mt-1">Office, interviews, meetings</p>
                    <p className="text-xs text-primary mt-2">10 sentences</p>
                  </div>
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fetchSentences("casual")} className="glass-card p-6 rounded-3xl cursor-pointer border border-foreground/10 hover:border-primary/40 flex items-center gap-4 text-left">
                  <span className="text-3xl">😊</span>
                  <div>
                    <p className="font-display font-bold text-foreground text-lg">Casual World</p>
                    <p className="text-sm text-foreground/40 mt-1">Friends, college, daily life</p>
                    <p className="text-xs text-primary mt-2">10 sentences</p>
                  </div>
                </motion.button>
              </div>
              <p className="text-xs text-foreground/30 text-center mt-8">✦ Practice makes permanent.</p>
            </motion.div>
          )}

          {/* ═══ NO SENTENCES ═══ */}
          {noSentences && (
            <motion.div key="no-sentences" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center flex-1 py-20">
              <span className="text-6xl">🎯</span>
              <p className="font-display text-lg font-bold text-foreground text-center mt-4">Practice sentences for Day {dayNumber} are coming soon! ✦</p>
              <button onClick={() => navigate("/dashboard")} className="mt-6 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl w-full text-center">← Back to Home</button>
            </motion.div>
          )}

          {/* ═══ PRACTICE SCREEN ═══ */}
          {screen === "practice" && current && (
            <motion.div key={`practice-${currentIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {current.scenario_context && (
                  <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">📍 {current.scenario_context}</span>
                )}
                {current.grammar_pattern && (
                  <span className="bg-foreground/5 text-foreground/30 text-xs px-3 py-1 rounded-full">{current.grammar_pattern}</span>
                )}
              </div>

              {/* Sentence Card */}
              <div className="glass-card-gold p-6 rounded-3xl shadow-[0_0_24px_rgba(254,209,65,0.08)] mt-4 text-center">
                <p className="font-display text-xl font-bold text-foreground leading-relaxed">{current.sentence}</p>
                {current.sentence_hindi && (
                  <p className="text-sm text-foreground/40 text-center mt-2 font-body italic">{current.sentence_hindi}</p>
                )}
                <div className="flex justify-end gap-1 mt-3">
                  {[1, 2, 3].map((d) => (
                    <div key={d} className={`w-2 h-2 rounded-full ${d <= (current.difficulty ?? 1) ? "bg-primary" : "bg-foreground/20"}`} />
                  ))}
                </div>
              </div>

              {/* Master prompt */}
              <div className="flex items-center gap-2 mt-5">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-sm">{masterEmoji}</span>
                </div>
                <p className="text-sm text-foreground/40 font-body italic">{masterName} says: Read this aloud →</p>
              </div>

              {/* MIC BUTTON STATES */}
              <div className="mt-4">
                {!isListening && !captured && (
                  <motion.button onClick={startListening} className="w-full py-6 rounded-3xl bg-primary text-background font-body font-bold text-lg flex items-center justify-center gap-3" whileTap={{ scale: 0.97 }}>
                    🎤 Tap to Speak
                  </motion.button>
                )}

                {isListening && (
                  <motion.button onClick={stopAndCapture} className="w-full py-6 rounded-3xl bg-foreground/5 border border-primary/30 font-body font-semibold text-base flex items-center justify-center gap-4">
                    <div className="flex items-end gap-[3px] h-7">
                      {[14, 20, 26, 20, 14].map((h, i) => (
                        <div key={i} className="wave-bar w-[3px] rounded-full bg-primary" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                    <span className="text-primary font-body font-semibold text-base">Tap to Stop</span>
                  </motion.button>
                )}

                {captured && (
                  <motion.div className="capture-flash w-full py-6 rounded-3xl bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <span className="text-green-400 font-body font-bold text-lg">✅ Got it!</span>
                  </motion.div>
                )}
              </div>

              {/* Fallback link */}
              {!fallbackVisible && !isListening && !captured && (
                <p onClick={() => setFallbackVisible(true)} className="text-xs text-foreground/20 text-center mt-3 cursor-pointer hover:text-foreground/40 transition-colors">
                  Can't use mic?
                </p>
              )}

              {/* Fallback textarea */}
              {fallbackVisible && !captured && (
                <div className="mt-3">
                  <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type your response..."
                    className="w-full min-h-[60px] p-3 rounded-2xl bg-foreground/5 border border-foreground/10 focus:border-primary outline-none resize-none font-body text-sm text-foreground placeholder:text-foreground/20 transition-colors"
                  />
                  <button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="w-full bg-primary text-background py-3 rounded-2xl font-body font-semibold text-sm mt-2 disabled:opacity-40">
                    Submit →
                  </button>
                </div>
              )}

              <p className="text-xs text-foreground/20 text-center mt-5">Sentence {currentIndex + 1} of {sentences.length}</p>
            </motion.div>
          )}

          {/* ═══ EVALUATING SCREEN ═══ */}
          {screen === "evaluating" && (
            <motion.div key="evaluating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[70vh] px-6">
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-24 h-24 rounded-3xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center shadow-[0_0_32px_rgba(254,209,65,0.15)]">
                <span className="text-4xl">{masterEmoji}</span>
              </motion.div>
              <p className="font-display text-xl font-bold text-foreground text-center mt-6">{masterName} is reviewing<br />your session...</p>
              <p className="text-sm text-foreground/40 text-center mt-2 font-body">Analysing all {sentences.length} sentences together...</p>
              <div className="flex gap-2 mt-8">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.div key={i} className="w-3 h-3 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay }} />
                ))}
              </div>
              <p className="text-xs text-foreground/20 text-center mt-6 font-body">This takes about 5-8 seconds ✦</p>
            </motion.div>
          )}

          {/* ═══ RESULT SCREEN ═══ */}
          {screen === "result" && (
            <motion.div key="result" initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", delay: 0.2 }} className="flex flex-col items-center">
              <motion.span className="text-[72px] text-center block" animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>🎯</motion.span>
              <h1 className="font-display text-3xl font-bold text-primary text-center mt-3">Session Complete!</h1>

              {/* Score card */}
              <div className="glass-card-gold p-6 rounded-3xl text-center mt-4 w-full">
                <p className="text-xs text-foreground/30 uppercase tracking-widest">Your Score</p>
                <p className="font-display text-4xl font-bold text-primary mt-2">{sessionResult?.totalScore ?? 0} / {sentences.length * 3}</p>
                <div className="flex gap-1 justify-center mt-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-2xl ${i < getStars() ? "text-primary" : "text-foreground/20"}`}>★</span>
                  ))}
                </div>
                {sessionResult?.overallFeedback && (
                  <p className="font-body text-sm text-foreground leading-relaxed italic mt-4">{sessionResult.overallFeedback}</p>
                )}
              </div>

              {/* Sentence breakdown */}
              <div className="w-full mt-6">
                <p className="text-xs text-foreground/30 uppercase tracking-widest mb-3">Your {sentences.length} Sentences</p>
                <div className="flex flex-col gap-3">
                  {sentences.map((s, i) => {
                    const result = sessionResult?.sentenceResults?.[i];
                    return (
                      <div key={i} className="glass-card p-4 rounded-2xl">
                        <div className="flex justify-between items-center">
                          <span className="text-base">{result?.wasCorrect ? "✅" : "❌"}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 3 }).map((_, j) => (
                              <span key={j} className={`text-sm ${j < (result?.score ?? 0) ? "text-primary" : "text-foreground/20"}`}>★</span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] text-foreground/25 uppercase">Target:</p>
                          <p className="text-sm text-foreground/60 font-body mt-0.5">{s.sentence}</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] text-foreground/25 uppercase">You said:</p>
                          <p className="text-sm text-foreground/45 font-body italic mt-0.5">{responses[i] || "(no response)"}</p>
                        </div>
                        {!result?.wasCorrect && result?.correction && (
                          <div className="mt-2">
                            <p className="text-[10px] text-primary/50 uppercase">Better:</p>
                            <p className="text-sm text-primary font-body font-medium mt-0.5">{result.correction}</p>
                          </div>
                        )}
                        {result?.feedback && (
                          <p className="text-xs text-foreground/35 font-body mt-2 italic">{result.feedback}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ═══ QUICK FLAME SECTION ═══ */}
              <div className="w-full mt-6">
                {flameSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card-gold p-5 rounded-2xl text-center"
                  >
                    <span className="text-3xl">🔥</span>
                    <p className="font-display font-bold text-primary mt-2">Day {dayNumber} Flame Already Ignited! ✦</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card-gold p-5 rounded-2xl"
                  >
                    <div className="text-center">
                      <span className="text-3xl">🔥</span>
                      <h3 className="font-display font-bold text-foreground mt-2">Ignite Today's Flame</h3>
                      <p className="text-xs text-foreground/40 font-body mt-1">How confident did you feel today?</p>
                    </div>
                    <div className="flex justify-center mt-4 gap-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setFlameRating(i)}
                          className="text-3xl cursor-pointer transition-transform hover:scale-110"
                        >
                          {i <= flameRating ? <span className="text-primary">★</span> : <span className="text-foreground/20">☆</span>}
                        </motion.button>
                      ))}
                    </div>
                    <button
                      onClick={submitQuickFlame}
                      disabled={flameRating === 0 || submittingFlame}
                      className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-body font-semibold disabled:opacity-40"
                    >
                      {submittingFlame ? "Igniting..." : "Ignite My Flame 🔥"}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-col gap-3 w-full pb-8">
                <button onClick={resetSession} className="glass-card border border-primary/30 text-primary font-body font-semibold py-4 rounded-2xl w-full text-center">
                  Practice Again 🔄
                </button>
                <button onClick={() => navigate("/dashboard")} className="glass-card border border-foreground/10 text-foreground/40 font-body py-4 rounded-2xl w-full text-center">
                  Back to Home
                </button>
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
