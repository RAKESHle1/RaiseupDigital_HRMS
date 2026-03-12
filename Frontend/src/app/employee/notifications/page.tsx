"use client";
import { useEffect, useState } from "react";
import { notificationsAPI } from "@/lib/api";
import { FiBell, FiAlertCircle, FiMessageSquare, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getMyNotifications();
      setNotifications(res.data);
    } catch (err) {
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approved":
        return <FiAlertCircle color="#22c55e" size={20} />;
      case "rejected":
        return <FiAlertCircle color="#ef4444" size={20} />;
      case "chat":
        return <FiMessageSquare color="#6366f1" size={20} />;
      default:
        return <FiInfo color="#8b5cf6" size={20} />;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <FiBell color="#8b5cf6" /> Notifications
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Stay updated with your daily notifications</p>
        </div>
        <button onClick={fetchNotifications} className="gradient-btn" style={{ padding: "8px 16px" }}>
          Refresh
        </button>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FiBell size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 500 }}>No recent notifications</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {notifications.map((notif, idx) => (
              <div
                key={notif.id || idx}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "20px 24px",
                  borderBottom: idx === notifications.length - 1 ? "none" : "1px solid var(--border-color)",
                  background: notif.read ? "transparent" : "rgba(99, 102, 241, 0.05)",
                  transition: "background 0.2s ease"
                }}
              >
                <div style={{ 
                  background: "var(--bg-secondary)", padding: 12, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                    {notif.title}
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
                    {notif.message}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
