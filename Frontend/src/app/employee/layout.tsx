"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

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
