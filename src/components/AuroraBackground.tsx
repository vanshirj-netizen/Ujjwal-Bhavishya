const AuroraBackground = () => (
  <>
    <div className="fixed inset-0 z-[1] pointer-events-none" style={{ mixBlendMode: "screen" }}>
      <div
        className="absolute"
        style={{
          width: "min(900px, 90vw)",
          height: "min(900px, 90vw)",
          top: "-20%",
          left: "-20%",
          background: "radial-gradient(ellipse, rgba(180,120,0,0.22), transparent 68%)",
          animation: "auroraFloat1 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "min(750px, 75vw)",
          height: "min(750px, 75vw)",
          bottom: "-15%",
          right: "-15%",
          background: "radial-gradient(ellipse, rgba(0,140,70,0.18), transparent 68%)",
          animation: "auroraFloat2 32s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "min(600px, 65vw)",
          height: "min(600px, 65vw)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(200,140,0,0.14), transparent 68%)",
          animation: "auroraFloat3 20s ease-in-out infinite",
        }}
      />
    </div>
    {/* Gold grid overlay */}
    <div
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(253,193,65,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(253,193,65,0.06) 1px, transparent 1px)",
        backgroundSize: "88px 88px",
        opacity: 0.35,
      }}
    />
    <style>{`
      @keyframes auroraFloat1 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(30px, 20px); }
      }
      @keyframes auroraFloat2 {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-25px, -15px); }
      }
      @keyframes auroraFloat3 {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
      }
    `}</style>
  </>
);

export default AuroraBackground;
