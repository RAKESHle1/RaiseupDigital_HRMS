"use client";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiShield, FiUsers } from "react-icons/fi";

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a16 0%, #121226 50%, #0d0d1f 100%)",
      color: "white",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <header style={{
        padding: "24px 48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 20
          }}>
            R
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>
            Raiseup Digital
          </span>
        </div>
        
        <div style={{ display: "flex", gap: 16 }}>
          <button 
            onClick={() => router.push("/employee/login")}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "white", cursor: "pointer",
              fontWeight: 500, fontSize: 14, transition: "all 0.2s"
            }}
          >
            Employee Login
          </button>
          <button 
            onClick={() => router.push("/admin/login")}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", 
              color: "white", cursor: "pointer",
              fontWeight: 600, fontSize: 14, boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
              transition: "transform 0.2s"
            }}
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", position: "relative" }}>
        {/* Background Orbs */}
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          top: "10%", left: "10%", pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "10%", right: "10%", pointerEvents: "none"
        }} />

        <div style={{ maxWidth: 800, textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 20,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            color: "#818cf8", fontSize: 13, fontWeight: 600, letterSpacing: "1px",
            textTransform: "uppercase", marginBottom: 24
          }}>
            Human Resource Management
          </div>
          
          <h1 style={{
            fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, lineHeight: 1.1,
            marginBottom: 24, letterSpacing: "-1px"
          }}>
            Welcome to the <br />
            <span style={{
              background: "linear-gradient(135deg, #818cf8, #c084fc)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>Raiseup Digital</span> Portal
          </h1>
          
          <p style={{
            fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6,
            marginBottom: 48, maxWidth: 600, margin: "0 auto 48px"
          }}>
            Streamline your workflow, track attendance, manage leave requests, and collaborate seamlessly with your team.
          </p>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {/* Employee Card */}
            <div 
              onClick={() => router.push("/employee/login")}
              style={{
                background: "rgba(22, 33, 62, 0.4)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 20,
                padding: 32, width: 300, cursor: "pointer", textAlign: "left",
                transition: "all 0.3s ease",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 20,
                background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <FiUsers size={24} color="#34d399" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Employee Portal</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                Mark attendance, apply for leaves, and connect with your colleagues.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34d399", fontSize: 14, fontWeight: 600 }}>
                Log in as Employee <FiArrowRight />
              </div>
            </div>

            {/* Admin Card */}
            <div 
              onClick={() => router.push("/admin/login")}
              style={{
                background: "rgba(22, 33, 62, 0.4)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 20,
                padding: 32, width: 300, cursor: "pointer", textAlign: "left",
                transition: "all 0.3s ease",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 20,
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <FiShield size={24} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Admin Portal</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                Manage team members, approve requests, and view detailed analytics.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#818cf8", fontSize: 14, fontWeight: 600 }}>
                Log in as Admin <FiArrowRight />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{
        padding: "24px", textAlign: "center", color: "var(--text-muted)",
        fontSize: 13, borderTop: "1px solid rgba(255,255,255,0.05)"
      }}>
        © {new Date().getFullYear()} Raiseup Digital. All rights reserved.
      </footer>
    </div>
  );
}
