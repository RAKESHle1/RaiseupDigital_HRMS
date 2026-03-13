"use client";
import { useEffect, useState } from "react";
import { attendanceAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiClock, FiLogIn, FiLogOut } from "react-icons/fi";

type AttendanceRow = {
  status?: string;
  workingHours?: number;
  clockIn?: string | null;
  clockOut?: string | null;
};

export default function EmployeeAttendancePage() {
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [month, setMonth] = useState<number | string>(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState("");

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const getAttendanceBadge = (rec: AttendanceRow) => {
    const status = String(rec.status || "").toLowerCase();

    if (status === "holiday") {
      return {
        text: "Holiday",
        style: {
          background: "rgba(6,182,212,0.12)",
          border: "1px solid rgba(6,182,212,0.3)",
          color: "#67e8f9",
        },
      };
    }

    if (status === "leave") {
      return {
        text: "Leave",
        style: {
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.3)",
          color: "#fbbf24",
        },
      };
    }

    if ((rec.workingHours || 0) >= 9) {
      return {
        text: "Full",
        style: {
          background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.3)",
          color: "#4ade80",
        },
      };
    }

    if (rec.clockIn && !rec.clockOut) {
      return {
        text: "Active",
        style: {
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.3)",
          color: "#f59e0b",
        },
      };
    }

    if (rec.clockOut) {
      return {
        text: "Short",
        style: {
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171",
        },
      };
    }

    return {
      text: "No Record",
      style: {
        background: "rgba(148,163,184,0.12)",
        border: "1px solid rgba(148,163,184,0.3)",
        color: "#94a3b8",
      },
    };
  };

  useEffect(() => {
    fetchData();
  }, [month, year, selectedDate]);

  const fetchData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getMyAttendance(
          month === "" ? undefined : Number(month), 
          year, 
          selectedDate || undefined
        ),
      ]);
      setTodayRecord(todayRes.data);
      setRecords(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.clockIn();
      toast.success(`Clocked in at ${res.data.time}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to clock in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.clockOut();
      toast.success(`Clocked out at ${res.data.time} — ${res.data.workingHours}h`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to clock out");
    } finally {
      setActionLoading(false);
    }
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
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
          <span className="gradient-text">Attendance</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Track your daily attendance and working hours
        </p>
      </div>

      {/* Clock In/Out Card */}
      <div className="glass-card" style={{ padding: 32, marginBottom: 28, textAlign: "center" }}>
        <FiClock size={48} color="#6366f1" style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>

        {/* Status Display */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Clock In</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: todayRecord?.clockIn ? "#22c55e" : "var(--text-muted)" }}>
              {todayRecord?.clockIn || "--:--"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Clock Out</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: todayRecord?.clockOut ? "#ef4444" : "var(--text-muted)" }}>
              {todayRecord?.clockOut || "--:--"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Hours</p>
            <p style={{
              fontSize: 24, fontWeight: 800,
              color: todayRecord?.workingHours ? (todayRecord.workingHours >= 9 ? "#22c55e" : "#ef4444") : "var(--text-muted)"
            }}>
              {todayRecord?.workingHours ? `${todayRecord.workingHours}h` : "0.0h"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {!todayRecord?.clockIn ? (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              style={{
                padding: "16px 48px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 8px 30px rgba(34,197,94,0.3)",
                transition: "all 0.3s ease",
              }}
            >
              <FiLogIn size={20} /> CLOCK IN
            </button>
          ) : !todayRecord?.clockOut ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              style={{
                padding: "16px 48px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 8px 30px rgba(239,68,68,0.3)",
                transition: "all 0.3s ease",
              }}
            >
              <FiLogOut size={20} /> CLOCK OUT
            </button>
          ) : (
            <div style={{
              padding: "16px 48px", borderRadius: 14,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              color: "#22c55e", fontSize: 16, fontWeight: 700,
            }}>
              ✅ Day Complete — {todayRecord.workingHours}h
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Attendance History</h2>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>View by:</span>
            </div>
            
            {/* Specific Date Filter */}
            <input 
              type="date" 
              className="input-field" 
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDate(val);
                if(val) {
                  const [y, m, d] = val.split("-");
                  setYear(Number(y));
                  setMonth(Number(m));
                }
              }}
            />

            <div style={{ width: 1, height: 20, background: "var(--border-color)" }} />

            <select className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              <option value="">All Months</option>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            <select className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Working Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{rec.date}</td>
                  <td>{rec.clockIn || "—"}</td>
                  <td>{rec.clockOut || "—"}</td>
                  <td style={{
                    fontWeight: 600,
                    color: rec.workingHours >= 9 ? "#22c55e" : rec.workingHours > 0 ? "#ef4444" : "var(--text-muted)",
                  }}>
                    {rec.workingHours ? `${rec.workingHours}h` : "—"}
                  </td>
                  <td>
                    {(() => {
                      const badge = getAttendanceBadge(rec);
                      return (
                        <span className="badge" style={badge.style}>
                          {badge.text}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No records for this period</p>
          )}
        </div>
      </div>
    </div>
  );
}

