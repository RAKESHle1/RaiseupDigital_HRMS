"use client";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <html lang="en">
      <head>
        <title>HRMS Portal - Human Resource Management System</title>
        <meta name="description" content="Modern HR Management System with employee management, attendance tracking, leave management, and team chat." />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e8e8e8',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
          }}
        />
        {children}
      </body>
    </html>
  );
}