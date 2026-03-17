import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL, COURSE_ID } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";
import GoldCard from "@/components/ui/GoldCard";
import GoldButton from "@/components/ui/GoldButton";
import SectionLabel from "@/components/ui/SectionLabel";

const GYANI_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp";
const GYANU_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp";

const useCountUp = (end: number, duration = 1200) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setVal(Math.round(progress * end));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [end, duration]);
  return val;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [streak, setStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState(0);
  const [flamesSubmitted, setFlamesSubmitted] = useState(0);
  const [todayLesson, setTodayLesson] = useState<any>(null);
  const [todayProgress, setTodayProgress] = useState<any>(null);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [displayDay, setDisplayDay] = useState(1);
  const [selectedMaster, setSelectedMaster] = useState("gyani");
  const [avgConfidence, setAvgConfidence] = useState<string>("—");
  const [daysActive, setDaysActive] = useState(0);
  const [quoteText, setQuoteText] = useState("Every expert was once a beginner.");
  const [quoteAuthor, setQuoteAuthor] = useState("Helen Hayes");

  // Audio state
  const [quoteAudioState, setQuoteAudioState] = useState<"idle" | "loading" | "playing" | "played">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = session.user;

      const { data: profile } = await supabase.from("profiles").select("full_name, current_streak, selected_master").eq("id", user.id).maybeSingle();
      const fullName = (profile?.full_name && profile.full_name !== "Student") ? profile.full_name : user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
      setFirstName(fullName ? fullName.split(" ")[0] : "");
      setStreak(profile?.current_streak ?? 0);
      setSelectedMaster((profile?.selected_master ?? "gyani").toLowerCase());

      const { data: enrollData } = await supabase.from("enrollments").select("current_day, payment_status, days_completed").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      setEnrollmentData(enrollData);

      const { data: progressData } = await supabase.from("progress").select("day_number, day_complete").eq("user_id", user.id);
      const completedFromProgress = progressData?.filter(p => p.day_complete).length ?? 0;
      const resolvedCompleted = enrollData?.days_completed ?? completedFromProgress;
      setCompletedDays(resolvedCompleted);
      setDaysActive(progressData?.length ?? 0);

      const day = (enrollData?.current_day ?? 0) > 0 ? enrollData!.current_day! : (completedFromProgress > 0 ? completedFromProgress + 1 : 1);
      setDisplayDay(day);

      const { data: lessonData } = await supabase.from("lessons").select("title, week_number, day_number, quote_text, quote_author").eq("day_number", day).eq("course_id", COURSE_ID).maybeSingle();
      setTodayLesson(lessonData);
      if (lessonData?.quote_text) setQuoteText(lessonData.quote_text);
      if (lessonData?.quote_author) setQuoteAuthor(lessonData.quote_author);

      const { data: todayProg } = await supabase.from("progress").select("lesson_complete, anubhav_complete, flame_complete, gamma_complete, gyani_complete, gyanu_complete, quiz_complete, day_complete").eq("user_id", user.id).eq("day_number", day).maybeSingle();
      setTodayProgress(todayProg);

      const { data: flameData } = await supabase.from("daily_flames").select("id, confidence_rating").eq("user_id", user.id);
      setFlamesSubmitted(flameData?.length ?? 0);

      const ratings = flameData?.map(f => f.confidence_rating).filter(Boolean) ?? [];
      setAvgConfidence(ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—");

      // Check if quote already played today
      if (sessionStorage.getItem("quotePlayedDay") === String(day)) {
        setQuoteAudioState("played");
      }
    };
    fetchUserData();
  }, [location.key]);

  const masterName = selectedMaster === "gyanu" ? "Gyanu" : "Gyani";
  const masterImg = selectedMaster === "gyanu" ? GYANU_IMG : GYANI_IMG;

  const animStreak = useCountUp(streak);
  const animFlames = useCountUp(flamesSubmitted);
  const animDaysActive = useCountUp(daysActive);

  const navigateToDayScreen = () => {
    if (displayDay > 5 && enrollmentData?.payment_status === "free") {
      window.open(PAYMENT_URL, "_blank");
      return;
    }
    navigate("/day/" + displayDay);
  };

  const playQuoteAudio = async () => {
    if (quoteAudioState === "loading" || quoteAudioState === "playing") return;

    setQuoteAudioState("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-quote-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            quote: quoteText,
            author: quoteAuthor,
            userName: firstName || "Friend",
            masterName,
            dayNumber: displayDay,
          }),
        }
      );

      if (response.status === 429) {
        toast.error("Too many requests — please try again later");
        setQuoteAudioState("idle");
        return;
      }
      if (response.status === 402) {
        toast.error("AI credits exhausted — please try again later");
        setQuoteAudioState("idle");
        return;
      }

      const data = await response.json();

      if (data.error) {
        toast.error("Couldn't load audio — please try again");
        setQuoteAudioState("idle");
        return;
      }

      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => {
          setQuoteAudioState("played");
          sessionStorage.setItem("quotePlayedDay", String(displayDay));
        };
        audio.play();
        setQuoteAudioState("playing");
      } else {
        toast.error("Couldn't load audio — please try again");
        setQuoteAudioState("idle");
      }
    } catch {
      toast.error("Couldn't load audio — please try again");
      setQuoteAudioState("idle");
    }
  };

  const stats = [
    { emoji: "🔥", value: animStreak, label: "DAY STREAK" },
    { emoji: "✨", value: animFlames, label: "FLAMES LIT" },
    { emoji: "📅", value: animDaysActive, label: "DAYS ACTIVE" },
    { emoji: "💬", value: avgConfidence, label: "AVG CONFIDENCE" },
  ];

  return (
    <div className="min-h-screen pb-[100px] safe-top relative z-[2]">
      <div className="px-5 pt-8 max-w-lg mx-auto">
        {/* SECTION 1 — Hero Greeting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            >
              <h1
                className="font-display"
                style={{
                  fontSize: "clamp(2rem, 6vw, 3.5rem)",
                  fontWeight: 900,
                  color: "#FFFCEF",
                  lineHeight: 1.1,
                }}
              >
                Namaste
              </h1>
            </motion.div>
          </div>
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              <h1
                className="font-display"
                style={{
                  fontSize: "clamp(2.4rem, 7vw, 4rem)",
                  fontWeight: 900,
                  background: "var(--gg)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1.1,
                }}
              >
                {firstName || "Friend"}!
              </h1>
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="font-display italic mt-3"
            style={{
              fontSize: "clamp(0.85rem, 1.35vw, 1.1rem)",
              color: "rgba(255,252,239,0.75)",
            }}
          >
            Your journey continues. One day at a time.
          </motion.p>
        </motion.div>

        {/* SECTION 2 — Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <GoldCard padding="18px 14px">
                <div className="flex flex-col items-center text-center">
                  <span className="text-lg">{s.emoji}</span>
                  <span
                    className="font-display mt-1"
                    style={{
                      fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                      fontWeight: 900,
                      background: "var(--gg)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      lineHeight: 1.2,
                    }}
                  >
                    {typeof s.value === "number" ? s.value : s.value}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "0.58rem",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "rgba(255,252,239,0.65)",
                      marginTop: 4,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              </GoldCard>
            </motion.div>
          ))}
        </div>

        {/* SECTION 3 — Today's Lesson */}
        <motion.div
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8"
        >
          <GoldCard padding="24px" glow>
            <SectionLabel>TODAY'S LESSON</SectionLabel>
            <p
              className="mt-3"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: "uppercase",
                color: "rgba(255,252,239,0.55)",
                fontSize: "0.75rem",
              }}
            >
              DAY {displayDay} OF 60
            </p>
            <h2
              className="font-display mt-1.5"
              style={{
                fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                fontWeight: 900,
                color: "#FFFCEF",
              }}
            >
              {todayLesson?.title?.replace(/^Day\s*\d+:\s*/i, "") || "Loading..."}
            </h2>
            <div className="mt-5">
              <GoldButton fullWidth onClick={navigateToDayScreen}>
                Continue Day {displayDay} →
              </GoldButton>
            </div>
          </GoldCard>
        </motion.div>

        {/* SECTION 4 — Quote of the Day */}
        <motion.div
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-6"
        >
          <GoldCard padding="24px">
            <SectionLabel>YOUR DAILY WISDOM</SectionLabel>

            <span
              className="font-display block mt-3"
              style={{
                fontSize: "4rem",
                background: "var(--gg)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 0.5,
                marginBottom: 8,
              }}
            >
              "
            </span>

            <p
              className="font-display italic"
              style={{
                fontSize: "clamp(0.92rem, 1.4vw, 1.08rem)",
                color: "rgba(255,252,239,0.88)",
                lineHeight: 1.8,
              }}
            >
              {quoteText}
            </p>

            <p
              className="mt-3"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "0.62rem",
                letterSpacing: 2,
                textTransform: "uppercase",
                background: "var(--gg)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              — {quoteAuthor}
            </p>

            {/* Master row */}
            <div className="flex items-center gap-2.5 mt-4">
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "1.5px solid #ffc300" }}
              >
                <img src={masterImg} alt={masterName} className="w-full h-full object-cover" />
              </div>
              <span style={{ color: "#FFFCEF", fontSize: "0.8rem" }}>— {masterName}</span>
              <span
                style={{
                  background: "var(--gg)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: "0.7rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Your Master
              </span>
            </div>

            {/* Play button */}
            <div className="mt-4">
              <GoldButton
                onClick={playQuoteAudio}
                disabled={quoteAudioState === "played" || quoteAudioState === "loading" || quoteAudioState === "playing"}
                fullWidth
              >
                {quoteAudioState === "loading" && "⏳ Loading..."}
                {quoteAudioState === "playing" && "🔊 Playing..."}
                {quoteAudioState === "played" && "✓ Played today"}
                {quoteAudioState === "idle" && `▶ Hear it from ${masterName}`}
              </GoldButton>
            </div>
          </GoldCard>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
