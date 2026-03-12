"use client";
import { useEffect, useState } from "react";
import { leavesAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiPlus, FiX, FiCalendar, FiTrash2 } from "react-icons/fi";

const leaveTypes = ["Sick Leave", "Casual Leave", "Earned Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"];

export default function EmployeeLeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [formData, setFormData] = useState({
    leaveType: "Sick Leave", startDate: "", endDate: "", reason: "",
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const [leavesRes, statsRes] = await Promise.all([
        leavesAPI.getMyLeaves(params),
        leavesAPI.getMyStats(),
      ]);
      setLeaves(leavesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await leavesAPI.apply(formData);
      toast.success("Leave applied successfully!");
      setShowModal(false);
      setFormData({ leaveType: "Sick Leave", startDate: "", endDate: "", reason: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to apply leave");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this leave request?")) return;
    try {
      await leavesAPI.delete(id);
      toast.success("Leave deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">Leave Management</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Apply for leaves and track your leave history
          </p>
        </div>
        <button className="gradient-btn" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FiPlus size={18} /> Apply Leave
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-color)",
              background: filter === f ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: filter === f ? "white" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
          >
            {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Leave List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {leaves.map((leave) => (
          <div key={leave._id} className="glass-card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="badge badge-info">{leave.leaveType}</span>
                  <span className={`badge ${
                    leave.status === "approved" ? "badge-success" :
                    leave.status === "rejected" ? "badge-danger" : "badge-warning"
                  }`}>
                    {leave.status === "approved" ? "✅ Approved" :
                     leave.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <FiCalendar style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  {leave.startDate} → {leave.endDate}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Reason: {leave.reason}
                </p>
              </div>
              {leave.status === "pending" && (
                <button onClick={() => handleDelete(leave._id)} style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#ef4444",
                }}>
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {leaves.length === 0 && (
          <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No leave records found</p>
        )}
      </div>

      {/* Apply Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Apply for Leave</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleApply}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Leave Type</label>
                <select className="input-field" value={formData.leaveType} onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}>
                  {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>From Date</label>
                  <input className="input-field" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>To Date</label>
                  <input className="input-field" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Reason</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for leave..."
                  required
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button type="submit" className="gradient-btn">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
