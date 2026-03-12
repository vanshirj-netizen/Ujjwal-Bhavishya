import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

interface ProfileData {
  full_name: string;
  ub_student_id: string;
  selected_master: string | null;
  payment_status: string;
  enrollment_date: string;
  chosen_world: string | null;
  whatsapp_opted_in: boolean | null;
  mother_tongue: string | null;
  childhood_state: string | null;
}

interface Stats {
  daysDone: number;
  flames: number;
  bestStreak: number;
  avgConfidence: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({
    daysDone: 0,
    flames: 0,
    bestStreak: 0,
    avgConfidence: "–",
  });
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Student");

  const [selectedMasterLocal, setSelectedMasterLocal] = useState("gyani");
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [chosenWorldDisplay, setChosenWorldDisplay] = useState("");
  const [whatsappOn, setWhatsappOn] = useState(true);
  const [motherTongueDisplay, setMotherTongueDisplay] = useState("");
  const [childhoodStateDisplay, setChildhoodStateDisplay] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth"); return; }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, ub_student_id, selected_master, payment_status, enrollment_date, chosen_world, whatsapp_opted_in, mother_tongue, childhood_state")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(profileData);

        // Google login fallback chain
        const resolvedName =
          (profileData?.full_name && profileData.full_name !== "Student")
            ? profileData.full_name
            : user?.user_metadata?.full_name ||
              user?.user_metadata?.name ||
              user?.email?.split("@")[0] ||
              "Student";
        setDisplayName(resolvedName);

        setSelectedMasterLocal(profileData?.selected_master ?? "gyani");
        setChosenWorldDisplay(profileData?.chosen_world ?? "");
        setWhatsappOn(profileData?.whatsapp_opted_in ?? true);
        setMotherTongueDisplay(profileData?.mother_tongue ?? "");
        setChildhoodStateDisplay(profileData?.childhood_state ?? "");

        const { data: progressData } = await supabase
          .from("progress")
          .select("day_complete")
          .eq("user_id", user.id);

        const { data: flameData } = await supabase
          .from("daily_flames")
          .select("confidence_rating")
          .eq("user_id", user.id);

        const { data: userData } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak")
          .eq("id", user.id)
          .single();

        const daysDone = progressData?.filter(p => p.day_complete).length ?? 0;
        const flames = flameData?.length ?? 0;
        const bestStreak = userData?.longest_streak ?? 0;
        const ratings = flameData?.map(f => f.confidence_rating).filter(Boolean) ?? [];
        const avgConfidence = ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : "–";

        setStats({ daysDone, flames, bestStreak, avgConfidence });
      } catch (err) {
        console.error("Profile fetch error:", err);
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const handleUpgrade = () => {
    window.open("https://razorpay.com/payment-link/YOUR_LINK_HERE", "_blank");
  };

  const saveMaster = async (newMaster: string) => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ selected_master: newMaster } as any)
        .eq("id", user.id);
      setSelectedMasterLocal(newMaster);
      setShowMasterModal(false);
      toast.success("Master updated ✦");
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveWhatsapp = async (val: boolean) => {
    setWhatsappOn(val);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ whatsapp_opted_in: val } as any)
        .eq("id", user.id);
      toast.success(val ? "WhatsApp updates on" : "WhatsApp updates off");
    } catch {
      toast.error("Could not save");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const ubId = profile?.ub_student_id ?? "UB-000001";
  const paymentStatus = profile?.payment_status ?? "free";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Hero Logo Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full overflow-hidden h-[110px] sm:h-[130px] lg:h-[150px]"
        style={{
          background: "linear-gradient(180deg, hsl(161 96% 6%) 0%, hsl(161 96% 8%) 50%, hsl(161 96% 10%) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(44 99% 68% / 0.12) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none profile-hero-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png" alt="Ujjwal Bhavishya" className="w-[65%] max-w-[400px] h-auto object-contain drop-shadow-lg" />
        </div>
      </motion.div>

      <div className="px-5 max-w-lg mx-auto">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card-gold p-6 mt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
          <h2 className="text-lg font-display font-bold text-foreground mt-3">{displayName}</h2>
          <p className="text-sm font-mono-ub text-primary mt-1 tracking-widest">{ubId}</p>
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {selectedMasterLocal === "gyani" ? "📖 Gyani's Student" : "⚡ Gyanu's Student"}
          </span>
          <div className="mt-3">
            <span className={`inline-block text-xs px-3 py-1 rounded-full ${paymentStatus === "paid" ? "bg-primary/20 text-primary border border-primary/30" : "bg-foreground/10 text-foreground/60"}`}>
              {paymentStatus === "paid" ? "Premium ✅" : "Free Tier"}
            </span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 mt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            {[
              { label: "Days Done", value: stats.daysDone },
              { label: "Flames", value: stats.flames },
              { label: "Best Streak", value: stats.bestStreak },
              { label: "Avg Confidence", value: stats.avgConfidence },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] text-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upgrade */}
        {paymentStatus === "free" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4">
            <button onClick={handleUpgrade} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow active:scale-[0.98] transition-transform">
              Unlock All 60 Days →
            </button>
          </motion.div>
        )}

        {/* Preferences */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 space-y-2">
          <p className="text-xs font-body text-foreground/40 uppercase tracking-widest mb-2">Preferences</p>

          {/* Change Master */}
          <button onClick={() => setShowMasterModal(true)} className="w-full glass-card p-4 flex items-center justify-between">
            <span className="text-sm font-body text-foreground/70">My Master</span>
            <span className="text-sm font-body text-primary">{selectedMasterLocal === "gyani" ? "Gyani" : "Gyanu"} →</span>
          </button>

          {/* Change World */}
          <div className="glass-card p-4">
            <p className="text-sm font-body text-foreground/70 mb-2">My World</p>
            <div className="flex gap-2">
              {["professional", "casual"].map((w) => {
                const active = chosenWorldDisplay.split(",").filter(Boolean).includes(w);
                return (
                  <button
                    key={w}
                    onClick={async () => {
                      const current = chosenWorldDisplay.split(",").filter(Boolean);
                      const updated = current.includes(w) ? current.filter(x => x !== w) : [...current, w];
                      const val = updated.join(",");
                      setChosenWorldDisplay(val);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase.from("profiles").update({ chosen_world: val } as any).eq("id", user.id);
                        }
                      } catch {
                        // silent
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-body font-medium capitalize transition-all ${
                      active ? "bg-primary text-primary-foreground" : "bg-foreground/5 border border-foreground/20 text-foreground/50"
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp toggle */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-body text-foreground/70">WhatsApp Updates</p>
              <p className="text-xs font-body text-foreground/40">Progress nudges and encouragement</p>
            </div>
            <button
              onClick={() => saveWhatsapp(!whatsappOn)}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${whatsappOn ? "bg-primary" : "bg-foreground/20"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform duration-300 ${whatsappOn ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* My Background — read only */}
          {(motherTongueDisplay || childhoodStateDisplay) && (
            <div className="glass-card p-4">
              <p className="text-sm font-body text-foreground/70 mb-2">My Background</p>
              {motherTongueDisplay && (
                <div className="flex justify-between text-xs font-body mb-1">
                  <span className="text-foreground/40">Mother Tongue</span>
                  <span className="text-foreground/60">{motherTongueDisplay}</span>
                </div>
              )}
              {childhoodStateDisplay && (
                <div className="flex justify-between text-xs font-body mb-1">
                  <span className="text-foreground/40">Grew Up In</span>
                  <span className="text-foreground/60">{childhoodStateDisplay}</span>
                </div>
              )}
              <p className="text-[10px] font-body text-foreground/30 mt-2">This data shapes your AI coaching. Contact support to update it.</p>
            </div>
          )}
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 space-y-2">
          <p className="text-xs font-body text-foreground/40 uppercase tracking-widest mb-2">Account</p>
          <button className="w-full glass-card p-4 text-left text-sm text-foreground/70 hover:text-foreground transition-colors">Change Password</button>
          <button onClick={handleSignOut} className="w-full glass-card p-4 text-left text-sm text-destructive hover:text-destructive/80 transition-colors">Sign Out</button>
        </motion.div>
      </div>

      <BottomNav />

      {/* Master Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-5" onClick={() => setShowMasterModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card-gold p-6"
            style={{
              backgroundColor: '#01271d',
              border: '1px solid rgba(254,209,65,0.3)',
            }}
          >
            <h3 className="text-lg font-display font-bold text-primary text-center mb-4">Choose Your Master</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "gyani", img: "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp", traits: "Wisdom · Depth" },
                { key: "gyanu", img: "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp", traits: "Energy · Action" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => saveMaster(m.key)}
                  disabled={savingSettings}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedMasterLocal === m.key ? "glass-card-gold border-2 border-primary" : "glass-card"
                  }`}
                >
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-foreground/10 border border-primary/30 flex items-center justify-center">
                    <img
                      src={m.img}
                      alt={m.key}
                      className="w-full h-full object-cover"
                      style={{ objectFit: 'cover', objectPosition: 'top' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-sm font-display font-bold text-primary capitalize mt-2">{m.key}</p>
                  <p className="text-xs font-body text-foreground/50 mt-0.5">{m.traits}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMasterModal(false)} className="w-full mt-4 py-2 text-sm font-body text-foreground/40 hover:text-foreground/60 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
