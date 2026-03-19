import { useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, Dumbbell, Flame, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Compass, label: "Journey", path: "/journey" },
  { icon: Dumbbell, label: "Anubhav", path: "/anubhav-hub" },
  { icon: Flame, label: "Flame", path: "/flame" },
  { icon: Sparkles, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] relative"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-foreground/40"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-foreground/40"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
