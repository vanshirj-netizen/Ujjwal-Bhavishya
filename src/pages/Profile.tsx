import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PAYMENT_URL } from "@/lib/constants";
import { useActiveCourse } from "@/components/CourseSwitcher";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import GoldCard from "@/components/ui/GoldCard";
import GoldButton from "@/components/ui/GoldButton";
import GlassButton from "@/components/ui/GlassButton";
import SectionLabel from "@/components/ui/SectionLabel";

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
  avgConfidence: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const courseId = useActiveCourse();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ daysDone: 0, flames: 0, avgConfidence: "–" });
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Student");
  const [selectedMasterLocal, setSelectedMasterLocal] = useState("gyani");
  const [originalMaster, setOriginalMaster] = useState("gyani");
  const [chosenWorldDisplay, setChosenWorldDisplay] = useState("");
  const [whatsappOn, setWhatsappOn] = useState(true);
  const [motherTongueDisplay, setMotherTongueDisplay] = useState("");
  const [childhoodStateDisplay, setChildhoodStateDisplay] = useState("");
  const [savingMaster, setSavingMaster] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth"); return; }
        const { data: profileData } = await supabase.from("profiles").select("full_name, ub_student_id, selected_master, payment_status, enrollment_date, chosen_world, whatsapp_opted_in, mother_tongue, childhood_state").eq("id", user.id).maybeSingle();
        setProfile(profileData);
        const resolvedName = (profileData?.full_name && profileData.full_name !== "Student") ? profileData.full_name : user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Student";
        setDisplayName(resolvedName);
        const master = (profileData?.selected_master ?? "gyani").toLowerCase();
        setSelectedMasterLocal(master);
        setOriginalMaster(master);
        setChosenWorldDisplay(profileData?.chosen_world ?? "");
        setWhatsappOn(profileData?.whatsapp_opted_in ?? true);
        setMotherTongueDisplay(profileData?.mother_tongue ?? "");
        setChildhoodStateDisplay(profileData?.childhood_state ?? "");
        const { data: progressData } = await supabase.from("progress").select("day_complete").eq("user_id", user.id).eq("course_id", courseId);
        const { data: flameData } = await supabase.from("reflection_sessions").select("confidence_rating").eq("user_id", user.id).eq("course_id", courseId);
        const daysDone = progressData?.filter(p => p.day_complete).length ?? 0;
        const flames = flameData?.length ?? 0;
        const ratings = flameData?.map(f => f.confidence_rating).filter(Boolean) ?? [];
        const avgConfidence = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "–";
        setStats({ daysDone, flames, avgConfidence });
      } catch (err) {
        console.error("Profile fetch error:", err);
        toast.error("Could not load profile");
      } finally { setLoading(false); }
    };
    fetchProfile();
  }, [navigate, courseId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const handleUpgrade = () => { window.open(PAYMENT_URL, "_blank"); };

  const handleSaveMaster = async () => {
    setSavingMaster(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ selected_master: selectedMasterLocal } as any).eq("id", user.id);
      setOriginalMaster(selectedMasterLocal);
      toast.success("Master updated! ✦");
    } catch { toast.error("Could not save. Try again."); } finally { setSavingMaster(false); }
  };

  const saveWhatsapp = async (val: boolean) => {
    setWhatsappOn(val);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ whatsapp_opted_in: val } as any).eq("id", user.id);
      toast.success(val ? "WhatsApp updates on" : "WhatsApp updates off");
    } catch { toast.error("Could not save"); }
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
  const isGyani = selectedMasterLocal === "gyani";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const GoldOrb = ({ selected }: { selected: boolean }) => (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${selected ? "orb-pulse" : "border-[1.5px] border-primary/20"}`}
      style={selected ? { background: "radial-gradient(circle, #fed141 0%, #f59e0b 60%, #d97706 100%)" } : {}}
    >
      {selected && <span className="text-[10px] text-primary-foreground font-bold">✦</span>}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 safe-top relative z-[2]">
      <div className="px-5 pt-6 max-w-lg mx-auto">
        <PageHeader title={<><span className="text-gradient-gold">{displayName.split(" ")[0]}'s</span> Profile</>} />

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4">
          <GoldCard padding="24px">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mx-auto" style={{ background: "rgba(253,193,65,0.1)" }}>
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
              <h2 className="text-lg font-display font-bold mt-3" style={{ color: "#FFFCEF" }}>{displayName}</h2>
              <p className="text-sm font-mono-ub mt-1" style={{ color: "#ffc300", letterSpacing: "0.1em" }}>{ubId}</p>
              <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full border border-primary/20" style={{ background: "rgba(253,193,65,0.1)", color: "#ffc300" }}>
                {isGyani ? "📖 Gyani's Student" : "⚡ Gyanu's Student"}
              </span>
              <div className="mt-3">
                <span className={`inline-block text-xs px-3 py-1 rounded-full ${paymentStatus === "paid" ? "border border-primary/30" : ""}`} style={{ background: paymentStatus === "paid" ? "rgba(253,193,65,0.15)" : "rgba(255,252,239,0.06)", color: paymentStatus === "paid" ? "#ffc300" : "rgba(255,252,239,0.6)" }}>
                  {paymentStatus === "paid" ? "Premium ✅" : "Free Tier"}
                </span>
              </div>
            </div>
          </GoldCard>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4">
          <GoldCard padding="20px">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Days Done", value: stats.daysDone, icon: "✅" },
                { label: "Flames Lit", value: stats.flames, icon: "🔥" },
                { label: "Avg Belief", value: stats.avgConfidence === "–" ? "–" : `${stats.avgConfidence} / 5`, icon: "💬" },
              ].map((s) => (
                <div key={s.label}>
                  <span className="text-lg">{s.icon}</span>
                  <p className="font-display text-xl font-bold" style={{ background: "var(--gg)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,252,239,0.68)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </GoldCard>
        </motion.div>

        {/* Upgrade */}
        {paymentStatus === "free" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4">
            <GoldButton fullWidth onClick={handleUpgrade}>Unlock All 60 Days →</GoldButton>
          </motion.div>
        )}

        {/* Your Master */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
          <SectionLabel>Your Master</SectionLabel>
          <p className="text-xs mt-1" style={{ color: "rgba(255,252,239,0.55)" }}>You can change your master anytime</p>
          <div className="flex flex-col gap-3 mt-3">
            <button onClick={() => setSelectedMasterLocal("gyani")}>
              <GoldCard padding="16px">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">🧙‍♂️</span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm" style={{ color: "#FFFCEF" }}>Gyani</p>
                    <p className="text-xs" style={{ color: "rgba(255,252,239,0.65)" }}>Warm · Patient · Foundation-first</p>
                  </div>
                  <GoldOrb selected={selectedMasterLocal === "gyani"} />
                </div>
              </GoldCard>
            </button>
            <button onClick={() => setSelectedMasterLocal("gyanu")} className="relative">
              <GoldCard padding="0px">
                <div className="w-full py-0.5 text-center" style={{ background: "linear-gradient(90deg, #7f1d1d, #991b1b)", borderRadius: "18.5px 18.5px 0 0" }}>
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#fecaca", fontFamily: "var(--fa)" }}>⚡ AT YOUR OWN RISK ⚡</span>
                </div>
                <div className="flex items-center gap-3 p-4 text-left">
                  <span className="text-2xl">🔥</span>
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm" style={{ color: "#FFFCEF" }}>Gyanu</p>
                    <p className="text-xs" style={{ color: "rgba(255,252,239,0.65)" }}>Brutal truth · Hacks · Tough love</p>
                  </div>
                  <GoldOrb selected={selectedMasterLocal === "gyanu"} />
                </div>
              </GoldCard>
            </button>
          </div>
          {selectedMasterLocal !== originalMaster && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <GoldButton fullWidth onClick={handleSaveMaster} disabled={savingMaster}>
                {savingMaster ? "Saving..." : "Update My Master →"}
              </GoldButton>
            </motion.div>
          )}
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-6 space-y-2">
          <SectionLabel>Preferences</SectionLabel>
          <GoldCard padding="16px" className="mt-2">
            <p className="text-sm" style={{ color: "rgba(255,252,239,0.7)" }}>My World</p>
            <div className="flex gap-2 mt-2">
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
                        if (user) await supabase.from("profiles").update({ chosen_world: val } as any).eq("id", user.id);
                      } catch { }
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${active ? "text-primary-foreground" : "border border-foreground/20"}`}
                    style={active ? { background: "linear-gradient(135deg, #fed141, #ffc300)", color: "#003326" } : { color: "rgba(255,252,239,0.5)", background: "rgba(255,252,239,0.03)" }}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </GoldCard>

          <GoldCard padding="16px">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "rgba(255,252,239,0.7)" }}>WhatsApp Updates</p>
                <p className="text-xs" style={{ color: "rgba(255,252,239,0.65)" }}>Progress nudges and encouragement</p>
              </div>
              <button onClick={() => saveWhatsapp(!whatsappOn)} className={`relative w-11 h-6 rounded-full transition-all duration-300 ${whatsappOn ? "bg-primary" : ""}`} style={!whatsappOn ? { background: "rgba(255,252,239,0.15)" } : {}}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform duration-300 ${whatsappOn ? "translate-x-5" : "translate-x-0.5"}`} style={{ background: "#000e09" }} />
              </button>
            </div>
          </GoldCard>

          {(motherTongueDisplay || childhoodStateDisplay) && (
            <GoldCard padding="16px">
              <p className="text-sm" style={{ color: "rgba(255,252,239,0.7)" }}>My Background</p>
              {motherTongueDisplay && (
                <div className="flex justify-between text-xs mt-2">
                  <span style={{ color: "rgba(255,252,239,0.4)" }}>Mother Tongue</span>
                  <span style={{ color: "rgba(255,252,239,0.6)" }}>{motherTongueDisplay}</span>
                </div>
              )}
              {childhoodStateDisplay && (
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: "rgba(255,252,239,0.4)" }}>Grew Up In</span>
                  <span style={{ color: "rgba(255,252,239,0.6)" }}>{childhoodStateDisplay}</span>
                </div>
              )}
              <p className="text-[10px] mt-2" style={{ color: "rgba(255,252,239,0.3)" }}>This data shapes your AI coaching. Contact support to update it.</p>
            </GoldCard>
          )}
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 space-y-2">
          <SectionLabel>Account</SectionLabel>
          <div className="mt-2 space-y-2">
            <GlassButton className="w-full text-left" onClick={() => { }}>Change Password</GlassButton>
            <button onClick={handleSignOut} className="w-full text-left px-9 py-3.5 rounded-full text-sm transition-all" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", fontSize: "clamp(0.68rem, 0.92vw, 0.78rem)" }}>
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
