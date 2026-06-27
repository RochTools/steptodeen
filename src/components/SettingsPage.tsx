import { useState, useEffect } from "react";
import { Settings, MapPin } from "lucide-react";

interface SettingsProps {
  onBack?: () => void;
}

export default function SettingsPage({ onBack }: SettingsProps) {
  const [locationStatus, setLocationStatus] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      setLocationStatus(result.state as any);
      result.onchange = () => setLocationStatus(result.state as any);
    });
  }, []);

  async function handleRequestLocation() {
    if (!navigator.geolocation) return;
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("granted");
        setRequesting(false);
      },
      () => {
        setLocationStatus("denied");
        setRequesting(false);
      }
    );
  }

  const statusColor = locationStatus === "granted" ? "#16a34a" : locationStatus === "denied" ? "#dc2626" : "#f59e0b";
  const statusText  = locationStatus === "granted" ? "Allowed" : locationStatus === "denied" ? "Denied" : locationStatus === "unsupported" ? "Not Supported" : "Not Set";
  const statusBg    = locationStatus === "granted" ? "#f0fdf4" : locationStatus === "denied" ? "#fef2f2" : "#fffbeb";

  return (
    <div dir="ltr" style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
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
          margin: "0 auto 12px", color: "#ffffff",
        }}>
          <Settings size={28} />
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Settings
        </h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          Manage your app preferences
        </p>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 40px" }}>

        {/* Section */}
        <h3 style={{
          fontSize: 12, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 10, paddingLeft: 4,
        }}>
          Permissions
        </h3>

        <div style={{
          background: "#ffffff", borderRadius: 16, padding: "16px",
          border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>

          {/* Location Row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: "#eff6ff", color: "#3b82f6",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MapPin size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                Location Permission
              </p>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Required to find nearby masjids and provide accurate Qibla direction.
              </p>

              {/* Status Badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: statusBg, borderRadius: 20, padding: "4px 12px",
                marginBottom: 12,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: statusColor, flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>
                  {statusText}
                </span>
              </div>

              {/* Button */}
              {locationStatus !== "unsupported" && (
                locationStatus === "denied" ? (
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
                      Location was denied. Please allow it manually from your browser settings.
                    </p>
                    <button
                      onClick={() => window.open("about:blank")}
                      style={{
                        padding: "9px 16px", borderRadius: 10, border: "none",
                        background: "#f1f5f9", color: "#475569",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Open Browser Settings
                    </button>
                  </div>
                ) : locationStatus === "granted" ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
                    Location is active. Masjid finder and Qibla are working correctly.
                  </p>
                ) : (
                  <button
                    onClick={handleRequestLocation}
                    disabled={requesting}
                    style={{
                      padding: "10px 20px", borderRadius: 10, border: "none",
                      background: requesting ? "#e2e8f0" : "linear-gradient(135deg, #1e3a5f, #2d6a4f)",
                      color: requesting ? "#94a3b8" : "#ffffff",
                      fontSize: 13, fontWeight: 600,
                      cursor: requesting ? "not-allowed" : "pointer",
                    }}
                  >
                    {requesting ? "Requesting..." : "Allow Location"}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div style={{
          marginTop: 12, padding: "12px 14px",
          background: "#f8fafc", borderRadius: 12,
          border: "1px solid #e2e8f0",
          borderLeft: "3px solid #3b82f6",
        }}>
          <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            <strong>Note:</strong> StepToDeen only uses your location to find nearby masjids and calculate Qibla direction. Your location is never stored or shared.
          </p>
        </div>

      </div>
    </div>
  );
}
