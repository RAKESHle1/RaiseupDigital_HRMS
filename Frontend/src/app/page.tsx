"use client";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiShield, FiUsers, FiClock, FiCalendar, FiMessageCircle, FiBell, FiCheckCircle, FiCamera } from "react-icons/fi";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a16 0%, #121226 50%, #0d0d1f 100%)",
      color: "white",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden"
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: "-10%", left: "-5%",
          animation: mounted ? "orbFloat1 12s ease-in-out infinite" : "none"
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "-5%", right: "-5%",
          animation: mounted ? "orbFloat2 15s ease-in-out infinite" : "none"
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
          top: "40%", right: "20%",
          animation: mounted ? "orbFloat3 10s ease-in-out infinite" : "none"
        }} />
      </div>

      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.05); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.08); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -25px) scale(0.95); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hero-card:hover {
          transform: translateY(-8px) !important;
          border-color: rgba(99, 102, 241, 0.4) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important;
        }
        .feature-item:hover {
          background: rgba(99,102,241,0.08) !important;
          border-color: rgba(99,102,241,0.25) !important;
        }
        .nav-btn:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .gradient-btn-hover:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5) !important;
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "20px 48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        background: "rgba(10,10,22,0.6)",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 20,
            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)"
          }}>
            R
          </div>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", display: "block" }}>
              Raiseup Digital
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
              HRMS Portal
            </span>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button 
            className="nav-btn"
            onClick={() => router.push("/employee/login")}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "white", cursor: "pointer",
              fontWeight: 500, fontSize: 14, transition: "all 0.3s",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Employee Login
          </button>
          <button 
            className="gradient-btn-hover"
            onClick={() => router.push("/admin/login")}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", 
              color: "white", cursor: "pointer",
              fontWeight: 600, fontSize: 14, boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
              transition: "all 0.3s", fontFamily: "'Inter', sans-serif"
            }}
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
        <section style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 20px 60px", textAlign: "center"
        }}>
          <div style={{
            animation: mounted ? "fadeInUp 0.8s ease" : "none",
            maxWidth: 850
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 20px", borderRadius: 50,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
              color: "#818cf8", fontSize: 13, fontWeight: 600, letterSpacing: "1px",
              textTransform: "uppercase", marginBottom: 32
            }}>
              <FiCheckCircle size={14} />
              Human Resource Management System
            </div>
            
            <h1 style={{
              fontSize: "clamp(36px, 5vw, 68px)", fontWeight: 800, lineHeight: 1.08,
              marginBottom: 24, letterSpacing: "-2px"
            }}>
              Welcome to the <br />
              <span style={{
                background: "linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #818cf8 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: mounted ? "shimmer 4s linear infinite" : "none"
              }}>Raiseup Digital</span> Portal
            </h1>
            
            <p style={{
              fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.7,
              marginBottom: 48, maxWidth: 620, margin: "0 auto 56px"
            }}>
              Streamline your workflow, track attendance, manage leave requests, 
              and collaborate seamlessly with your team — all in one place.
            </p>
          </div>

          {/* Login Cards */}
          <div style={{
            display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap",
            animation: mounted ? "fadeInUp 0.8s ease 0.2s both" : "none"
          }}>
            {/* Employee Card */}
            <div 
              className="hero-card"
              onClick={() => router.push("/employee/login")}
              style={{
                background: "rgba(22, 33, 62, 0.5)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 24,
                padding: "36px 32px", width: 320, cursor: "pointer", textAlign: "left",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 24,
                background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(34,197,94,0.15)"
              }}>
                <FiUsers size={26} color="#34d399" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Employee Portal</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Mark attendance, apply for leaves, chat with colleagues, and manage your profile.
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, color: "#34d399",
                fontSize: 14, fontWeight: 600, transition: "gap 0.3s"
              }}>
                Log in as Employee <FiArrowRight />
              </div>
            </div>

            {/* Admin Card */}
            <div 
              className="hero-card"
              onClick={() => router.push("/admin/login")}
              style={{
                background: "rgba(22, 33, 62, 0.5)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 24,
                padding: "36px 32px", width: 320, cursor: "pointer", textAlign: "left",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 24,
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(99,102,241,0.15)"
              }}>
                <FiShield size={26} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Admin Portal</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Manage employees, approve requests, track attendance, and view detailed analytics.
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, color: "#818cf8",
                fontSize: 14, fontWeight: 600, transition: "gap 0.3s"
              }}>
                Log in as Admin <FiArrowRight />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: "60px 20px 80px", maxWidth: 1000, margin: "0 auto",
          animation: mounted ? "fadeInUp 0.8s ease 0.4s both" : "none"
        }}>
          <h2 style={{
            textAlign: "center", fontSize: 28, fontWeight: 700,
            marginBottom: 12, letterSpacing: "-0.5px"
          }}>
            Everything You Need
          </h2>
          <p style={{
            textAlign: "center", color: "var(--text-muted)", fontSize: 15,
            marginBottom: 48, maxWidth: 500, margin: "0 auto 48px"
          }}>
            A complete suite of tools to manage your workforce efficiently.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16
          }}>
            {[
              { icon: <FiCamera size={22} />, title: "Face Recognition (FRS)", desc: "AI-powered face scan for attendance tracking", color: "#22c55e" },
              { icon: <FiCalendar size={22} />, title: "Leave Management", desc: "Apply and track leave requests seamlessly", color: "#f59e0b" },
              { icon: <FiMessageCircle size={22} />, title: "Team Chat", desc: "Real-time messaging with your colleagues", color: "#6366f1" },
              { icon: <FiBell size={22} />, title: "Notifications", desc: "Stay updated with instant alerts & updates", color: "#ec4899" },
            ].map((feat, i) => (
              <div key={i} className="feature-item" style={{
                padding: "24px 20px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(22,33,62,0.3)",
                transition: "all 0.3s ease"
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: `rgba(${feat.color === "#22c55e" ? "34,197,94" : feat.color === "#f59e0b" ? "245,158,11" : feat.color === "#6366f1" ? "99,102,241" : "236,72,153"},0.12)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: feat.color
                }}>
                  {feat.icon}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{feat.title}</h4>
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer style={{
        padding: "24px", textAlign: "center", color: "var(--text-muted)",
        fontSize: 13, borderTop: "1px solid rgba(255,255,255,0.05)",
        position: "relative", zIndex: 1
      }}>
        © {new Date().getFullYear()} Raiseup Digital. All rights reserved.
      </footer>
    </div>
  );
}
