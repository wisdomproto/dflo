type PhoneMockupProps = {
  children: React.ReactNode;
  scale?: number;
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  scale = 1,
}) => {
  return (
    <div
      style={{
        width: 360 * scale,
        height: 720 * scale,
        borderRadius: 40 * scale,
        border: "4px solid rgba(255,255,255,0.3)",
        backgroundColor: "white",
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120 * scale,
          height: 28 * scale,
          backgroundColor: "#1a1a2e",
          borderRadius: `0 0 ${16 * scale}px ${16 * scale}px`,
          zIndex: 10,
        }}
      />
      {/* Screen content */}
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};
