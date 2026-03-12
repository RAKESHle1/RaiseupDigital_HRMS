"use client";
import { useEffect, useState } from "react";
import { chatAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiMessageSquare, FiUsers, FiActivity } from "react-icons/fi";

export default function AdminChatPage() {
  const [stats, setStats] = useState({ totalMessages: 0, totalGroups: 0, activeUsers: 0 });
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes] = await Promise.all([
        chatAPI.getAdminStats(),
        chatAPI.getAllGroups(),
      ]);
      setStats(statsRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      toast.error("Failed to load chat data");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Messages", value: stats.totalMessages, icon: FiMessageSquare, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    { label: "Chat Groups", value: stats.totalGroups, icon: FiUsers, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    { label: "Active Users (24h)", value: stats.activeUsers, icon: FiActivity, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
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
          <span className="gradient-text">Chat Monitoring</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Overview of team communications and groups
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
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

      {/* Groups */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          <FiUsers style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
          Chat Groups
        </h2>
        {groups.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>No groups created yet</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {groups.map((group) => (
              <div key={group._id} style={{
                padding: "16px 20px",
                background: "rgba(99, 102, 241, 0.04)",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{group.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{group.description || "No description"}</p>
                  </div>
                  <span className="badge badge-info">{group.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
