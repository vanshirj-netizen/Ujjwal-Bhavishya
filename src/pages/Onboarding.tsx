import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import GoldCard from "@/components/ui/GoldCard";

const VIDEO_URL = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB_Welcome_Video.mp4";
const UB_LOGO = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png";
const GYANI_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp";
const GYANU_IMG = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp";
const VIDEO_URL_DESKTOP = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB_Welcome_Video_Desktop.mp4";

const courses = [
  { key: "aarambh", name: "Aarambh", subtitle: "The Beginning", desc: "60 days to transform your foundation from the ground up", live: true },
  { key: "vikas", name: "Vikas", subtitle: "Growth", desc: "Personal development mastery", live: false },
  { key: "utkarsh", name: "Utkarsh", subtitle: "Excellence", desc: "Tech & AI skills", live: false },
  { key: "margdarshan", name: "Margdarshan", subtitle: "Guidance", desc: "Career counselling", live: false },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("Student");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState("India");
  const [motherTongue, setMotherTongue] = useState<string | null>(null);
  const [childhoodState, setChildhoodState] = useState<string | null>(null);
  const [mtiZone, setMtiZone] = useState("hindi_heartland");
  const [mtiProfileType, setMtiProfileType] = useState("single");
  const [mtiPrimaryZone, setMtiPrimaryZone] = useState("");
  const [mtiSecondaryZone, setMtiSecondaryZone] = useState("");
  const [chosenWorlds, setChosenWorlds] = useState<string[]>([]);
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [isUnder18, setIsUnder18] = useState(false);

  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onboardingCompleteRef = useRef(false);

  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth", { replace: true }); return; }
        const { data } = await supabase.from("profiles").select("full_name, onboarding_complete").eq("id", session.user.id).single();
        if (data?.full_name) setFullName(data.full_name);
        if (data?.onboarding_complete) onboardingCompleteRef.current = true;

        const name =
          data?.full_name ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "Friend";
        setWelcomeName(name.split(" ")[0]);
      } catch {
        setWelcomeName("Friend");
      }
    };
    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const videoSrc = isDesktop ? VIDEO_URL_DESKTOP : VIDEO_URL;

  useEffect(() => {
    if (step === 0 && videoRef.current) {
      videoRef.current.play().catch(() => {
        setShowPlayOverlay(true);
      });
    }
  }, [step]);

  const nextStep = () => setStep((s) => s + 1);

  const handleVideoEnd = () => {
    if (onboardingCompleteRef.current) {
      navigate("/dashboard", { replace: true });
    } else {
      nextStep();
    }
  };

  const handlePlayOverlayTap = () => {
    setShowPlayOverlay(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const detectMTIZone = (tongue: string, state: string) => {
    const stateZoneMap: Record<string, string> = {
      "Bihar": "hindi_heartland", "Uttar Pradesh": "hindi_heartland", "Jharkhand": "hindi_heartland",
      "Madhya Pradesh": "hindi_heartland", "Chhattisgarh": "hindi_heartland", "Uttarakhand": "hindi_heartland",
      "Delhi": "hindi_heartland", "Punjab": "punjabi_northwest", "Haryana": "punjabi_northwest",
      "Himachal Pradesh": "punjabi_northwest", "Jammu & Kashmir": "punjabi_northwest", "Ladakh": "punjabi_northwest",
      "Rajasthan": "punjabi_northwest", "Chandigarh": "punjabi_northwest", "Maharashtra": "western",
      "Gujarat": "western", "Goa": "western", "Dadra & Nagar Haveli": "western", "Daman & Diu": "western",
      "West Bengal": "eastern", "Odisha": "eastern", "Tamil Nadu": "dravidian_south", "Kerala": "dravidian_south",
      "Karnataka": "dravidian_south", "Andhra Pradesh": "dravidian_south", "Telangana": "dravidian_south",
      "Puducherry": "dravidian_south", "Lakshadweep": "dravidian_south", "Assam": "northeast",
      "Meghalaya": "northeast", "Manipur": "northeast", "Nagaland": "northeast", "Mizoram": "northeast",
      "Tripura": "northeast", "Arunachal Pradesh": "northeast", "Sikkim": "northeast", "Andaman & Nicobar": "eastern",
    };
    const languageZoneMap: Record<string, string> = {
      "Hindi": "hindi_heartland", "Bhojpuri": "hindi_heartland", "Maithili": "hindi_heartland",
      "Awadhi": "hindi_heartland", "Chhattisgarhi": "hindi_heartland", "Punjabi": "punjabi_northwest",
      "Haryanvi": "punjabi_northwest", "Rajasthani": "punjabi_northwest", "Dogri": "punjabi_northwest",
      "Marathi": "western", "Gujarati": "western", "Konkani": "western", "Sindhi": "western",
      "Bengali": "eastern", "Odia": "eastern", "Tamil": "dravidian_south", "Telugu": "dravidian_south",
      "Kannada": "dravidian_south", "Malayalam": "dravidian_south", "Tulu": "dravidian_south",
      "Assamese": "northeast", "Manipuri": "northeast", "Bodo": "northeast", "Nepali": "northeast",
      "Urdu": "hindi_heartland", "Kashmiri": "punjabi_northwest",
    };
    const sz = stateZoneMap[state] || "hindi_heartland";
    const lz = languageZoneMap[tongue] || "hindi_heartland";
    if (sz === lz) {
      setMtiProfileType("single");
      setMtiZone(sz);
      setMtiPrimaryZone(sz);
      setMtiSecondaryZone("");
    } else {
      setMtiProfileType("dual");
      setMtiZone(`${sz}_primary_${lz}_secondary`);
      setMtiPrimaryZone(sz);
      setMtiSecondaryZone(lz);
    }
  };

  const handleFinish = async () => {
    if (!consentGiven || !ageVerified) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const userId = session.user.id;
      const calculatedAge = dob
        ? new Date().getFullYear() - new Date(dob).getFullYear()
        : 99;
      const under18 = calculatedAge < 18;

      const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || null;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          ...(googleName ? { full_name: googleName } : {}),
          selected_master: selectedMaster,
          date_of_birth: dob || null,
          gender: gender || null,
          country,
          mother_tongue: motherTongue || null,
          childhood_state: childhoodState || null,
          mti_zone: mtiZone,
          mti_profile_type: mtiProfileType,
          mti_primary_zone: mtiPrimaryZone,
          mti_secondary_zone: mtiSecondaryZone,
          chosen_world: chosenWorlds.join(','),
          primary_goal: primaryGoals.join(','),
          whatsapp_opted_in: whatsappOptIn,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          age_verified: ageVerified,
          parental_consent: parentalConsent,
          is_under_18: under18,
          onboarding_complete: true,
          onboarding_step: 8,
        } as any)
        .eq("id", userId);
      if (profileError) throw profileError;

      await supabase.from("user_roles").upsert({
        user_id: userId,
        role: "student",
        is_active: true,
      } as any, { onConflict: "user_id,role" });

      await supabase.from("enrollments" as any).upsert({
        user_id: userId,
        course_id: "aarambh",
        enrollment_type: "free_trial",
        payment_status: "free",
        is_active: true,
      } as any, { onConflict: "user_id,course_id" });

      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const playAudio = (src: string) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); }
      audioRef.current = new Audio(src);
      audioRef.current.play().catch(() => {});
    } catch {}
  };

  const slideVariants = {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  const masters = [
    { key: "gyani", img: GYANI_IMG, audio: "/audio/gyani-intro.mp3", traits: "Wisdom • Depth • Ancient Knowledge", desc: "The scholar who transforms how you think" },
    { key: "gyanu", img: GYANU_IMG, audio: "/audio/gyanu-intro.mp3", traits: "Energy • Action • Modern Mindset", desc: "The hustler who transforms how you act" },
  ];

  const StepDots = ({ current }: { current: number }) => (
    <div className="flex gap-1.5">
      {[4, 5, 6, 7, 8].map((s) => (
        <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === current ? "w-6 bg-primary" : "w-2 bg-foreground/20"}`} />
      ))}
    </div>
  );

  const selectStyle = { backgroundColor: '#000e09', color: '#fffcef' };
  const optionStyle = { backgroundColor: '#000e09', color: '#fffcef' };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#000e09" }}>
      <AnimatePresence mode="wait">
        {/* STEP 0 — Brand Video */}
        {step === 0 && (
          <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 bg-black flex items-center justify-center">
            <video
              key={videoSrc}
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              onEnded={handleVideoEnd}
              className="w-full h-full object-cover bg-black"
              src={videoSrc}
            />
            <AnimatePresence>
              {showPlayOverlay && (
                <motion.div
                  key="play-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={handlePlayOverlayTap}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black cursor-pointer"
                >
                  <motion.div
                    animate={{ boxShadow: ["0 0 24px rgba(254,209,65,0.3)", "0 0 48px rgba(254,209,65,0.6)", "0 0 24px rgba(254,209,65,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                    style={{ border: "2px solid #fed141" }}
                  >
                    <span className="text-3xl ml-1" style={{ color: "#fed141" }}>▶</span>
                  </motion.div>
                  <p className="mt-6 text-base tracking-wide" style={{ fontFamily: "var(--fb)", color: "#fffcef" }}>
                    Tap to Begin Your Journey
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* STEP 1 — Namaste Welcome */}
        {step === 1 && (
          <motion.div key="namaste" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-6">
            <motion.img
              src={UB_LOGO}
              alt="UB"
              className="w-20 h-20 object-contain mb-6"
              animate={{ boxShadow: ["0 0 20px rgba(254,209,65,0.3)", "0 0 40px rgba(254,209,65,0.5)", "0 0 20px rgba(254,209,65,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12, duration: 0.3, type: "spring" }}
                  className="text-2xl text-primary"
                >
                  ✦
                </motion.span>
              ))}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.78, duration: 0.5 }}
              className="text-[32px] font-bold text-center"
              style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Namaste, {welcomeName || "Friend"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.18, duration: 0.4 }}
              className="mt-4 text-base text-center max-w-[320px] leading-relaxed"
              style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.75)" }}
            >
              Before you start your journey to Greatness — let's finish setting up your account.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.68, duration: 0.4 }}
            >
              <GoldButton onClick={nextStep} className="mt-10">
                Let's Begin →
              </GoldButton>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 2 — Choose Course */}
        {step === 2 && (
          <motion.div key="course" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Choose Your Path</h2>
            <p className="text-sm mt-2 text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Your 60-day transformation begins here</p>
            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
              {courses.map((c) => (
                <button
                  key={c.key}
                  disabled={!c.live}
                  onClick={() => c.live && setSelectedCourse(c.key)}
                  className="relative text-left transition-all"
                  style={{
                    padding: "1.5px",
                    borderRadius: 16,
                    background: selectedCourse === c.key ? "linear-gradient(135deg, #fed141, #ffe180, #ffc300)" : "rgba(255,252,239,0.1)",
                    opacity: c.live ? 1 : 0.5,
                  }}
                >
                  <div className="p-4 rounded-[14.5px] h-full" style={{ background: "var(--card-bg)" }}>
                    {!c.live && (
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full z-10" style={{ background: "rgba(255,252,239,0.1)", color: "rgba(255,252,239,0.6)", fontFamily: "var(--fa)" }}>Coming Soon</span>
                    )}
                    {c.live && (
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "linear-gradient(135deg, #fed141, #ffc300)", color: "#003326", fontFamily: "var(--fa)" }}>
                        Now Live ✦
                      </span>
                    )}
                    {selectedCourse === c.key && (
                      <span className="absolute top-2 left-2 text-lg" style={{ color: "#ffc300" }}>✓</span>
                    )}
                    <p className="text-base font-bold mt-4" style={{ fontFamily: "var(--fd)", color: selectedCourse === c.key ? "#ffc300" : "rgba(255,252,239,0.8)" }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{c.subtitle}</p>
                    <p className="text-xs mt-2 leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <GoldButton
              onClick={nextStep}
              disabled={!selectedCourse}
              fullWidth
              className="mt-8 max-w-sm"
            >
              Begin My Journey →
            </GoldButton>
          </motion.div>
        )}

        {/* STEP 3 — Choose Master */}
        {step === 3 && (
          <motion.div key="master" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5 overflow-y-auto py-10">
            <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Choose Your Master</h2>
            <p className="text-sm mt-2 text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Your guide for the next 60 days</p>
            <div className="flex flex-col gap-4 mt-8 w-full max-w-sm">
              {/* GYANI CARD */}
              <GoldCard padding="24px" glow={selectedMaster === "gyani"}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMaster("gyani")}
                  className="cursor-pointer relative"
                >
                  <div className={`absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedMaster === "gyani" ? "orb-pulse" : "border-[1.5px] border-primary/20"
                  }`} style={selectedMaster === "gyani" ? { background: "radial-gradient(circle, #fed141 0%, #f59e0b 60%, #d97706 100%)" } : {}}>
                    {selectedMaster === "gyani" && <span className="text-[10px] font-bold" style={{ color: "#003326" }}>✦</span>}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(253,193,65,0.1)", border: "1px solid rgba(253,193,65,0.2)" }}>
                      <span className="text-3xl">🧙‍♂️</span>
                    </div>
                    <div className="flex-1 pr-8">
                      <p className="font-bold text-xl" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Gyani</p>
                      <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Your wise, patient foundation builder</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {["Warm", "Patient", "Foundation First"].map(t => (
                          <span key={t} className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>{t}</span>
                        ))}
                      </div>
                      <div className="h-px mt-3 mb-2" style={{ background: "rgba(255,252,239,0.1)" }} />
                      <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.35)" }}>
                        "Your wise guide. Gyani celebrates every step and builds your confidence brick by brick. Perfect for your first English journey."
                      </p>
                    </div>
                  </div>
                </motion.div>
              </GoldCard>

              {/* GYANU CARD */}
              <GoldCard padding="0px" glow={selectedMaster === "gyanu"}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMaster("gyanu")}
                  className="cursor-pointer relative overflow-hidden"
                >
                  <div className="w-full py-2 text-center" style={{ background: "linear-gradient(90deg, #7f1d1d, #991b1b)", borderRadius: "16.5px 16.5px 0 0" }}>
                    <span className="text-xs tracking-widest font-bold uppercase" style={{ color: "#fecaca", fontFamily: "var(--fa)" }}>⚡ AT YOUR OWN RISK ⚡</span>
                  </div>
                  <div className="p-6 relative">
                    <div className={`absolute top-0 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedMaster === "gyanu" ? "orb-pulse" : "border-[1.5px] border-primary/20"
                    }`} style={selectedMaster === "gyanu" ? { background: "radial-gradient(circle, #fed141 0%, #f59e0b 60%, #d97706 100%)" } : {}}>
                      {selectedMaster === "gyanu" && <span className="text-[10px] font-bold" style={{ color: "#003326" }}>✦</span>}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(253,193,65,0.1)", border: "1px solid rgba(253,193,65,0.2)" }}>
                        <span className="text-3xl">🔥</span>
                      </div>
                      <div className="flex-1 pr-8">
                        <p className="font-bold text-xl" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>Gyanu</p>
                        <p className="text-sm mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Your brutal truth, results-first coach</p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {["No Shortcuts", "Hacks Not Textbooks", "Tough Love"].map(t => (
                            <span key={t} className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300", fontFamily: "var(--fa)" }}>{t}</span>
                          ))}
                        </div>
                        <div className="h-px mt-3 mb-2" style={{ background: "rgba(255,252,239,0.1)" }} />
                        <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.35)" }}>
                          "Gyanu will push you hard and call out every mistake. No comfort zone. No hand-holding. Only for those who are truly serious."
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </GoldCard>
            </div>
            <GoldButton
              onClick={nextStep}
              disabled={!selectedMaster}
              fullWidth
              className="mt-8 max-w-sm"
            >
              {`I Choose ${selectedMaster === "gyani" ? "Gyani" : selectedMaster === "gyanu" ? "Gyanu" : "..."} →`}
            </GoldButton>
          </motion.div>
        )}

        {/* STEP 4 — Personal Details */}
        {step === 4 && (
          <motion.div key="personal" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <GlassButton onClick={() => setStep(3)} className="absolute top-6 left-5 !px-3 !py-2 text-sm">← Back</GlassButton>
            <div className="absolute top-6 right-5"><StepDots current={4} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>A little about you</h2>
              <p className="text-sm mt-2 text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>This shapes your personalized coaching experience</p>
              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    max={new Date().toISOString().split("T")[0]}
                    min="1950-01-01"
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (e.target.value) {
                        const age = new Date().getFullYear() - new Date(e.target.value).getFullYear();
                        setIsUnder18(age < 18);
                      }
                    }}
                    className="w-full h-12 rounded-lg px-4 text-sm focus:outline-none transition-colors"
                    style={{ fontFamily: "var(--fb)", background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.15)", color: "#fffcef" }}
                  />
                  {isUnder18 && (
                    <p className="text-xs mt-1" style={{ fontFamily: "var(--fb)", color: "rgba(255,193,0,0.7)" }}>Please ensure a parent or guardian has approved your enrollment</p>
                  )}
                </div>
                {isUnder18 && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} className="mt-0.5 accent-primary" />
                    <span className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>I confirm that a parent or guardian has approved my enrollment</span>
                  </label>
                )}
                <div className="space-y-2">
                  <label className="text-sm block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Gender <span style={{ color: "rgba(255,252,239,0.3)" }}>(optional)</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: "male", label: "Male" },
                      { key: "female", label: "Female" },
                      { key: "other", label: "Other" },
                      { key: "prefer_not_to_say", label: "Prefer not to say" },
                    ].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setGender(gender === g.key ? null : g.key)}
                        className="px-4 py-2 rounded-lg text-sm transition-all duration-200"
                        style={{
                          fontFamily: "var(--fb)",
                          ...(gender === g.key
                            ? { background: "linear-gradient(135deg, #fed141, #ffc300)", color: "#003326" }
                            : { background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.15)", color: "rgba(255,252,239,0.6)" }),
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <GoldButton
                onClick={nextStep}
                disabled={!dob || (isUnder18 && !parentalConsent)}
                fullWidth
                className="mt-8"
              >
                Continue →
              </GoldButton>
            </div>
          </motion.div>
        )}

        {/* STEP 5 — Your Roots */}
        {step === 5 && (
          <motion.div key="roots" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 overflow-y-auto py-16 px-5 flex flex-col items-center">
            <GlassButton onClick={() => setStep(4)} className="fixed top-6 left-5 z-10 !px-3 !py-2 text-sm">← Back</GlassButton>
            <div className="fixed top-6 right-5 z-10"><StepDots current={5} /></div>
            <div className="w-full max-w-sm mt-4">
              <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Where did your story begin?</h2>
              <p className="text-sm mt-2 text-center leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>This is the most important question we ask. Your answer shapes your entire coaching.</p>
              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-12 rounded-lg px-4 text-sm focus:outline-none transition-colors appearance-none cursor-pointer" style={{ ...selectStyle, border: "1px solid rgba(255,252,239,0.15)", fontFamily: "var(--fb)" }}>
                    {["India", "United States", "United Kingdom", "United Arab Emirates", "Canada", "Australia", "Other"].map(c => (
                      <option key={c} value={c} style={optionStyle}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Language spoken at home growing up</label>
                  <p className="text-xs italic" style={{ color: "#fed141", opacity: 0.8, fontFamily: "var(--fb)" }}>The first language you learned — the one you think in</p>
                  <select
                    value={motherTongue || ""}
                    onChange={(e) => {
                      setMotherTongue(e.target.value);
                      if (e.target.value && childhoodState) detectMTIZone(e.target.value, childhoodState);
                    }}
                    className="w-full h-12 rounded-lg px-4 text-sm focus:outline-none transition-colors appearance-none cursor-pointer"
                    style={{ ...selectStyle, border: "1px solid rgba(255,252,239,0.15)", fontFamily: "var(--fb)" }}
                  >
                    <option value="" disabled style={optionStyle}>Select your mother tongue</option>
                    {["Hindi","Bhojpuri","Maithili","Awadhi","Chhattisgarhi","Bengali","Tamil","Telugu","Kannada","Malayalam","Marathi","Gujarati","Punjabi","Odia","Assamese","Urdu","Haryanvi","Rajasthani","Konkani","Sindhi","Kashmiri","Manipuri","Nepali","Dogri","Bodo","Tulu","Other"].map((l) => (
                      <option key={l} value={l} style={optionStyle}>{l}</option>
                    ))}
                  </select>
                </div>
                {country === "India" && (
                  <div className="space-y-2">
                    <label className="text-sm block" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.7)" }}>Where did you grow up?</label>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.4)" }}>The place where you spent your childhood and school years — not where you live today. This helps us understand exactly how your English was shaped.</p>
                    <select
                      value={childhoodState || ""}
                      onChange={(e) => {
                        setChildhoodState(e.target.value);
                        if (e.target.value && motherTongue) detectMTIZone(motherTongue, e.target.value);
                      }}
                      className="w-full h-12 rounded-lg px-4 text-sm focus:outline-none transition-colors appearance-none cursor-pointer"
                      style={{ ...selectStyle, border: "1px solid rgba(255,252,239,0.15)", fontFamily: "var(--fb)" }}
                    >
                      <option value="" disabled style={optionStyle}>Select your state or UT</option>
                      <optgroup label="States" style={optionStyle}>
                        {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].map((s) => (
                          <option key={s} style={optionStyle}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Union Territories" style={optionStyle}>
                        {["Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli","Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry"].map((s) => (
                          <option key={s} style={optionStyle}>{s}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>
              <GoldButton
                onClick={nextStep}
                disabled={!motherTongue || (country === "India" && !childhoodState)}
                fullWidth
                className="mt-8"
              >
                Continue →
              </GoldButton>
            </div>
          </motion.div>
        )}

        {/* STEP 6 — Your World */}
        {step === 6 && (
          <motion.div key="world" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <GlassButton onClick={() => setStep(5)} className="absolute top-6 left-5 !px-3 !py-2 text-sm">← Back</GlassButton>
            <div className="absolute top-6 right-5"><StepDots current={6} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Which world do you want to master?</h2>
              <p className="text-sm mt-2 text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Every lesson, every practice, every session — tailored to the English you actually need</p>
              <p className="text-xs mt-1 text-center" style={{ color: "rgba(255,193,0,0.6)", fontFamily: "var(--fb)" }}>Select one or both</p>
              <div className="mt-8 space-y-3">
                {[
                  { key: "professional", title: "Professional", subtitle: "Workplace English", lines: ["Client meetings & presentations", "Emails, reports, leadership", "Interviews & corporate life"], quote: "Speak like a leader" },
                  { key: "casual", title: "Casual", subtitle: "Everyday English", lines: ["Friends, family, social life", "Social media & daily talk", "Natural, real conversations"], quote: "Speak like yourself" },
                ].map((w) => (
                  <GoldCard key={w.key} padding="20px" glow={chosenWorlds.includes(w.key)}>
                    <button
                      onClick={() => setChosenWorlds(prev => prev.includes(w.key) ? prev.filter(x => x !== w.key) : [...prev, w.key])}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-bold" style={{ fontFamily: "var(--fd)", color: "#ffc300" }}>{w.title}</p>
                          <p className="text-xs mt-0.5" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{w.subtitle}</p>
                        </div>
                        {chosenWorlds.includes(w.key) && <span className="text-lg" style={{ color: "#ffc300" }}>✓</span>}
                      </div>
                      <ul className="mt-3 space-y-1">
                        {w.lines.map((line) => (
                          <li key={line} className="text-xs" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>· {line}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs italic" style={{ color: "#fed141", opacity: 0.8, fontFamily: "var(--fb)" }}>"{w.quote}"</p>
                    </button>
                  </GoldCard>
                ))}
              </div>
              <p className="text-center text-xs mt-4" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.3)" }}>You can change this anytime in your profile</p>
              <GoldButton
                onClick={nextStep}
                disabled={chosenWorlds.length === 0}
                fullWidth
                className="mt-6"
              >
                Continue →
              </GoldButton>
            </div>
          </motion.div>
        )}

        {/* STEP 7 — Your North Star */}
        {step === 7 && (
          <motion.div key="goal" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <GlassButton onClick={() => setStep(6)} className="absolute top-6 left-5 !px-3 !py-2 text-sm">← Back</GlassButton>
            <div className="absolute top-6 right-5"><StepDots current={7} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>What are your goals?</h2>
              <p className="text-sm mt-2 text-center" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>Select all that apply</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { key: "workplace_confidence", label: "Speak confidently at work" },
                  { key: "remove_mti", label: "Remove my MTI & accent" },
                  { key: "crack_interview", label: "Crack my dream interview" },
                  { key: "daily_fluency", label: "Sound fluent every day" },
                  { key: "leadership", label: "Become a confident leader" },
                  { key: "writing", label: "Improve my writing too" },
                ].map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setPrimaryGoals(prev => prev.includes(g.key) ? prev.filter(x => x !== g.key) : [...prev, g.key])}
                    className="p-4 rounded-xl text-left text-sm font-medium leading-snug transition-all duration-200"
                    style={{
                      fontFamily: "var(--fb)",
                      ...(primaryGoals.includes(g.key)
                        ? { background: "rgba(253,193,65,0.1)", border: "2px solid #ffc300", color: "#ffc300" }
                        : { background: "rgba(255,252,239,0.04)", border: "1px solid rgba(255,252,239,0.1)", color: "rgba(255,252,239,0.6)" }),
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <GoldButton
                onClick={nextStep}
                disabled={primaryGoals.length === 0}
                fullWidth
                className="mt-8"
              >
                Almost there →
              </GoldButton>
            </div>
          </motion.div>
        )}

        {/* STEP 8 — Our Promise + Consent */}
        {step === 8 && (
          <motion.div key="promise" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 overflow-y-auto py-16 px-5 flex flex-col items-center">
            <GlassButton onClick={() => setStep(7)} className="fixed top-6 left-5 z-10 !px-3 !py-2 text-sm">← Back</GlassButton>
            <div className="fixed top-6 right-5 z-10"><StepDots current={8} /></div>
            <div className="w-full max-w-sm mt-4">
              <h2 className="text-2xl font-bold text-center" style={{ fontFamily: "var(--fd)", background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Our promise to you 🦋</h2>
              <div className="mt-8 space-y-3">
                {[
                  { symbol: "✦", heading: "Your data belongs to you", body: "We never sell, share, or misuse your personal information. Ever." },
                  { symbol: "✦", heading: "Your transformation is our goal", body: "Built with one question at every step: will this transform the student? If the answer was no — we didn't build it." },
                  { symbol: "✦", heading: "You are seen as an individual", body: "Your coaching is built for you — your language, your region, your goals. Never generic." },
                ].map((p) => (
                  <GoldCard key={p.heading} padding="16px">
                    <div className="flex gap-3 items-start">
                      <span className="text-lg mt-0.5 flex-shrink-0" style={{ color: "#ffc300" }}>{p.symbol}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ fontFamily: "var(--fd)", color: "#fffcef" }}>{p.heading}</p>
                        <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.5)" }}>{p.body}</p>
                      </div>
                    </div>
                  </GoldCard>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>
                    I have read and agree to the{" "}
                    <button type="button" onClick={() => toast("Our Privacy Policy and Terms of Service are being finalised. For any questions write to us at hello@ujjwalbhavishya.co.in")} className="underline transition-colors" style={{ color: "#ffc300" }}>Privacy Policy</button>
                    {" "}and{" "}
                    <button type="button" onClick={() => toast("Our Privacy Policy and Terms of Service are being finalised. For any questions write to us at hello@ujjwalbhavishya.co.in")} className="underline transition-colors" style={{ color: "#ffc300" }}>Terms of Service</button>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>I confirm I am 18 or older, or I have parental or guardian consent to enroll</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs leading-relaxed" style={{ fontFamily: "var(--fb)", color: "rgba(255,252,239,0.6)" }}>
                    Send me progress updates and encouragement on WhatsApp
                    <span style={{ color: "rgba(255,252,239,0.3)" }}> (recommended)</span>
                  </span>
                </label>
              </div>
              <motion.div
                animate={consentGiven && ageVerified ? { boxShadow: ["0 0 0px rgba(254,209,65,0)", "0 0 20px rgba(254,209,65,0.4)", "0 0 0px rgba(254,209,65,0)"] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-8"
              >
                <GoldButton
                  onClick={handleFinish}
                  disabled={!consentGiven || !ageVerified || saving}
                  fullWidth
                  className="h-14"
                >
                  {saving ? "Starting your journey..." : "Begin My Transformation →"}
                </GoldButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
