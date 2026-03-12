"use client";
import { useEffect, useState } from "react";
import { attendanceAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiClock, FiCalendar, FiDownload } from "react-icons/fi";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"daily" | "report">("daily");

  useEffect(() => {
    fetchData();
  }, [month, year, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (view === "daily") {
        const res = await attendanceAPI.getAll({ month, year });
        setRecords(res.data);
      } else {
        const res = await attendanceAPI.getReport(month, year);
        setRecords(res.data.records);
        setSummary(res.data.summary);
      }
    } catch (err) {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">Attendance Reports</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Monitor employee attendance across the organization
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid var(--border-color)", overflow: "hidden" }}>
          <button
            onClick={() => setView("daily")}
            style={{
              padding: "8px 20px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
              background: view === "daily" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: view === "daily" ? "white" : "var(--text-secondary)",
            }}
          >
            Daily View
          </button>
          <button
            onClick={() => setView("report")}
            style={{
              padding: "8px 20px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
              background: view === "report" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: view === "report" ? "white" : "var(--text-secondary)",
            }}
          >
            Monthly Report
          </button>
        </div>

        <select className="input-field" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>

        <select className="input-field" style={{ width: "auto" }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : view === "report" ? (
        <>
          {/* Monthly summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            {summary.map((emp: any, i: number) => (
              <div key={i} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{emp.employeeName || emp.employeeId}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.presentDays} / {emp.totalDays} days present</p>
                  </div>
                  <span className={`badge ${emp.avgHours >= 9 ? "badge-success" : "badge-warning"}`}>
                    {emp.avgHours}h avg
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(99,102,241,0.1)", overflow: "hidden" }}>
                  <div style={{
                    width: emp.totalDays > 0 ? `${(emp.presentDays / emp.totalDays) * 100}%` : "0%",
                    height: "100%",
                    background: emp.avgHours >= 9 ? "#22c55e" : "#f59e0b",
                    borderRadius: 3,
                  }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Total: {emp.totalHours.toFixed(1)} hours
                </p>
              </div>
            ))}
          </div>
          {summary.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No report data for this period</p>
          )}
        </>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{rec.employeeName || "—"}</td>
                  <td>{rec.date}</td>
                  <td>{rec.clockIn || "—"}</td>
                  <td>{rec.clockOut || "—"}</td>
                  <td>{rec.workingHours ? `${rec.workingHours}h` : "—"}</td>
                  <td>
                    <span className={`badge ${rec.workingHours >= 9 ? "badge-success" : rec.clockOut ? "badge-danger" : "badge-warning"}`}>
                      {rec.workingHours >= 9 ? "🟢 Full Day" : rec.clockOut ? "🔴 Short Day" : "⏳ Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No attendance records for this period</p>
          )}
        </div>
      )}
    </div>
  );
}
