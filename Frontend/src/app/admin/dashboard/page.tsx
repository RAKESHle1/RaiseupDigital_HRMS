"use client";
import { useEffect, useState } from "react";
import { usersAPI, leavesAPI, attendanceAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { FiUsers, FiUserCheck, FiCalendar, FiClock, FiTrendingUp, FiAlertCircle } from "react-icons/fi";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeToday: 0,
    pendingLeaves: 0,
    totalLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, leavesRes, leaveStatsRes, attendanceRes] = await Promise.all([
        usersAPI.getAll(),
        leavesAPI.getAllLeaves({ status: "pending" }),
        leavesAPI.getStats(),
        attendanceAPI.getAll({ date_filter: new Date().toISOString().split("T")[0] }),
      ]);

      setStats({
        totalEmployees: usersRes.data.length,
        activeToday: attendanceRes.data.length,
        pendingLeaves: leaveStatsRes.data.pending || 0,
        totalLeaves: leaveStatsRes.data.total || 0,
        approvedLeaves: leaveStatsRes.data.approved || 0,
        rejectedLeaves: leaveStatsRes.data.rejected || 0,
      });

      setRecentAttendance(attendanceRes.data.slice(0, 8));
      setRecentLeaves(leavesRes.data.slice(0, 5));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: FiUsers, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    { label: "Active Today", value: stats.activeToday, icon: FiUserCheck, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: FiAlertCircle, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    { label: "Total Leaves", value: stats.totalLeaves, icon: FiCalendar, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  ];

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
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          Welcome back, <span className="gradient-text">{user?.name}</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Here&apos;s what&apos;s happening in your organization today
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 20,
        marginBottom: 32,
      }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: card.bg, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={24} color={card.color} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: 24,
      }}>
        {/* Today's Attendance */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              <FiClock style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
              Today&apos;s Attendance
            </h2>
            <span className="badge badge-info">{recentAttendance.length} records</span>
          </div>
          {recentAttendance.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 32, fontSize: 14 }}>
              No attendance records for today
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((record, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{record.employeeName || "—"}</td>
                      <td>{record.clockIn || "—"}</td>
                      <td>{record.clockOut || "—"}</td>
                      <td>{record.workingHours ? `${record.workingHours}h` : "—"}</td>
                      <td>
                        <span className={`badge ${record.workingHours >= 9 ? "badge-success" : record.clockOut ? "badge-danger" : "badge-warning"}`}>
                          {record.workingHours >= 9 ? "🟢 Full" : record.clockOut ? "🔴 Short" : "⏳ Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              <FiCalendar style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
              Pending Leave Requests
            </h2>
            <span className="badge badge-warning">{stats.pendingLeaves} pending</span>
          </div>
          {recentLeaves.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 32, fontSize: 14 }}>
              No pending leave requests
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentLeaves.map((leave, i) => (
                <div key={i} style={{
                  padding: "14px 16px",
                  background: "rgba(99, 102, 241, 0.04)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{leave.employeeName}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{leave.leaveType}</p>
                    </div>
                    <span className="badge badge-warning">Pending</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {leave.startDate} → {leave.endDate}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    &quot;{leave.reason}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leave Stats Bar */}
      <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          <FiTrendingUp style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
          Leave Analytics
        </h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#6366f1" }}>{stats.totalLeaves}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Applied</p>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#22c55e" }}>{stats.approvedLeaves}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Approved</p>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#ef4444" }}>{stats.rejectedLeaves}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Rejected</p>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>{stats.pendingLeaves}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pending</p>
          </div>
        </div>
        {/* Progress bars */}
        {stats.totalLeaves > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(99,102,241,0.1)", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(stats.approvedLeaves / stats.totalLeaves) * 100}%`, background: "#22c55e", borderRadius: 4 }} />
              <div style={{ width: `${(stats.rejectedLeaves / stats.totalLeaves) * 100}%`, background: "#ef4444" }} />
              <div style={{ width: `${(stats.pendingLeaves / stats.totalLeaves) * 100}%`, background: "#f59e0b" }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> Approved
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> Rejected
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} /> Pending
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
