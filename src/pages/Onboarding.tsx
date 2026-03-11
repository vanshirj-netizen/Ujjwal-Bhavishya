import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // New state variables for steps 4-8
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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      const { data } = await supabase.from("profiles").select("full_name, onboarding_complete").eq("id", session.user.id).single();
      if (data?.full_name) setFullName(data.full_name);
      if (data?.onboarding_complete) onboardingCompleteRef.current = true;
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

  // MTI Detection
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

  // Updated handleFinish — only called from step 8
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

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
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
    { key: "Gyani", img: GYANI_IMG, audio: "/audio/gyani-intro.mp3", traits: "Wisdom • Depth • Ancient Knowledge", desc: "The scholar who transforms how you think" },
    { key: "Gyanu", img: GYANU_IMG, audio: "/audio/gyanu-intro.mp3", traits: "Energy • Action • Modern Mindset", desc: "The hustler who transforms how you act" },
  ];

  // Step dots component for steps 4-8
  const StepDots = ({ current }: { current: number }) => (
    <div className="flex gap-1.5">
      {[4, 5, 6, 7, 8].map((s) => (
        <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s === current ? "w-6 bg-primary" : "w-2 bg-foreground/20"}`} />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
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
                  <p className="mt-6 text-base font-body tracking-wide" style={{ color: "#fffcef" }}>
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
              className="text-[32px] font-display font-bold text-primary gold-text-glow text-center"
            >
              Namaste, {fullName} 🙏
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.18, duration: 0.4 }}
              className="mt-4 text-base font-body text-secondary text-center max-w-[320px] leading-relaxed"
            >
              Before you start your journey to Greatness — let's finish setting up your account.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.68, duration: 0.4 }}
              onClick={nextStep}
              className="mt-10 h-12 px-10 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform"
            >
              Let's Begin →
            </motion.button>
          </motion.div>
        )}

        {/* STEP 2 — Choose Course */}
        {step === 2 && (
          <motion.div key="course" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Choose Your Path</h2>
            <p className="text-sm font-body text-secondary/70 mt-2 text-center">Your 60-day transformation begins here</p>
            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
              {courses.map((c) => (
                <button
                  key={c.key}
                  disabled={!c.live}
                  onClick={() => c.live && setSelectedCourse(c.key)}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    c.live
                      ? selectedCourse === c.key
                        ? "glass-card-gold border-2 border-primary"
                        : "glass-card-gold hover:scale-[1.02]"
                      : "glass-card overflow-hidden cursor-not-allowed"
                  }`}
                >
                  {!c.live && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-xl z-10 flex items-start justify-end p-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/20 text-foreground/60 font-body">Coming Soon</span>
                    </div>
                  )}
                  {c.live && (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold font-body">
                      Now Live ✦
                    </span>
                  )}
                  {selectedCourse === c.key && (
                    <span className="absolute top-2 left-2 text-primary text-lg">✓</span>
                  )}
                  <p className={`text-base font-display font-bold mt-4 ${c.live ? "text-primary" : "text-foreground/40"}`}>{c.name}</p>
                  <p className="text-xs font-body text-secondary/60 mt-0.5">{c.subtitle}</p>
                  <p className="text-xs font-body text-foreground/40 mt-2 leading-relaxed">{c.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={nextStep}
              disabled={!selectedCourse}
              className="mt-8 w-full max-w-sm h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Begin My Journey →
            </button>
          </motion.div>
        )}

        {/* STEP 3 — Choose Master (now calls nextStep instead of handleFinish) */}
        {step === 3 && (
          <motion.div key="master" {...slideVariants} transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Choose Your Master</h2>
            <p className="text-sm font-body text-secondary/70 mt-2 text-center">Your guide for the next 60 days</p>
            <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
              {masters.map((m) => {
                const isSelected = selectedMaster === m.key;
                const otherSelected = selectedMaster && !isSelected;
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMaster(m.key)}
                    className={`relative p-4 rounded-xl text-center transition-all ${
                      isSelected
                        ? "glass-card-gold border-2 border-primary bg-primary/5"
                        : otherSelected
                          ? "glass-card opacity-60"
                          : "glass-card hover:scale-[1.02]"
                    }`}
                  >
                    <div
                      className="w-full h-[200px] rounded-2xl overflow-hidden mb-3 border-2"
                      style={{
                        borderColor: "#fed141",
                        boxShadow: isSelected ? "0 0 20px rgba(254,209,65,0.6)" : "none",
                      }}
                    >
                      <img src={m.img} alt={m.key} className="w-full h-full object-cover" style={m.key === "Gyani" ? { objectPosition: "center 30%" } : undefined} />
                    </div>
                    <p className="text-lg font-display font-bold text-primary">{m.key}</p>
                    <p className="text-xs font-body text-primary/80 mt-1">{m.traits}</p>
                    <p className="text-xs font-body text-foreground/50 mt-2 leading-relaxed">{m.desc}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); playAudio(m.audio); }}
                      className="mt-3 text-xs font-body text-primary/70 hover:text-primary transition-colors"
                    >
                      ▶ Play Intro
                    </button>
                  </button>
                );
              })}
            </div>
            <button
              onClick={nextStep}
              disabled={!selectedMaster}
              className="mt-8 w-full max-w-sm h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {`I Choose ${selectedMaster || "..."} →`}
            </button>
          </motion.div>
        )}

        {/* STEP 4 — Personal Details */}
        {step === 4 && (
          <motion.div key="personal" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <button onClick={() => setStep(3)} className="absolute top-6 left-5 text-sm font-body text-foreground/40 hover:text-foreground/70 transition-colors">← Back</button>
            <div className="absolute top-6 right-5"><StepDots current={4} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">A little about you</h2>
              <p className="text-sm font-body text-foreground/50 mt-2 text-center">This shapes your personalized coaching experience</p>
              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-body text-foreground/70 block">Date of Birth</label>
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
                    className="w-full h-12 rounded-lg px-4 text-sm font-body bg-foreground/5 border border-foreground/20 text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  {isUnder18 && (
                    <p className="text-xs font-body text-primary/70 mt-1">Please ensure a parent or guardian has approved your enrollment</p>
                  )}
                </div>
                {isUnder18 && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} className="mt-0.5 accent-primary" />
                    <span className="text-xs font-body text-foreground/60 leading-relaxed">I confirm that a parent or guardian has approved my enrollment</span>
                  </label>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-body text-foreground/70 block">Gender <span className="text-foreground/30">(optional)</span></label>
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
                        className={`px-4 py-2 rounded-lg text-sm font-body transition-all duration-200 ${
                          gender === g.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-foreground/5 border border-foreground/20 text-foreground/60"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={nextStep}
                disabled={!dob || (isUnder18 && !parentalConsent)}
                className="mt-8 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5 — Your Roots */}
        {step === 5 && (
          <motion.div key="roots" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 overflow-y-auto py-16 px-5 flex flex-col items-center">
            <button onClick={() => setStep(4)} className="fixed top-6 left-5 text-sm font-body text-foreground/40 hover:text-foreground/70 transition-colors z-10">← Back</button>
            <div className="fixed top-6 right-5 z-10"><StepDots current={5} /></div>
            <div className="w-full max-w-sm mt-4">
              <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Where did your story begin?</h2>
              <p className="text-sm font-body text-foreground/50 mt-2 text-center leading-relaxed">This is the most important question we ask. Your answer shapes your entire coaching.</p>
              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-body text-foreground/70 block">Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-12 rounded-lg px-4 text-sm font-body border border-foreground/20 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>
                    <option value="India" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>India</option>
                    <option value="United States" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>United States</option>
                    <option value="United Kingdom" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>United Kingdom</option>
                    <option value="United Arab Emirates" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>United Arab Emirates</option>
                    <option value="Canada" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>Canada</option>
                    <option value="Australia" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>Australia</option>
                    <option value="Other" style={{ backgroundColor: '#01271d', color: '#fffcef' }}>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-body text-foreground/70 block">Language spoken at home growing up</label>
                  <p className="text-xs font-body italic" style={{ color: "#fed141", opacity: 0.8 }}>The first language you learned — the one you think in</p>
                  <select
                    value={motherTongue || ""}
                    onChange={(e) => {
                      setMotherTongue(e.target.value);
                      if (e.target.value && childhoodState) detectMTIZone(e.target.value, childhoodState);
                    }}
                    className="w-full h-12 rounded-lg px-4 text-sm font-body bg-foreground/5 border border-foreground/20 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="" disabled>Select your mother tongue</option>
                    {["Hindi","Bhojpuri","Maithili","Awadhi","Chhattisgarhi","Bengali","Tamil","Telugu","Kannada","Malayalam","Marathi","Gujarati","Punjabi","Odia","Assamese","Urdu","Haryanvi","Rajasthani","Konkani","Sindhi","Kashmiri","Manipuri","Nepali","Dogri","Bodo","Tulu","Other"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                {country === "India" && (
                  <div className="space-y-2">
                    <label className="text-sm font-body text-foreground/70 block">Where did you grow up?</label>
                    <p className="text-xs font-body text-foreground/40 leading-relaxed">The place where you spent your childhood and school years — not where you live today. This helps us understand exactly how your English was shaped.</p>
                    <select
                      value={childhoodState || ""}
                      onChange={(e) => {
                        setChildhoodState(e.target.value);
                        if (e.target.value && motherTongue) detectMTIZone(motherTongue, e.target.value);
                      }}
                      className="w-full h-12 rounded-lg px-4 text-sm font-body bg-foreground/5 border border-foreground/20 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option value="" disabled>Select your state or UT</option>
                      <optgroup label="States">
                        {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Union Territories">
                        {["Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli","Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={nextStep}
                disabled={!motherTongue || (country === "India" && !childhoodState)}
                className="mt-8 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 6 — Your World */}
        {step === 6 && (
          <motion.div key="world" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <button onClick={() => setStep(5)} className="absolute top-6 left-5 text-sm font-body text-foreground/40 hover:text-foreground/70 transition-colors">← Back</button>
            <div className="absolute top-6 right-5"><StepDots current={6} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Which world do you want to master?</h2>
              <p className="text-sm font-body text-foreground/50 mt-2 text-center">Every lesson, every practice, every session — tailored to the English you actually need</p>
              <div className="mt-8 space-y-3">
                {[
                  { key: "professional", title: "Professional", subtitle: "Workplace English", lines: ["Client meetings & presentations", "Emails, reports, leadership", "Interviews & corporate life"], quote: "Speak like a leader" },
                  { key: "casual", title: "Casual", subtitle: "Everyday English", lines: ["Friends, family, social life", "Social media & daily talk", "Natural, real conversations"], quote: "Speak like yourself" },
                ].map((w) => (
                  <button
                    key={w.key}
                    onClick={() => setChosenWorld(w.key)}
                    className={`w-full p-5 rounded-xl text-left transition-all duration-200 ${
                      chosenWorld === w.key ? "glass-card-gold border-2 border-primary" : "glass-card"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-display font-bold text-primary">{w.title}</p>
                        <p className="text-xs font-body text-foreground/50 mt-0.5">{w.subtitle}</p>
                      </div>
                      {chosenWorld === w.key && <span className="text-primary text-lg">✓</span>}
                    </div>
                    <ul className="mt-3 space-y-1">
                      {w.lines.map((line) => (
                        <li key={line} className="text-xs font-body text-foreground/50">· {line}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs font-body italic" style={{ color: "#fed141", opacity: 0.8 }}>"{w.quote}"</p>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs font-body text-foreground/30 mt-4">You can change this anytime in your profile</p>
              <button
                onClick={nextStep}
                disabled={!chosenWorld}
                className="mt-6 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 7 — Your North Star */}
        {step === 7 && (
          <motion.div key="goal" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 flex flex-col items-center justify-center px-5">
            <button onClick={() => setStep(6)} className="absolute top-6 left-5 text-sm font-body text-foreground/40 hover:text-foreground/70 transition-colors">← Back</button>
            <div className="absolute top-6 right-5"><StepDots current={7} /></div>
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">What's your biggest goal?</h2>
              <p className="text-sm font-body text-foreground/50 mt-2 text-center">One honest answer shapes everything your AI coach focuses on</p>
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
                    onClick={() => setPrimaryGoal(g.key)}
                    className={`p-4 rounded-xl text-left text-sm font-body font-medium leading-snug transition-all duration-200 ${
                      primaryGoal === g.key
                        ? "glass-card-gold border-2 border-primary text-primary"
                        : "glass-card text-foreground/60"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <button
                onClick={nextStep}
                disabled={!primaryGoal}
                className="mt-8 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body gold-shimmer-btn active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Almost there →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 8 — Our Promise + Consent */}
        {step === 8 && (
          <motion.div key="promise" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }} className="fixed inset-0 overflow-y-auto py-16 px-5 flex flex-col items-center">
            <button onClick={() => setStep(7)} className="fixed top-6 left-5 text-sm font-body text-foreground/40 hover:text-foreground/70 transition-colors z-10">← Back</button>
            <div className="fixed top-6 right-5 z-10"><StepDots current={8} /></div>
            <div className="w-full max-w-sm mt-4">
              <h2 className="text-2xl font-display font-bold text-primary gold-text-glow text-center">Our promise to you 🦋</h2>
              <p className="text-sm font-body text-foreground/50 mt-2 text-center">Before we begin — here is what Ujjwal Bhavishya commits to you</p>
              <div className="mt-8 space-y-3">
                {[
                  { symbol: "✦", heading: "Your data belongs to you", body: "We never sell, share, or misuse your personal information. Ever." },
                  { symbol: "🦋", heading: "Your transformation is our goal", body: "If we fail to transform you, we refund every rupee. No questions asked." },
                  { symbol: "✦", heading: "You are seen as an individual", body: "Your coaching is built for you — your language, your region, your goals. Never generic." },
                ].map((p) => (
                  <div key={p.heading} className="glass-card p-4 flex gap-3 items-start">
                    <span className="text-primary text-lg mt-0.5 flex-shrink-0">{p.symbol}</span>
                    <div>
                      <p className="text-sm font-display font-bold text-foreground">{p.heading}</p>
                      <p className="text-xs font-body text-foreground/50 mt-1 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs font-body text-foreground/60 leading-relaxed">
                    I have read and agree to the{" "}
                    <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>
                    {" "}and{" "}
                    <a href="/terms" target="_blank" className="text-primary underline">Terms of Service</a>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs font-body text-foreground/60 leading-relaxed">I confirm I am 18 or older, or I have parental or guardian consent to enroll</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
                  <span className="text-xs font-body text-foreground/60 leading-relaxed">
                    Send me progress updates and encouragement on WhatsApp
                    <span className="text-foreground/30"> (recommended)</span>
                  </span>
                </label>
              </div>
              <motion.button
                onClick={handleFinish}
                disabled={!consentGiven || !ageVerified || saving}
                animate={consentGiven && ageVerified ? { boxShadow: ["0 0 0px rgba(254,209,65,0)", "0 0 20px rgba(254,209,65,0.4)", "0 0 0px rgba(254,209,65,0)"] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-8 w-full h-14 rounded-lg bg-primary text-primary-foreground font-semibold text-base font-body active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Starting your journey..." : "Begin My Transformation →"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
