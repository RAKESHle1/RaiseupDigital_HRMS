"use client";
import { useEffect, useState } from "react";
import { leavesAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiFilter } from "react-icons/fi";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await leavesAPI.getAllLeaves(params);
      setLeaves(res.data);
    } catch (err) {
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await leavesAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id: string, status: string) => {
    try {
      await leavesAPI.updateStatus(id, status);
      toast.success(`Leave ${status} successfully`);
      fetchLeaves();
      fetchStats();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const statCards = [
    { label: "Total", value: stats.total, color: "#6366f1" },
    { label: "Approved", value: stats.approved, color: "#22c55e" },
    { label: "Rejected", value: stats.rejected, color: "#ef4444" },
    { label: "Pending", value: stats.pending, color: "#f59e0b" },
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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
          <span className="gradient-text">Leave Requests</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Review and manage employee leave applications
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-color)",
              background: statusFilter === f ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: statusFilter === f ? "white" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
          >
            {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave._id}>
                <td style={{ fontWeight: 500 }}>{leave.employeeName}</td>
                <td><span className="badge badge-info">{leave.leaveType}</span></td>
                <td>{leave.startDate}</td>
                <td>{leave.endDate}</td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {leave.reason}
                </td>
                <td>
                  <span className={`badge ${
                    leave.status === "approved" ? "badge-success" :
                    leave.status === "rejected" ? "badge-danger" : "badge-warning"
                  }`}>
                    {leave.status === "approved" ? "✅ Approved" :
                     leave.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                  </span>
                </td>
                <td>
                  {leave.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleAction(leave._id, "approved")}
                        style={{
                          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                          borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                          color: "#22c55e", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <FiCheck size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(leave._id, "rejected")}
                        style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                          color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaves.length === 0 && (
          <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No leave requests found</p>
        )}
      </div>
    </div>
  );
}
