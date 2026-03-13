"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import socketService from "@/lib/socket";
import toast from "react-hot-toast";
import { FiUser } from "react-icons/fi";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, hydrate } = useAuthStore();
  const isLoginPage = pathname === "/employee/login";

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !isLoginPage) {
      router.push("/employee/login");
    } else if (isAuthenticated && isLoginPage) {
      router.push("/employee/dashboard");
    } else if (isAuthenticated && user?.role === "admin") {
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, user, router, isLoginPage]);

  useEffect(() => {
    if (!isAuthenticated || isLoginPage) return;
    const socket = socketService.connect();
    const myId = user?.id || (user as { _id?: string } | null)?._id;
    const joinSelfRoom = () => {
      if (myId) socket?.emit("join_room", { room: myId });
    };
    const onNewMessage = (data: { senderName?: string; message?: string }) => {
      if (pathname.startsWith("/employee/chat")) return;
      const sender = data?.senderName || "New Message";
      const message = data?.message || "You received a message";
      toast.custom(
        (t) => (
          <button
            onClick={() => {
              toast.dismiss(t.id);
              router.push("/employee/chat");
            }}
            style={{
              background: "rgba(26, 26, 46, 0.96)",
              color: "#e8e8e8",
              border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: 12,
              padding: "12px 14px",
              width: 320,
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.22)", border: "1px solid rgba(129,140,248,0.35)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#c4b5fd", flexShrink: 0 }}>
                <FiUser size={14} />
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{sender}</p>
                <p style={{ fontSize: 12, color: "rgba(232,232,232,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{message}</p>
              </div>
            </div>
          </button>
        ),
        { duration: 4000, position: "bottom-right" }
      );
    };
    if (socket?.connected) joinSelfRoom();
    socket?.on("connect", joinSelfRoom);
    socket?.on("new_message", onNewMessage);
    return () => {
      socket?.off("connect", joinSelfRoom);
      socket?.off("new_message", onNewMessage);
    };
  }, [isAuthenticated, isLoginPage, user, pathname, router]);

  if (isLoginPage) return <>{children}</>;
  if (!isAuthenticated) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 260,
        padding: "32px",
        transition: "margin 0.3s ease",
        minHeight: "100vh",
      }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 16px !important; padding-top: 64px !important; }
        }
      `}</style>
    </div>
  );
}
