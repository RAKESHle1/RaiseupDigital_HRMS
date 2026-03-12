"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const { access_token, user } = res.data;
      
      if (user.role !== "admin") {
        toast.error("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }
      
      login(access_token, user);
      toast.success(`Welcome back, Admin ${user.name}!`);
      router.push("/admin/dashboard");
      
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      padding: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background Orbs */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        top: -100, right: -100, pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
        bottom: -50, left: -50, pointerEvents: "none"
      }} />

      <div style={{
        width: "100%", maxWidth: 440,
        background: "rgba(22, 33, 62, 0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(99, 102, 241, 0.15)",
        borderRadius: 24,
        padding: "48px 40px",
        boxShadow: "0 0 60px rgba(99, 102, 241, 0.08)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 30px rgba(99, 102, 241, 0.4)",
          }}>
            <FiShield size={28} color="white" />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}>
            Admin Portal
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Sign in to access management dashboard
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
              Admin Email
            </label>
            <div style={{ position: "relative" }}>
              <FiMail style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: 16,
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hrms.com"
                className="input-field"
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <FiLock style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", fontSize: 16,
              }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: 42, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", padding: 0, display: "flex",
                }}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="gradient-btn"
            disabled={loading}
            style={{
              width: "100%", padding: "14px 24px",
              fontSize: 15, letterSpacing: "0.02em",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{
                  width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white", borderRadius: "50%",
                  animation: "spin 0.6s linear infinite", display: "inline-block",
                }} />
                Signing in...
              </span>
            ) : (
              "Admin Log In"
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
            <button 
              onClick={() => router.push('/home')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
            >
              Back to Home
            </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
