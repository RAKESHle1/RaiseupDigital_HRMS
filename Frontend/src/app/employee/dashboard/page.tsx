"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { attendanceAPI, leavesAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { FiClock, FiCheckSquare, FiLogOut, FiSend } from "react-icons/fi";

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [leaveStats, setLeaveStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attendRes, leaveRes] = await Promise.all([
        attendanceAPI.getToday(),
        leavesAPI.getMyStats(),
      ]);
      setTodayAttendance(attendRes.data);
      setLeaveStats(leaveRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "---";
    try {
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      return `${displayH}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getStatusColor = (hours: number | undefined) => {
    if (!hours && hours !== 0) return "var(--text-muted)";
    return hours >= 9 ? "#22c55e" : "#ef4444";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px" }}>
      {/* 1. Welcome Message */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          Welcome, <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>Here's a quick overview of your activities today.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30, marginBottom: 40 }}>
        {/* 2. Today's Attendance */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", zIndex: 0 }} />
          
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiClock color="#a78bfa" size={18} />
            </div>
            Today's Attendance
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Clock In</span>
              <span style={{ fontWeight: 700, color: todayAttendance?.clockIn ? "#22c55e" : "var(--text-muted)", background: todayAttendance?.clockIn ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 8 }}>
                {formatTime(todayAttendance?.clockIn)}
              </span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Clock Out</span>
              <span style={{ fontWeight: 700, color: todayAttendance?.clockOut ? "#f59e0b" : "var(--text-muted)", background: todayAttendance?.clockOut ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 8 }}>
                 {formatTime(todayAttendance?.clockOut)}
              </span>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>Working Hours</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ 
                  fontWeight: 800, fontSize: 28, 
                  color: getStatusColor(todayAttendance?.workingHours)
                }}>
                  {todayAttendance?.workingHours ? `${Math.floor(todayAttendance.workingHours)}h ${Math.round((todayAttendance.workingHours % 1) * 60)}m` : "0h 00m"}
                </span>
                {todayAttendance?.clockIn && (
                  <div style={{ 
                    width: 12, height: 12, borderRadius: "50%", 
                    background: getStatusColor(todayAttendance?.workingHours),
                    boxShadow: `0 0 10px ${getStatusColor(todayAttendance?.workingHours)}`
                  }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Leave Summary */}
        <div className="glass-card" style={{ padding: 28, borderRadius: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiCheckSquare color="#fbbf24" size={18} />
            </div>
            Leave Summary
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>Approved</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{leaveStats.approved}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.1)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>Pending</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{leaveStats.pending}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Rejected</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{leaveStats.rejected}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
           <button 
             onClick={() => router.push("/employee/attendance")}
             className="gradient-btn" 
             style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, borderRadius: 16, height: "auto" }}
           >
             <FiClock size={24} />
             <span>Mark Attendance</span>
           </button>
           <button 
             onClick={() => router.push("/employee/leaves")}
             style={{ 
               padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, fontSize: 16,
               background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, cursor: "pointer", fontWeight: 600,
               transition: "all 0.3s ease"
             }}
             onMouseOver={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.15)"}
             onMouseOut={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
           >
             <FiCheckSquare size={24} />
             <span>Apply Leave</span>
           </button>
           <button 
             onClick={() => router.push("/employee/chat")}
             style={{ 
              padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, fontSize: 16,
              background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, cursor: "pointer", fontWeight: 600,
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
           >
             <FiSend size={24} />
             <span>Open Chat</span>
           </button>
        </div>
      </div>
    </div>
  );
}
