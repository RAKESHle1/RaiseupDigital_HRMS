"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Basic redirect logic based on auth state
    if (!isAuthenticated) {
      router.push("/home"); // Redirect unauthenticated users to the Raiseup Digital Home
    } else if (user?.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/employee/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)"
    }}>
      <div style={{
        width: 48, height: 48,
        border: "4px solid rgba(99,102,241,0.2)",
        borderTop: "4px solid #6366f1",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
