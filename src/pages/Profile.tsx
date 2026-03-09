import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const navigate = useNavigate();

  // Placeholder data
  const fullName = "Student";
  const ubId = "UB-000001";
  const master = "gyani";
  const paymentStatus: string = "free";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="px-5 pt-6 max-w-lg mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-primary gold-text-glow"
        >
          Profile
        </motion.h1>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card-gold p-6 mt-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
          <h2 className="text-lg font-display font-bold text-foreground mt-3">{fullName}</h2>
          <p className="text-sm font-mono-ub text-primary mt-1">{ubId}</p>
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {master === "gyani" ? "📖 Gyani's Student" : "⚡ Gyanu's Student"}
          </span>
          <div className="mt-3">
            <span
              className={`inline-block text-xs px-3 py-1 rounded-full ${
                paymentStatus === "paid"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-foreground/10 text-foreground/60"
              }`}
            >
              {paymentStatus === "paid" ? "Premium ✅" : "Free Tier"}
            </span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 mt-4"
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            {[
              { label: "Days Done", value: "0" },
              { label: "Flames", value: "0" },
              { label: "Best Streak", value: "0" },
              { label: "Avg Confidence", value: "–" },
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4"
          >
            <button className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm gold-glow active:scale-[0.98] transition-transform">
              Unlock All 60 Days →
            </button>
          </motion.div>
        )}

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 space-y-2"
        >
          <button className="w-full glass-card p-4 text-left text-sm text-foreground/70 hover:text-foreground transition-colors">
            Change Password
          </button>
          <button
            onClick={handleSignOut}
            className="w-full glass-card p-4 text-left text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
