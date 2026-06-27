import { BookOpen, Compass, Heart, Users, Star, Globe, Shield, Smartphone, Info } from "lucide-react";

// ─── Features Data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <BookOpen size={20} />,
    title: "Quran Majeed",
    desc: "Urdu translation with beautiful recitation",
    color: "#10b981",
  },
  {
    icon: <BookOpen size={20} />,
    title: "Hadith Books",
    desc: "Sahih Bukhari, Muslim, Tirmizi, Abu Dawood, Ibn Majah, Nasai, Riyad Saliheen, Muwatta Malik, Al-Adab Al-Mufrad",
    color: "#6366f1",
  },
  {
    icon: <Shield size={20} />,
    title: "Hadith Grading",
    desc: "Every hadith marked as Sahih, Da'if or Hasan",
    color: "#f59e0b",
  },
  {
    icon: <Globe size={20} />,
    title: "50+ Languages",
    desc: "Translation in 50+ languages coming soon",
    color: "#3b82f6",
  },
  {
    icon: <Compass size={20} />,
    title: "Qibla Direction",
    desc: "Accurate Kaaba direction wherever you are",
    color: "#ec4899",
  },
  {
    icon: <Heart size={20} />,
    title: "Masnoon Duas",
    desc: "Daily azkar and words of remembrance",
    color: "#ef4444",
  },
  {
    icon: <Star size={20} />,
    title: "Digital Tasbih",
    desc: "Counter with modern features",
    color: "#8b5cf6",
  },
  {
    icon: <Users size={20} />,
    title: "User Profile",
    desc: "Save favourite hadiths, surahs, bookmarks & tasbih count",
    color: "#14b8a6",
  },
  {
    icon: <Smartphone size={20} />,
    title: "Imam Panel",
    desc: "Real-time prayer times, Eid timings & masjid location updates",
    color: "#f97316",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface AboutProps {
  onBack?: () => void;
}

export default function AboutPage({ onBack }: AboutProps) {
  return (
    <div dir="ltr" style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)",
        padding: "32px 24px 28px",
        textAlign: "center",
        color: "#ffffff",
        position: "relative",
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", borderRadius: 10, padding: "8px 14px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            ← Back
          </button>
        )}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
          color: "#ffffff",
        }}>
          <Info size={28} />
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
          StepToDeen
        </h1>
        <p style={{ margin: "0 0 14px", fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          Your complete Islamic companion app.
        </p>
        <span style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20,
          background: "rgba(255,255,255,0.15)", fontSize: 11, fontWeight: 600,
          border: "1px solid rgba(255,255,255,0.25)",
        }}>
          Beta Version
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 40px" }}>

        {/* About Card */}
        <div style={{
          background: "#ffffff", borderRadius: 16, padding: "20px",
          marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid #f1f5f9",
        }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            About Us
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            StepToDeen is an Islamic app currently in its experimental phase. Our mission is to
            make authentic Islamic knowledge easily accessible to every Muslim around the world —
            in their own language, at their fingertips.
          </p>
        </div>

        {/* Features */}
        <h3 style={{
          fontSize: 12, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 12, paddingLeft: 4,
        }}>
          App Features
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                background: "#ffffff", borderRadius: 12, padding: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
              }}
            >
              <span style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: f.color + "18", color: f.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {f.icon}
              </span>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                  {f.title}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Version Footer */}
        <div style={{
          background: "#ffffff", borderRadius: 12, padding: "14px 16px",
          border: "1px solid #f1f5f9", textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Version 1.0.0 &nbsp;•&nbsp; © 2024 StepToDeen
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
            May Allah accept this effort. Ameen 🤲
          </p>
        </div>

      </div>
    </div>
  );
}
