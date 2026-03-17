import { cn } from "@/lib/utils";

interface GoldCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  glow?: boolean;
}

const GoldCard = ({ children, className, padding = "24px", glow = false }: GoldCardProps) => (
  <div
    className={cn("gold-card-outer", className)}
    style={{
      padding: "1.5px",
      borderRadius: 20,
      background: "linear-gradient(135deg, #fed141, #ffe180, #ffc300, #f9be00, #ffe180, #fed141)",
      backgroundSize: "280% 280%",
      animation: "bglow 5s ease infinite",
      ...(glow ? { boxShadow: "0 0 40px rgba(253,193,65,0.14)" } : {}),
    }}
  >
    <div
      style={{
        borderRadius: 18.5,
        background: "var(--card-bg, rgba(0, 26, 16, 0.97))",
        height: "100%",
        padding,
      }}
    >
      {children}
    </div>
    <style>{`
      @keyframes bglow {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
    `}</style>
  </div>
);

export { GoldCard };
export default GoldCard;
