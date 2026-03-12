import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

type Screen = "select" | "practice" | "result";

const AnubhavPage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [sentences, setSentences] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [worldType, setWorldType] = useState<"professional" | "casual" | null>(null);
  const [response, setResponse] = useState("");

  const [feedback, setFeedback] = useState("");
  const [correctedSentence, setCorrectedSentence] = useState("");
  const [score, setScore] = useState(0);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [sessionScore, setSessionScore] = useState(0);
  const [screen, setScreen] = useState<Screen>("select");
  const [loading, setLoading] = useState(true);
  const [noSentences, setNoSentences] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const masterName = profile?.selected_master === "gyanu" ? "Gyanu" : "Gyani";

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

  const submitResponse = async () => {
    if (!response.trim() || isEvaluating) return;
    setIsEvaluating(true);

    const current = sentences[currentIndex];
    try {
      const { data } = await supabase.functions.invoke("anubhav-coach", {
        body: {
          studentName: profile?.full_name ?? "Friend",
          masterName,
          dayNumber: Number(dayNumber),
          grammarPattern: current.grammar_pattern ?? "",
          scenarioContext: current.scenario_context ?? "",
          targetSentence: current.sentence,
          targetSentenceHindi: current.sentence_hindi ?? "",
          mtiTarget: current.mti_target ?? "",
          expectedKeywords: current.expected_keywords ?? "",
          vocabularyWords: current.vocabulary_words ?? "",
          studentResponse: response.trim(),
          ultimateGoal: profile?.primary_goal ?? "",
          mtiBackground: profile?.mti_zone ?? "",
        },
      });

      const result = data ?? {
        feedback: "Good try! Keep going. ✦",
        score: 1,
        wasCorrect: false,
        correctedSentence: current.sentence,
      };

      setFeedback(result.feedback);
      setScore(result.score);
      setWasCorrect(result.wasCorrect);
      setCorrectedSentence(result.correctedSentence);
      setSessionScore((s) => s + (result.score ?? 0));

      const { data: { user } } = await supabase.auth.getUser();
      if (user && sessionId) {
        await supabase.from("anubhav_attempts").insert({
          session_id: sessionId,
          user_id: user.id,
          day_number: Number(dayNumber),
          sentence: current.sentence,
          student_response: response.trim(),
          ai_feedback: result.feedback,
          mti_target: current.mti_target,
          was_correct: result.wasCorrect,
          score_awarded: result.score,
        });
      }
    } catch {
      setFeedback("Great effort! Keep practicing. ✦");
      setScore(1);
      setWasCorrect(false);
      setCorrectedSentence(current.sentence);
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextSentence = () => {
    setResponse("");
    setFeedback("");
    setScore(0);
    setWasCorrect(null);
    setCorrectedSentence("");

    if (currentIndex >= sentences.length - 1) {
      if (sessionId) {
        supabase
          .from("anubhav_sessions")
          .update({
            score: sessionScore,
            total_attempted: sentences.length,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
          .then();
      }
      setScreen("result");
    } else {
      setCurrentIndex((i) => i + 1);
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  };

  const resetSession = () => {
    setScreen("select");
    setCurrentIndex(0);
    setSessionScore(0);
    setSentences([]);
    setSessionId(null);
    setWorldType(null);
    setResponse("");
    setFeedback("");
    setNoSentences(false);
    setWasCorrect(null);
  };

  const getStars = () => {
    if (sentences.length === 0) return 1;
    const pct = sessionScore / (sentences.length * 3);
    if (pct >= 0.95) return 5;
    if (pct >= 0.8) return 4;
    if (pct >= 0.6) return 3;
    if (pct >= 0.4) return 2;
    return 1;
  };

  const performanceMessages: Record<number, string> = {
    5: `Legendary! ${masterName} is proud of you!`,
    4: "Excellent work! You're improving fast!",
    3: "Good effort! Keep practicing daily.",
    2: "Nice try! Come back and beat this!",
    1: "Every start is brave. Try again! ✦",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="text-6xl animate-pulse">🎯</span>
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
              animate={{ width: `${((currentIndex + (feedback ? 1 : 0)) / sentences.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {/* ═══ SELECT SCREEN ═══ */}
          {screen === "select" && !noSentences && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(254,209,65,0.15)]">
                <span className="text-2xl font-bold text-primary">{masterName[0]}</span>
              </div>
              <h1 className="font-display text-xl font-bold text-foreground text-center mt-4">
                {masterName} is ready to practice!
              </h1>
              <p className="text-sm text-foreground/40 text-center mt-1">
                Day {dayNumber} — Choose your world
              </p>

              <div className="mt-8 flex flex-col gap-4 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fetchSentences("professional")}
                  className="glass-card p-6 rounded-3xl cursor-pointer border border-foreground/10 hover:border-primary/40 flex items-center gap-4 text-left"
                >
                  <span className="text-3xl">💼</span>
                  <div>
                    <p className="font-display font-bold text-foreground text-lg">Professional World</p>
                    <p className="text-sm text-foreground/40 mt-1">Office, interviews, meetings</p>
                    <p className="text-xs text-primary mt-2">10 sentences</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fetchSentences("casual")}
                  className="glass-card p-6 rounded-3xl cursor-pointer border border-foreground/10 hover:border-primary/40 flex items-center gap-4 text-left"
                >
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
            <motion.div
              key="no-sentences"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center flex-1 py-20"
            >
              <span className="text-6xl">🎯</span>
              <p className="font-display text-lg font-bold text-foreground text-center mt-4">
                Practice sentences for Day {dayNumber} are coming soon! ✦
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-6 glass-card border border-foreground/10 text-foreground/60 font-body py-4 rounded-2xl w-full text-center"
              >
                ← Back to Home
              </button>
            </motion.div>
          )}

          {/* ═══ PRACTICE SCREEN ═══ */}
          {screen === "practice" && current && (
            <motion.div
              key={`practice-${currentIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {!feedback ? (
                <>
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {current.scenario_context && (
                      <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                        📍 {current.scenario_context}
                      </span>
                    )}
                    {current.grammar_pattern && (
                      <span className="bg-foreground/5 text-foreground/40 text-xs px-3 py-1 rounded-full">
                        {current.grammar_pattern}
                      </span>
                    )}
                  </div>

                  {/* Sentence Card */}
                  <div className="glass-card-gold p-5 rounded-3xl shadow-[0_0_20px_rgba(254,209,65,0.08)] mt-4">
                    <p className="font-display text-xl font-bold text-foreground text-center leading-relaxed">
                      {current.sentence}
                    </p>
                    {current.sentence_hindi && (
                      <p className="text-sm text-foreground/40 text-center mt-2 font-body italic">
                        {current.sentence_hindi}
                      </p>
                    )}
                    <div className="flex justify-end gap-1 mt-3">
                      {[1, 2, 3].map((d) => (
                        <div
                          key={d}
                          className={`w-2 h-2 rounded-full ${d <= (current.difficulty ?? 1) ? "bg-primary" : "bg-foreground/20"}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Master prompt */}
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">{masterName[0]}</span>
                    </div>
                    <p className="text-sm text-foreground/50 font-body italic">
                      {masterName} says: Now you say it in your own words in English →
                    </p>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    className="w-full mt-3 min-h-[100px] bg-foreground/5 rounded-2xl border border-foreground/10 focus:border-primary p-4 text-sm font-body text-foreground placeholder:text-foreground/30 outline-none resize-none"
                    placeholder={`Type your response in English here... (even broken English is okay — ${masterName} will help! ✦)`}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    disabled={isEvaluating}
                  />

                  {/* Submit */}
                  <button
                    onClick={submitResponse}
                    disabled={!response.trim() || isEvaluating}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold mt-3 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isEvaluating ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        />
                        {masterName} is reading...
                      </>
                    ) : (
                      "Submit →"
                    )}
                  </button>
                </>
              ) : (
                /* ═══ FEEDBACK ═══ */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  {/* Result banner */}
                  <div
                    className={`rounded-2xl p-4 ${
                      wasCorrect
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-primary/10 border border-primary/30"
                    }`}
                  >
                    <p className={`font-bold ${wasCorrect ? "text-green-400" : "text-primary"}`}>
                      {wasCorrect ? "✅ Well done!" : "💡 Here's the correction:"}
                    </p>
                  </div>

                  {/* Score stars */}
                  <div className="flex gap-1 mt-3">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className="text-xl">
                        {s <= score ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>

                  {/* Feedback text */}
                  <p className="font-body text-sm text-foreground leading-relaxed mt-3">{feedback}</p>

                  {/* Corrected sentence */}
                  {!wasCorrect && correctedSentence && (
                    <div className="glass-card mt-3 p-3 rounded-xl">
                      <p className="text-[10px] text-foreground/40 uppercase tracking-wider">✅ Correct version:</p>
                      <p className="font-body text-sm text-primary font-semibold mt-1">{correctedSentence}</p>
                    </div>
                  )}

                  {/* Next button */}
                  <button
                    onClick={nextSentence}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-body font-bold mt-4"
                  >
                    {currentIndex < sentences.length - 1 ? "Next Sentence →" : "See My Results 🎯"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ RESULT SCREEN ═══ */}
          {screen === "result" && (
            <motion.div
              key="result"
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <motion.span
                className="text-[80px] text-center block"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🎯
              </motion.span>

              <h1 className="font-display text-3xl font-bold text-primary text-center mt-4">
                Practice Complete!
              </h1>

              <div className="glass-card-gold p-6 rounded-3xl text-center mt-4 w-full">
                <p className="text-xs text-foreground/30 uppercase tracking-wider">Your Score</p>
                <p className="font-display text-4xl font-bold text-primary mt-2">
                  {sessionScore} / {sentences.length * 3}
                </p>
                <div className="flex gap-1 justify-center mt-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-2xl">
                      {s <= getStars() ? "⭐" : "☆"}
                    </span>
                  ))}
                </div>
              </div>

              <p className="font-display text-lg font-bold text-foreground text-center mt-4">
                {performanceMessages[getStars()]}
              </p>

              <div className="mt-6 flex flex-col gap-3 w-full">
                <button
                  onClick={resetSession}
                  className="glass-card border border-primary/30 text-primary font-body font-semibold py-4 rounded-2xl w-full"
                >
                  Practice Again 🔄
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="glass-card border border-foreground/10 text-foreground/50 font-body py-4 rounded-2xl w-full"
                >
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
