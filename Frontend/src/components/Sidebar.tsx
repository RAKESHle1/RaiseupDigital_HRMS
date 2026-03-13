"use client";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  FiHome, FiUsers, FiClock, FiCalendar, FiMessageSquare,
  FiLogOut, FiUser, FiMenu, FiX, FiShield
} from "react-icons/fi";
import { useState, useEffect } from "react";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/admin/employees", label: "Employees", icon: FiUsers },
  { href: "/admin/attendance", label: "Attendance", icon: FiClock },
  { href: "/admin/leaves", label: "Leave Requests", icon: FiCalendar },
  { href: "/admin/chat", label: "Chat Monitor", icon: FiMessageSquare },
];

const employeeLinks = [
  { href: "/employee/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/employee/profile", label: "Profile", icon: FiUser },
  { href: "/employee/attendance", label: "Attendance", icon: FiClock },
  { href: "/employee/leaves", label: "Leaves", icon: FiCalendar },
  { href: "/employee/chat", label: "Chat", icon: FiMessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hydrate } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  const links = user?.role === "admin" ? adminLinks : employeeLinks;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 200,
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: 10, padding: 10, color: "var(--text-primary)",
          cursor: "pointer", display: "none",
        }}
        className="mobile-menu-btn"
      >
        {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
          className="mobile-overlay"
        />
      )}

      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: collapsed ? 72 : 260,
          background: "rgba(15, 15, 26, 0.95)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid var(--border-color)",
          display: "flex", flexDirection: "column",
          transition: "all 0.3s ease",
          zIndex: 100,
          transform: mobileOpen ? "translateX(0)" : undefined,
        }}
        className="sidebar"
      >
        {/* Logo Area */}
        <div style={{
          padding: collapsed ? "24px 12px" : "24px 20px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex", alignItems: "center",
          gap: 12, justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <FiShield size={20} color="white" />
          </div>
          {!collapsed && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                HRMS
              </h2>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                Portal
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <div style={{ marginBottom: 8 }}>
            {!collapsed && (
              <p style={{
                fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                padding: "0 8px", marginBottom: 8,
              }}>
                Menu
              </p>
            )}
          </div>
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(link.href);
                  setMobileOpen(false);
                }}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  marginBottom: 4,
                }}
                title={collapsed ? link.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{link.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Collapse Toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: "12px", margin: "0 12px", marginBottom: 8,
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid var(--border-color)",
            borderRadius: 10, color: "var(--text-secondary)",
            cursor: "pointer", fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          className="collapse-btn"
        >
          <FiMenu size={16} />
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User Profile / Logout */}
        <div style={{
          padding: "16px 12px",
          borderTop: "1px solid var(--border-color)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 10px", borderRadius: 12,
            background: "rgba(99, 102, 241, 0.04)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}>
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  objectFit: "cover", flexShrink: 0,
                  border: "2px solid rgba(99,102,241,0.3)",
                }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
              }}>
                {initials}
              </div>
            )}
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {user?.name || "User"}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {user?.role}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", padding: 4, display: "flex",
                flexShrink: 0,
              }}
              title="Logout"
            >
              <FiLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .sidebar {
            transform: ${mobileOpen ? "translateX(0)" : "translateX(-100%)"} !important;
            width: 260px !important;
          }
          .collapse-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
