import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0D0A17",
  surface: "#171331",
  surfaceLight: "#221C42",
  accent: "#A855F7",
  accentGlow: "rgba(168, 85, 247, 0.35)",
  accentSoft: "rgba(168, 85, 247, 0.12)",
  green: "#2ECC71",
  greenGlow: "rgba(46, 204, 113, 0.25)",
  text: "#F0F0F0",
  textDim: "#9B8FBF",
  border: "#2A2050",
  mapBlue: "#7C3AED",
};

function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 20px", fontSize: 13, fontWeight: 600, color: COLORS.text,
    }}>
      <span>{time}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 3h2v9H9zM13 0h2v12h-2z" fill={COLORS.text}/></svg>
        <svg width="20" height="12" viewBox="0 0 20 12"><rect x="0" y="0" width="18" height="12" rx="2" stroke={COLORS.text} strokeWidth="1.5" fill="none"/><rect x="18.5" y="3.5" width="1.5" height="5" rx="0.5" fill={COLORS.text}/><rect x="2" y="2" width="12" height="8" rx="1" fill={COLORS.green}/></svg>
      </div>
    </div>
  );
}

function MapView({ lat, lng }) {
  return (
    <div style={{
      width: "100%", height: "50%", borderRadius: 16, overflow: "hidden",
      background: `linear-gradient(135deg, #1a2a4a 0%, #0d1b2a 50%, #1a3a5a 100%)`,
      position: "relative", border: `1px solid ${COLORS.border}`,
    }}>
      {/* Stylized map */}
      <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Grid lines */}
        {[...Array(12)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 25} x2="400" y2={i * 25} stroke="rgba(124, 58, 237, 0.1)" strokeWidth="1"/>
        ))}
        {[...Array(16)].map((_, i) => (
          <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="300" stroke="rgba(124, 58, 237, 0.1)" strokeWidth="1"/>
        ))}
        {/* Roads */}
        <path d="M0 150 Q100 130 200 150 T400 140" stroke="rgba(255,255,255,0.15)" strokeWidth="12" fill="none"/>
        <path d="M200 0 Q180 100 200 150 T220 300" stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none"/>
        <path d="M50 0 Q60 80 100 120 T180 300" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none"/>
        <path d="M300 0 Q290 100 320 200 T350 300" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none"/>
        {/* Blocks */}
        <rect x="60" y="50" width="80" height="60" rx="4" fill="rgba(124, 58, 237, 0.08)" stroke="rgba(124, 58, 237, 0.15)" strokeWidth="1"/>
        <rect x="240" y="170" width="100" height="70" rx="4" fill="rgba(124, 58, 237, 0.08)" stroke="rgba(124, 58, 237, 0.15)" strokeWidth="1"/>
        <rect x="60" y="180" width="70" height="80" rx="4" fill="rgba(124, 58, 237, 0.08)" stroke="rgba(124, 58, 237, 0.15)" strokeWidth="1"/>
        {/* Pin */}
        <g transform="translate(200, 130)">
          <circle cx="0" cy="0" r="24" fill={COLORS.accentGlow} />
          <circle cx="0" cy="0" r="12" fill={COLORS.accent} />
          <circle cx="0" cy="0" r="5" fill="white" />
          <circle cx="0" cy="0" r="30" fill="none" stroke={COLORS.accent} strokeWidth="2" opacity="0.4">
            <animate attributeName="r" from="15" to="35" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
          </circle>
        </g>
      </svg>
      <div style={{
        position: "absolute", bottom: 12, left: 12,
        background: "rgba(10, 14, 23, 0.85)", backdropFilter: "blur(8px)",
        padding: "6px 12px", borderRadius: 8, fontSize: 11, color: COLORS.textDim,
      }}>
        {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
      </div>
    </div>
  );
}

function CameraView({ onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => { if (active) { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      stream.getTracks().forEach(t => t.stop());
      onCapture(dataUrl);
    } else {
      onCapture("placeholder");
    }
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", background: "#000",
      position: "relative", overflow: "hidden",
    }}>
      {error ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16, color: COLORS.textDim,
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="1.5">
            <rect x="2" y="6" width="16" height="12" rx="2"/><path d="M18 9l4-2v10l-4-2z"/>
          </svg>
          <span style={{ fontSize: 14 }}>Camera preview unavailable</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>Tap capture to simulate a photo</span>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted style={{
          flex: 1, objectFit: "cover", width: "100%",
        }}/>
      )}
      {/* Capture controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "30px 0 40px", display: "flex", justifyContent: "center",
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
      }}>
        <button onClick={capture} style={{
          width: 72, height: 72, borderRadius: "50%", border: "4px solid white",
          background: "rgba(255,255,255,0.2)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.15s",
        }}
        onMouseDown={e => e.target.style.transform = "scale(0.9)"}
        onMouseUp={e => e.target.style.transform = "scale(1)"}
        >
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "white" }}/>
        </button>
      </div>
    </div>
  );
}

export default function CivicReportApp() {
  const [screen, setScreen] = useState("login"); // login, home, camera, location, describe, reported, track
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState({ lat: 32.2319, lng: 110.9501, text: "1234 E University Blvd, Tucson, AZ 85721" });
  const [descMode, setDescMode] = useState(null); // null, "chat"
  const [issueText, setIssueText] = useState("");
  const [issues, setIssues] = useState([]);
  const [fadeIn, setFadeIn] = useState(true);

  const transition = (next) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(next); setFadeIn(true); }, 200);
  };

  const handleLogin = () => transition("home");

  const handleCapture = (img) => {
    setPhoto(img);
    // Simulate geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            text: `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°W`,
          });
          transition("location");
        },
        () => transition("location")
      );
    } else {
      transition("location");
    }
  };

  const handleConfirmLocation = () => transition("describe");

  const handleDone = () => {
    const newIssue = {
      id: Date.now(),
      text: issueText || "No description provided",
      location: location.text,
      time: new Date().toLocaleString(),
      photo,
    };
    setIssues(prev => [newIssue, ...prev]);
    setIssueText("");
    setDescMode(null);
    transition("reported");
    setTimeout(() => transition("home"), 2500);
  };

  return (
    <div style={{
      width: 380, height: 780, borderRadius: 40, overflow: "hidden",
      background: COLORS.bg, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      position: "relative", margin: "20px auto",
      boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap" rel="stylesheet"/>

      <StatusBar />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        opacity: fadeIn ? 1 : 0, transition: "opacity 0.2s ease",
        overflow: "hidden",
      }}>

        {/* LOGIN SCREEN */}
        {screen === "login" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 32, gap: 40,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20, margin: "0 auto 24px",
                background: `linear-gradient(135deg, ${COLORS.accent}, #C084FC)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 12px 40px ${COLORS.accentGlow}`,
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 36, fontWeight: 700, color: "white" }}>N</span>
              </div>
              <h1 style={{
                color: COLORS.text, fontSize: 28, fontFamily: "'Space Mono', monospace",
                fontWeight: 700, margin: 0, letterSpacing: "-0.5px",
              }}>
                CatsOnVigil
              </h1>
              <p style={{ color: COLORS.textDim, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                Report & track civic issues<br/>on the campus
              </p>
            </div>
            <button onClick={handleLogin} style={{
              width: "100%", padding: "18px 0", borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${COLORS.accent}, #C084FC)`,
              color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 8px 32px ${COLORS.accentGlow}`,
              fontFamily: "inherit", letterSpacing: "0.5px",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseDown={e => { e.target.style.transform = "scale(0.97)"; }}
            onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
            >
              LOGIN
            </button>
          </div>
        )}

        {/* HOME SCREEN */}
        {screen === "home" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 32, gap: 20,
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
                What would you like to do?
              </h2>
              <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 6 }}>
                Report a new issue or track existing ones
              </p>
            </div>

            <button onClick={() => transition("camera")} style={{
              width: "100%", padding: "22px 24px", borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${COLORS.accent}, #C084FC)`,
              color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 8px 32px ${COLORS.accentGlow}`,
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14,
              transition: "transform 0.15s",
            }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Click & Report
            </button>

            <button onClick={() => transition("track")} style={{
              width: "100%", padding: "22px 24px", borderRadius: 16,
              border: `1.5px solid ${COLORS.border}`,
              background: COLORS.surface, color: COLORS.text,
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14,
              transition: "transform 0.15s, border-color 0.2s",
            }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Track
              {issues.length > 0 && (
                <span style={{
                  marginLeft: "auto", background: COLORS.accent, color: "white",
                  width: 24, height: 24, borderRadius: "50%", fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {issues.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* CAMERA SCREEN */}
        {screen === "camera" && <CameraView onCapture={handleCapture} />}

        {/* LOCATION CONFIRM SCREEN */}
        {screen === "location" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16,
          }}>
            <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
              Confirm your location
            </h3>
            <MapView lat={location.lat} lng={location.lng} />
            <div style={{
              background: COLORS.surface, borderRadius: 12, padding: 16,
              border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={COLORS.accent} stroke="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                </svg>
                <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}>
                  {location.text}
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={handleConfirmLocation} style={{
              width: "100%", padding: "18px 0", borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${COLORS.green}, #27AE60)`,
              color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 8px 32px ${COLORS.greenGlow}`,
              fontFamily: "inherit",
              transition: "transform 0.15s",
            }}
            onMouseDown={e => { e.target.style.transform = "scale(0.97)"; }}
            onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
            >
              Confirm Location
            </button>
          </div>
        )}

        {/* DESCRIBE SCREEN */}
        {screen === "describe" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 20,
          }}>
            <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
              Describe the issue
            </h3>
            <p style={{ color: COLORS.textDim, fontSize: 13, margin: 0 }}>
              Choose how you'd like to report
            </p>

            {!descMode && (
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {/* Mic button */}
                <button style={{
                  flex: 1, aspectRatio: "1", borderRadius: 20,
                  border: `1.5px solid ${COLORS.border}`, background: COLORS.surface,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 10, cursor: "pointer",
                  opacity: 0.5, transition: "opacity 0.2s",
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                  </svg>
                  <span style={{ color: COLORS.textDim, fontSize: 13, fontWeight: 600 }}>Voice</span>
                  <span style={{ color: COLORS.textDim, fontSize: 10, opacity: 0.6 }}>Coming soon</span>
                </button>

                {/* Chat button */}
                <button onClick={() => setDescMode("chat")} style={{
                  flex: 1, aspectRatio: "1", borderRadius: 20,
                  border: `1.5px solid ${COLORS.accent}`, background: COLORS.accentSoft,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 10, cursor: "pointer",
                  transition: "transform 0.15s",
                }}
                onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>Chat</span>
                </button>
              </div>
            )}

            {descMode === "chat" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <textarea
                  autoFocus
                  placeholder="Describe the issue you'd like to report..."
                  value={issueText}
                  onChange={e => setIssueText(e.target.value)}
                  style={{
                    flex: 1, borderRadius: 16, padding: 18,
                    border: `1.5px solid ${COLORS.border}`, background: COLORS.surface,
                    color: COLORS.text, fontSize: 15, fontFamily: "inherit",
                    resize: "none", outline: "none", lineHeight: 1.6,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = COLORS.accent}
                  onBlur={e => e.target.style.borderColor = COLORS.border}
                />
                <button onClick={handleDone} style={{
                  width: "100%", padding: "18px 0", borderRadius: 16, border: "none",
                  background: `linear-gradient(135deg, ${COLORS.accent}, #C084FC)`,
                  color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
                  boxShadow: `0 8px 32px ${COLORS.accentGlow}`,
                  fontFamily: "inherit",
                  opacity: issueText.trim() ? 1 : 0.5,
                  transition: "transform 0.15s, opacity 0.2s",
                }}
                onMouseDown={e => { e.target.style.transform = "scale(0.97)"; }}
                onMouseUp={e => { e.target.style.transform = "scale(1)"; }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* REPORTED SCREEN */}
        {screen === "reported" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 40, gap: 24,
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: COLORS.greenGlow, display: "flex",
              alignItems: "center", justifyContent: "center",
              animation: "pulseCheck 0.6s ease-out",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, margin: 0, textAlign: "center" }}>
              Issue Reported!
            </h2>
            <p style={{ color: COLORS.textDim, fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
              Your report has been submitted successfully.
            </p>
            <div style={{
              width: 40, height: 4, borderRadius: 2, background: COLORS.surfaceLight,
              overflow: "hidden", marginTop: 8,
            }}>
              <div style={{
                width: "100%", height: "100%", background: COLORS.green,
                borderRadius: 2, animation: "shrink 2.5s linear forwards",
              }}/>
            </div>
            <style>{`
              @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
              @keyframes pulseCheck { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
          </div>
        )}

        {/* TRACK SCREEN */}
        {screen === "track" && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16,
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => transition("home")} style={{
                width: 40, height: 40, borderRadius: 12, border: `1px solid ${COLORS.border}`,
                background: COLORS.surface, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
                Your Reports
              </h3>
            </div>

            {issues.length === 0 ? (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.5,
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ color: COLORS.textDim, fontSize: 14 }}>No reports yet</span>
              </div>
            ) : (
              issues.map((issue, idx) => (
                <div key={issue.id} style={{
                  background: COLORS.surface, borderRadius: 16, padding: 18,
                  border: `1px solid ${COLORS.border}`,
                  animation: `slideUp 0.3s ease-out ${idx * 0.08}s both`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                    <span style={{
                      background: "rgba(255, 170, 50, 0.15)", color: "#FFAA32",
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    }}>
                      PENDING
                    </span>
                    <span style={{ color: COLORS.textDim, fontSize: 11 }}>{issue.time}</span>
                  </div>
                  <p style={{ color: COLORS.text, fontSize: 14, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {issue.text}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={COLORS.accent} stroke="none">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    </svg>
                    <span style={{ color: COLORS.textDim, fontSize: 12 }}>{issue.location}</span>
                  </div>
                  <style>{`
                    @keyframes slideUp {
                      from { opacity: 0; transform: translateY(16px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
